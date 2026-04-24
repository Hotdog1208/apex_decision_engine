"""
FastAPI application for Apex Decision Engine web interface.
REST API + WebSocket for live updates.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

# Load .env from project root so API keys and secrets are available
from dotenv import load_dotenv  # type: ignore
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

# Add project root to path BEFORE local imports
import sys
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Depends, HTTPException, status  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from pydantic import BaseModel  # type: ignore

import os
from config.system_config import get_default_system_config  # type: ignore
from engine.core.decision_engine import DecisionEngine  # type: ignore
from engine.core.performance_engine import PerformanceEngine  # type: ignore
from engine.api import MockETradeConnector, YahooConnector  # type: ignore
from web.backend.data_services import (  # type: ignore
    get_mock_alerts,
    get_news as fetch_news,
    get_calendar as fetch_calendar,
    get_screener_results,
    get_heatmap_data,
    get_earnings_calendar,
)
from engine.core.indicators import calculate_indicators, detect_market_regime  # type: ignore
import anthropic  # type: ignore
from web.backend.paper_trader import PaperTrader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Apex Decision Engine API",
    description="Institutional-grade multi-asset trading intelligence",
    version="1.0.0",
)

cors_origins_str = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,https://apex-decision-engine.vercel.app,https://*.vercel.app")
origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api") or request.url.path.startswith("/auth"):
        response.headers["Cache-Control"] = "no-store"
    return response

import time
from collections import defaultdict
auth_rate_limits = defaultdict(list)
def check_rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    auth_rate_limits[ip] = [t for t in auth_rate_limits[ip] if now - t < 60]
    if len(auth_rate_limits[ip]) >= 10:
        from fastapi import HTTPException
        raise HTTPException(status_code=429, detail="Too many requests")
    auth_rate_limits[ip].append(now)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"error": "internal_error", "message": str(exc)})

# Engine state
engine: DecisionEngine | None = None
_data_source = os.environ.get("DATA_SOURCE", "mock").strip().lower()
connector = YahooConnector(str(project_root / "data")) if _data_source == "yahoo" else MockETradeConnector(str(project_root / "data"))
import re
from fastapi import HTTPException
def validate_symbol(symbol: str):
    if not symbol: return "AAPL"
    if not re.match(r"^[A-Z0-9.-]{1,10}$", symbol.upper()):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    return symbol.upper()

active_trades: List[Dict[str, Any]] = []
portfolio_value = 1_000_000.0
websocket_clients: List[WebSocket] = []
chat_sessions: Dict[str, List[Dict[str, str]]] = {}
watchlists: Dict[str, List[str]] = {"default": ["AAPL", "MSFT", "NVDA"]}
price_alerts: List[Dict[str, Any]] = []
users_db: Dict[str, Dict[str, Any]] = {}
event_log: List[Dict[str, Any]] = []
signal_log: List[Dict[str, Any]] = []  # Task 4: Signal Performance Logging
signal_cache: Dict[str, Dict[str, Any]] = {} # Memory cache: {symbol: {"timestamp": float, "data": dict}}
paper_trader = PaperTrader()


async def broadcast(payload: Dict[str, Any]) -> None:
    """Safely broadcast a JSON payload to all connected WebSocket clients.
    Iterates a snapshot of the client list so disconnected clients can be
    removed without mutating the list during iteration."""
    global websocket_clients
    dead: List[WebSocket] = []
    for ws in list(websocket_clients):
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        try:
            websocket_clients.remove(ws)
        except ValueError:
            pass


def get_engine() -> DecisionEngine:
    """Get or create decision engine."""
    global engine
    if engine is None:
        engine = DecisionEngine(portfolio_value=portfolio_value, data_dir=project_root / "data")
    return engine


@app.on_event("startup")
async def startup():
    """Initialize on startup."""
    global engine
    engine = DecisionEngine(portfolio_value=portfolio_value, data_dir=project_root / "data")

    # Task 2: Structured startup logging — never log key values
    logger.info("=== ADE Backend Starting ===")
    logger.info(f"DATA_SOURCE: {_data_source}")
    logger.info(f"ANTHROPIC_API_KEY present: {bool((os.environ.get('ANTHROPIC_API_KEY') or '').strip())}")
    logger.info(f"FINNHUB_API_KEY present: {bool((os.environ.get('FINNHUB_API_KEY') or '').strip())}")
    try:
        log_path = project_root / "data" / "paper_trade_log.json"
        if log_path.exists():
            with open(log_path, "r") as _f:
                _log_data = json.load(_f)
            logger.info(f"Paper log entry count: {len(_log_data)}")
        else:
            logger.info("Paper log entry count: 0 (file will be created)")
    except Exception:
        logger.info("Paper log entry count: unknown (read error)")

    import asyncio

    # Task 2: Self-ping every 14 minutes to prevent Render free tier spin-down
    async def self_ping_loop():
        import urllib.request
        port = os.environ.get("PORT", "8000")
        await asyncio.sleep(60)  # Let app fully start before first ping
        while True:
            try:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: urllib.request.urlopen(f"http://localhost:{port}/health", timeout=10)
                )
                logger.info("Self-ping: /health OK")
            except Exception as ping_err:
                logger.warning(f"Self-ping failed: {ping_err}")
            await asyncio.sleep(840)  # 14 minutes

    asyncio.create_task(self_ping_loop())

    # Paper trader evaluation background job (every 24 hours)
    async def run_evaluation_loop():
        while True:
            paper_trader.evaluate_signals()
            await asyncio.sleep(86400)

    asyncio.create_task(run_evaluation_loop())
    logger.info("Paper trade evaluation job scheduled.")
    logger.info("ADE backend ready")


# --- Auth components needed by endpoints ---
from datetime import datetime, timedelta
from jose import JWTError, jwt  # type: ignore
from passlib.context import CryptContext  # type: ignore

SECRET_KEY = os.environ.get("ADE_SECRET_KEY", "ade-dev-secret-change-in-production")
if len(SECRET_KEY) < 32:
    raise ValueError("ADE_SECRET_KEY must be at least 32 characters long.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid auth token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid auth token")


# --- Routes ---
@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint. Returns API status."""
    return {"status": "ok", "message": "Apex Decision Engine API is running.", "docs": "/docs"}

@app.get("/portfolio")
async def get_portfolio(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Current portfolio state. Never 500."""
    try:
        eng = get_engine()
        positions = eng.portfolio_manager.get_positions()
        exposure = eng.portfolio_manager.get_asset_class_exposure()
        sector_exp = eng.portfolio_manager.get_sector_exposure()
        total_notional = eng.portfolio_manager.get_total_notional()
        return {
            "portfolio_value": portfolio_value,
            "total_notional": total_notional,
            "cash": eng.portfolio_manager.cash,
            "positions_count": len(positions),
            "asset_class_exposure": exposure or {},
            "sector_exposure": sector_exp or {},
            "positions": positions or [],
        }
    except Exception as e:
        logger.exception("Portfolio failed: %s", e)
        return {
            "portfolio_value": portfolio_value,
            "total_notional": 0,
            "cash": portfolio_value,
            "positions_count": 0,
            "asset_class_exposure": {},
            "sector_exposure": {},
            "positions": [],
        }


@app.get("/trades")
async def get_trades(active_only: bool = False, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Get trades - active or all."""
    eng = get_engine()
    output = eng.run()
    trades = output.trade_outputs
    if active_only:
        trades = [t for t in trades if t.get("lifecycle_state") in ("pending", "active")]
    return {"trades": trades, "count": len(trades)}


@app.post("/trades/run")
async def run_engine(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Run decision engine and return new trade ideas."""
    eng = get_engine()
    output = eng.run()
    global active_trades
    active_trades = output.trade_outputs
    await broadcast({"event": "trades_updated", "trades": output.trade_outputs})
    return {
        "signals_count": len(output.signals),
        "candidates_count": len(output.trade_candidates),
        "allocated_count": len([a for a in output.allocated_trades if not a.rejected]),
        "trades": output.trade_outputs,
    }


class TradeApprove(BaseModel):
    trade_id: str


@app.post("/trades/approve")
async def approve_trade(body: TradeApprove, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    trade_id = body.trade_id
    """Approve trade - transition to active."""
    for t in active_trades:
        if t.get("trade_id") == trade_id:
            t["lifecycle_state"] = "active"
            await broadcast({"event": "trade_approved", "trade": t})
            return {"status": "approved", "trade": t}
    return {"status": "not_found", "trade_id": trade_id}


@app.delete("/trades/{trade_id}")
async def close_trade(trade_id: str, exit_reason: str = "manual", user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Close position."""
    for i, t in enumerate(active_trades):
        if t.get("trade_id") == trade_id:
            t["lifecycle_state"] = "closed"
            t["exit_reason"] = exit_reason
            from datetime import datetime
            t["exit_time"] = datetime.utcnow().isoformat() + "Z"
            await broadcast({"event": "trade_closed", "trade": t})
            return {"status": "closed", "trade": t}
    return {"status": "not_found", "trade_id": trade_id}


@app.get("/analytics")
async def get_analytics(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Performance metrics. Never 500."""
    try:
        perf = PerformanceEngine()
        stats = perf.compute_stats(initial_value=portfolio_value)
        return {
            "total_pnl": stats.total_pnl,
            "total_trades": stats.total_trades,
            "win_rate": stats.win_rate,
            "sharpe_ratio": stats.sharpe_ratio,
            "max_drawdown": stats.max_drawdown,
            "profit_factor": stats.profit_factor,
            "expectancy": stats.expectancy,
        }
    except Exception as e:
        logger.exception("Analytics failed: %s", e)
        return {
            "total_pnl": 0,
            "total_trades": 0,
            "win_rate": 0,
            "sharpe_ratio": 0,
            "max_drawdown": 0,
            "profit_factor": 0,
            "expectancy": 0,
        }


@app.get("/signals")
async def get_signals() -> Dict[str, Any]:
    """Current signals from engine run."""
    eng = get_engine()
    output = eng.run()
    return {
        "signals": [s.to_dict() if type(s).__name__ != "str" and hasattr(s, "to_dict") else str(s) for s in output.signals], # pyre-ignore[16]
        "count": len(output.signals),
    }


@app.get("/market-regime")
async def get_market_regime() -> Dict[str, Any]:
    """Get current market regime for navigation badge."""
    return get_cached_regime(connector)


class SignalOutcome(BaseModel):
    signal_id: str
    outcome: str  # WIN | LOSS | BREAKEVEN


@app.post("/signals/outcome")
async def record_signal_outcome(body: SignalOutcome, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Update a signal log entry with an outcome."""
    for s in signal_log:
        if s.get("signal_id") == body.signal_id:
            s["outcome"] = body.outcome
            s["outcome_recorded_at"] = datetime.utcnow().isoformat() + "Z"
            return {"status": "ok", "signal": s}
    raise HTTPException(status_code=404, detail="Signal ID not found")


@app.get("/signals/performance")
async def get_signal_performance() -> Dict[str, Any]:
    """Calculate and return signal win rates and stats."""
    total = len(signal_log)
    outcomes = [s for s in signal_log if s.get("outcome")]
    recorded = len(outcomes)
    
    wins = len([s for s in outcomes if s["outcome"] == "WIN"])
    win_rate = (wins / recorded) if recorded > 0 else 0.0
    
    # By verdict
    by_verdict = {}
    for v in ["BUY", "WATCH", "AVOID"]:
        v_outcomes = [s for s in outcomes if s["verdict"] == v]
        v_total = len([s for s in signal_log if s["verdict"] == v])
        v_recorded = len(v_outcomes)
        v_wins = len([s for s in v_outcomes if s["outcome"] == "WIN"])
        by_verdict[v] = {
            "total": v_total,
            "recorded": v_recorded,
            "win_rate": (v_wins / v_recorded) if v_recorded > 0 else 0.0
        }
        
    return {
        "total_signals": total,
        "outcomes_recorded": recorded,
        "win_rate": win_rate,
        "by_verdict": by_verdict
    }


@app.get("/admin/accuracy")
async def get_accuracy_dashboard() -> Dict[str, Any]:
    """Return accuracy stats from paper trading log. Public — powers the track record page."""
    try:
        return paper_trader.get_stats()
    except Exception as e:
        logger.error(f"Accuracy stats failed: {e}")
        return {"error": "stats_unavailable", "message": str(e), "evaluated": 0, "correct": 0, "accuracy_pct": 0, "by_verdict": {}, "recent_entries": []}


@app.get("/chart/{symbol}")
async def get_chart_data(symbol: str, period: str = "3mo", interval: str = "1d") -> Dict[str, Any]:
    """Compatibility endpoint for chart data."""
    try:
        sym = validate_symbol(symbol)
        data = connector.market_data.fetch_historical_data(sym, period, interval)
        return {
            "symbol": sym,
            "period": period,
            "interval": interval,
            "data": data.to_dict(orient="records") if hasattr(data, "to_dict") else []
        }
    except Exception as e:
        logger.error(f"Chart data failed for {symbol}: {e}")
        return {"symbol": symbol, "data": [], "error": str(e)}


# --- Signal Engine with Claude ---
import anthropic

SIGNAL_SYSTEM_PROMPT = """You are ADE's signal reasoning engine. You receive pre-computed quantitative indicators for a stock. Your job is to synthesize them into a directional verdict for the next 1-3 trading days.

Rules:
- Base verdict only on the indicators provided. Do not use training knowledge about the company.
- Verdict must be one of: STRONG_BUY, BUY, WATCH, AVOID, STRONG_AVOID
- Confidence must be 0-100 integer
- Reasoning must reference at least 3 specific indicators by name
- If indicators conflict, state the conflict explicitly and explain which side dominates and why
- Never hedge with "it depends" — commit to a verdict
- Output JSON only. No preamble. No markdown.

Output schema:
{
  "verdict": "BUY",
  "confidence": 74,
  "timeframe": "1-3 days",
  "bull_case": "one sentence",
  "bear_case": "one sentence", 
  "key_indicators": ["RSI at 34 (oversold)", "MACD bullish cross", "volume 1.8x average"],
  "reasoning": "2-3 sentence synthesis paragraph"
}"""

_REGIME_CACHE: Dict[str, Any] = {"data": None, "timestamp": 0}

def get_cached_regime(connector: Any) -> Dict[str, Any]:
    """Calculate market regime once per hour (or cycle)."""
    now = time.time()
    if _REGIME_CACHE["data"] and now - _REGIME_CACHE["timestamp"] < 3600:
        return _REGIME_CACHE["data"]
    
    try:
        spy_hist = connector.market_data.fetch_ohlc("SPY", period="1y", interval="1d")
        spy_series = spy_hist.get("series", [])
        regime_data = detect_market_regime(spy_series)
        _REGIME_CACHE["data"] = regime_data
        _REGIME_CACHE["timestamp"] = now
        return regime_data
    except Exception as e:
        logger.error(f"Regime detection failed: {e}")
        return {"regime": "NEUTRAL", "spy_vs_200ma": 0, "spy_rsi": 50, "vix_level": "NORMAL", "regime_note": "Regime undetected"}

async def _generate_claude_signal(sym: str, connector: Any) -> Dict[str, Any]:
    """Generate a high-accuracy signal using Claude Sonnet with structured reasoning."""
    global signal_cache
    
    # 0. Check Cache
    now = time.time()
    if sym in signal_cache:
        cached = signal_cache[sym]
        if now - cached["timestamp"] < 900: # 15 minutes
            logger.info(f"Returning cached signal for {sym}")
            return cached["data"]

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        snapshot = connector.market_data.fetch_market_snapshot()
        return _generate_signal_for_symbol(sym, snapshot)

    try:
        # 1. Gather Market Data & Indicators
        quote = connector.market_data.fetch_quote(sym)
        hist = connector.market_data.fetch_ohlc(sym, period="1y", interval="1d")
        series = hist.get("series", [])
        indicators = calculate_indicators(series)
        regime = get_cached_regime(connector)
        
        # 2. Get UOA Score
        from engine.ml_models.uoa_service import get_uoa_score
        uoa_data = get_uoa_score(sym, series)
        uoa_label = uoa_data["label"] if uoa_data else "No data available"
        
        # 3. Get News Sentiment summary
        news_list = [n for n in fetch_news() if sym in n.get("symbols", [])]
        pos_count = len([n for n in news_list if n.get("sentiment", 50) > 60])
        neg_count = len([n for n in news_list if n.get("sentiment", 50) < 40])
        neu_count = len(news_list) - pos_count - neg_count
        overall_sentiment = "POSITIVE" if pos_count > neg_count else "NEGATIVE" if neg_count > pos_count else "NEUTRAL"
        
        # 4. Construct Context
        context = {
            "symbol": sym,
            "price": quote.get("price"),
            "technical_indicators": indicators,
            "uoa_score": uoa_label,
            "market_regime": regime["regime"],
            "news_sentiment": {
                "summary": overall_sentiment,
                "counts": {"pos": pos_count, "neg": neg_count, "neu": neu_count}
            }
        }

        client = anthropic.Anthropic(api_key=api_key)
        model_name = "claude-sonnet-4-20250514"
        
        response = client.messages.create(
            model=model_name,
            max_tokens=500,
            system=SIGNAL_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Generate signal for: {json.dumps(context)}"}]
        )
        
        raw_reply = response.content[0].text
        # Extract JSON
        if "```json" in raw_reply:
            raw_json = raw_reply.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_reply:
            raw_json = raw_reply.split("```")[1].split("```")[0].strip()
        else:
            raw_json = raw_reply.strip()
            
        signal = json.loads(raw_json)
        
        # Add metadata for UI/Persistence
        signal["symbol"] = sym
        signal["price"] = quote.get("price")
        signal["generated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # 5. Calibration (Task 3)
        stats = paper_trader.get_stats()
        v_key = signal.get("verdict", "WATCH").upper()
        v_data = stats.get("by_verdict", {}).get(v_key, {})
        
        raw_conf = signal.get("confidence", 50)
        signal["raw_confidence"] = raw_conf
        
        if v_data.get("evaluated", 0) >= 10:
            factor = v_data["accuracy"] / 100.0
            calibrated = int(raw_conf * factor)
            signal["confidence"] = calibrated
            signal["calibrated_label"] = f"Based on {v_data['evaluated']} evaluated signals"
        else:
            signal["calibrated_label"] = "Uncalibrated — building track record"
        
        # Pass indicators to UI for details expansion
        signal["indicators_snapshot"] = indicators
        
        # 6. Log for Paper Trading (Task 2)
        paper_trader.log_signal(signal)
        
        # 7. Cache Result
        signal_cache[sym] = {"timestamp": now, "data": signal}
        
        logger.info(f"Signal generated for {sym}: {signal['verdict']} ({signal['confidence']})")
        return signal

    except Exception as e:
        logger.exception(f"Claude signal generation failed for {sym}: {e}")
        snapshot = connector.market_data.fetch_market_snapshot()
        return _generate_signal_for_symbol(sym, snapshot)


# --- Existing MVP signal helpers (keep as fallback) ---
import random as _random
import hashlib as _hashlib

_MVP_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "SPY", "QQQ", "AMD"]
_VERDICTS = ["buy", "watch", "avoid"]
_REASONING_TEMPLATES = {
    "buy": (
        "{sym} shows strong momentum with positive trend alignment across multiple timeframes. "
        "Volume confirms the move and institutional flow is supportive. Risk/reward is favorable "
        "with a well-defined stop level and the broader sector is rotating into this name. "
        "ADE's composite score places this in the top tier of actionable setups."
    ),
    "watch": (
        "{sym} is at a decision point with mixed signals. The price is consolidating near a key "
        "level and while the longer-term trend is intact, short-term momentum is fading. Volume "
        "is below average and there is no clear catalyst to drive a breakout. Wait for confirmation "
        "before committing capital."
    ),
    "avoid": (
        "{sym} is showing signs of distribution with declining volume on advances and expanding "
        "volume on declines. The risk/reward setup is unfavorable at current levels and the sector "
        "is underperforming. ADE's composite score flags elevated downside risk until the structure "
        "improves."
    ),
}


def _generate_signal_for_symbol(sym: str, snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a deterministic-ish AI signal card for a symbol.
    Uses a hash of the symbol + current date so the verdict is stable within
    a calendar day but rotates daily."""
    from datetime import date
    seed = int(_hashlib.md5(f"{sym}-{date.today().isoformat()}".encode()).hexdigest(), 16)
    rng = _random.Random(seed)

    # Try to pull real quote data from the snapshot
    stocks = snapshot.get("stocks") or []
    stock_data = next((s for s in stocks if s.get("symbol") == sym), None)
    price = stock_data.get("price", 0) if stock_data else 0
    change_pct = stock_data.get("change_percent", 0) if stock_data else rng.uniform(-3, 3)

    # Weighted verdict: momentum-aware
    if change_pct > 1.5:
        weights = [0.6, 0.3, 0.1]
    elif change_pct < -1.5:
        weights = [0.1, 0.3, 0.6]
    else:
        weights = [0.25, 0.5, 0.25]
    verdict = rng.choices(_VERDICTS, weights=weights, k=1)[0]

    confidence_breakdown = {
        "trend_alignment": round(rng.uniform(0.3, 1.0), 2),
        "volume_confirmation": round(rng.uniform(0.2, 1.0), 2),
        "risk_reward_ratio": round(rng.uniform(0.4, 1.0), 2),
        "sector_momentum": round(rng.uniform(0.2, 1.0), 2),
        "institutional_flow": round(rng.uniform(0.1, 1.0), 2),
    }
    composite = round(sum(confidence_breakdown.values()) / len(confidence_breakdown), 2)

    return {
        "symbol": sym,
        "verdict": verdict,
        "reasoning": _REASONING_TEMPLATES[verdict].format(sym=sym),
        "confidence": composite,
        "confidence_breakdown": confidence_breakdown,
        "price": price,
        "change_percent": round(change_pct, 2),
    }


@app.get("/signals/batch/mvp")
async def get_mvp_signals() -> Dict[str, Any]:
    """Batch signal cards for all 10 MVP watchlist symbols."""
    import asyncio
    tasks = [_generate_claude_signal(sym, connector) for sym in _MVP_SYMBOLS]
    signals = await asyncio.gather(*tasks)
    return {"signals": list(signals), "symbols": _MVP_SYMBOLS}


@app.get("/signals/batch")
async def get_batch_signals(symbols: str = "") -> Dict[str, Any]:
    """Batch signal cards for custom symbol list (comma-separated, max 20)."""
    try:
        import asyncio
        sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
        validated = []
        for s in sym_list[:20]:
            try:
                validated.append(validate_symbol(s))
            except Exception:
                pass
        if not validated:
            return {"signals": [], "symbols": []}
        tasks = [_generate_claude_signal(sym, connector) for sym in validated]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        signals = []
        for sym, res in zip(validated, results):
            if isinstance(res, Exception):
                signals.append(_generate_signal_for_symbol(sym, {}))
            else:
                signals.append(res)
        return {"signals": signals, "symbols": validated}
    except Exception as e:
        logger.error(f"Batch signals failed: {e}")
        return {"error": str(e), "signals": [], "symbols": []}


@app.get("/signals/{symbol}")
async def get_signal_for_symbol(symbol: str, force: bool = False) -> Dict[str, Any]:
    """AI signal card for a single symbol. Uses Claude-powered engine. Set force=true to bypass cache."""
    try:
        sym = validate_symbol(symbol)
        if force and sym in signal_cache:
            del signal_cache[sym]
        return await _generate_claude_signal(sym, connector)
    except Exception as e:
        logger.exception("Signal generation failed for %s: %s", symbol, e)
        return _generate_signal_for_symbol(validate_symbol(symbol), {})


@app.get("/config")
async def get_config() -> Dict[str, Any]:
    """System configuration (non-sensitive). Includes live_services so UI can show what's real vs mock."""
    cfg = get_default_system_config()
    return {
        "data_source": cfg.data_source,
        "live_services": {
            "market_data": cfg.data_source == "yahoo",
            "news_calendar": bool((os.environ.get("FINNHUB_API_KEY") or "").strip()),
            "chat_ai": bool((os.environ.get("ANTHROPIC_API_KEY") or "").strip()),
        },
        "scoring_weights": {
            "structure": cfg.scoring.structure_weight,
            "volatility": cfg.scoring.volatility_weight,
            "liquidity": cfg.scoring.liquidity_weight,
            "risk_reward": cfg.scoring.risk_reward_weight,
            "strategy_fit": cfg.scoring.strategy_fit_weight,
        },
    }


class ConfigUpdate(BaseModel):
    """Config update payload."""
    key: str
    value: Any


@app.put("/config")
async def update_config(update: ConfigUpdate) -> Dict[str, Any]:
    """Update configuration (persists in memory)."""
    cfg = get_default_system_config()
    if update.key == "data_source" and update.value in ("mock", "yahoo", "etrade"):
        cfg.data_source = update.value
    return {"status": "updated", "key": update.key}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for live updates."""
    global websocket_clients
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    websocket_clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data) if data else {}
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        try:
            websocket_clients.remove(websocket)
        except ValueError:
            pass


# Auth routes below

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


@app.post("/auth/signup", dependencies=[Depends(check_rate_limit)])
async def signup(body: UserCreate) -> Dict[str, Any]:
    """Register new user (in-memory)."""
    if body.email in users_db:
        return {"error": "Email already registered"}
    users_db[body.email] = {"email": body.email, "hashed_password": pwd_context.hash(body.password)}
    token = create_access_token({"sub": body.email})
    return {"access_token": token, "token_type": "bearer", "user": {"email": body.email}}


@app.post("/auth/refresh")
async def refresh_token(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        new_token = create_access_token({"sub": email})
        return {"access_token": new_token, "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/auth/login", dependencies=[Depends(check_rate_limit)])
async def login(body: UserLogin) -> Dict[str, Any]:
    """Login (in-memory)."""
    user = users_db.get(body.email)
    if not user or not pwd_context.verify(body.password, user["hashed_password"]):
        return {"error": "Invalid email or password"}
    token = create_access_token({"sub": body.email})
    return {"access_token": token, "token_type": "bearer", "user": {"email": body.email}}


class ChatMessage(BaseModel):
    session_id: str = "default"
    message: str
    signal_context: Optional[Dict[str, Any]] = None


@app.post("/chat")
async def chat(body: ChatMessage, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Send a message to the AI trading assistant with signal context."""
    from web.backend import chat_engine
    reply = await chat_engine.chat(
        body.session_id, 
        body.message, 
        signal_context=body.signal_context
    )
    return {"reply": reply, "session_id": body.session_id}


@app.get("/chat/history")
async def chat_history(session_id: str = "default", user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Get conversation history for a session."""
    messages = chat_sessions.get(session_id, [])
    return {"messages": messages}


@app.get("/alerts")
async def alerts_route() -> Dict[str, Any]:
    """Alert center. Never 500."""
    try:
        eng = get_engine()
        output = eng.run()
        alerts = get_mock_alerts(output)
        return {"alerts": alerts or [], "count": len(alerts or [])}
    except Exception as e:
        logger.exception("Alerts failed: %s", e)
        return {"alerts": [], "count": 0}


@app.get("/news")
async def news_route() -> Dict[str, Any]:
    """News feed with sentiment. Uses Finnhub if key set, else mock. Never 500."""
    try:
        news = fetch_news()
        return {"items": news or [], "count": len(news or [])}
    except Exception as e:
        logger.exception("News failed: %s", e)
        from web.backend.data_services import get_mock_news  # type: ignore
        fallback = get_mock_news()
        return {"items": fallback, "count": len(fallback)}


@app.get("/calendar")
async def calendar_route() -> Dict[str, Any]:
    """Economic calendar. Uses Finnhub if key set, else mock. Never 500."""
    try:
        items = fetch_calendar()
        return {"items": items or [], "count": len(items or [])}
    except Exception as e:
        logger.exception("Calendar failed: %s", e)
        from web.backend.data_services import get_mock_calendar  # type: ignore
        fallback = get_mock_calendar()
        return {"items": fallback, "count": len(fallback)}


@app.get("/screener")
async def screener(
    min_price: float = 0,
    max_price: float = 10000,
    min_volume: int = 0,
    sectors: str = "",
    min_rsi: float = 0,
    max_rsi: float = 100,
) -> Dict[str, Any]:
    """Stock screener. sectors comma-separated. RSI approximated when no real RSI. Never 500."""
    try:
        snapshot = connector.market_data.fetch_market_snapshot()
        filters = {
            "min_price": min_price,
            "max_price": max_price,
            "min_volume": min_volume,
            "sectors": [s.strip() for s in sectors.split(",") if s.strip()],
            "min_rsi": min_rsi,
            "max_rsi": max_rsi,
        }
        results = get_screener_results(filters, snapshot)
        return {"results": results or [], "count": len(results or [])}
    except Exception as e:
        logger.exception("Screener failed: %s", e)
        return {"results": [], "count": 0}


@app.get("/market-snapshot")
async def market_snapshot() -> Dict[str, Any]:
    """Full market snapshot for charts, screener, etc. Never 500."""
    try:
        return connector.market_data.fetch_market_snapshot()
    except Exception as e:
        logger.exception("Market snapshot failed: %s", e)
        return {"stocks": [], "price_history": {}, "timestamp": ""}


@app.get("/quote")
async def quote_route(symbol: str) -> Dict[str, Any]:
    """Single symbol quote. Never 500."""
    try:
        return connector.market_data.fetch_quote(validate_symbol(symbol))
    except Exception as e:
        logger.exception("Quote failed: %s", e)
        return {"symbol": (symbol or "").upper(), "price": 0, "bid": 0, "ask": 0, "volume": 0, "timestamp": ""}


@app.get("/quotes")
async def quotes_route(symbols: str) -> Dict[str, Any]:
    """Batch quotes. Never 500."""
    try:
        sym_list = [s.strip().upper() for s in (symbols or "").split(",") if s.strip()]
        sym_list = sym_list[:50] # pyre-ignore[16, 6]
        result = []
        for sym in sym_list:
            try:
                result.append(connector.market_data.fetch_quote(sym))
            except Exception:
                result.append({"symbol": sym, "price": 0, "bid": 0, "ask": 0, "volume": 0, "timestamp": ""})
        return {"quotes": result}
    except Exception as e:
        logger.exception("Quotes failed: %s", e)
        return {"quotes": []}


@app.get("/chart/{symbol}")
async def chart_route(symbol: str, period: str = "3mo", interval: str = "1d") -> Dict[str, Any]:
    """OHLCV for charting. Never 500."""
    try:
        return connector.market_data.fetch_ohlc(validate_symbol(symbol), period=period or "3mo", interval=interval or "1d")
    except Exception as e:
        logger.exception("Chart failed: %s", e)
        return {"symbol": validate_symbol(symbol), "period": period, "interval": interval, "series": []}


@app.get("/heatmap")
async def heatmap() -> Dict[str, Any]:
    """Heatmap data. Never 500."""
    try:
        snapshot = connector.market_data.fetch_market_snapshot()
        data = get_heatmap_data(snapshot)
        return {"data": data or []}
    except Exception as e:
        logger.exception("Heatmap failed: %s", e)
        return {"data": []}


@app.get("/watchlists")
async def get_watchlists(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Get all watchlists."""
    return {"watchlists": watchlists}


@app.post("/watchlists/{name}")
async def add_to_watchlist(name: str, symbol: str, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Add symbol to watchlist."""
    if name not in watchlists:
        watchlists[name] = []
    if symbol.upper() not in watchlists[name]:
        watchlists[name].append(symbol.upper())
    return {"watchlists": watchlists}


@app.delete("/watchlists/{name}/{symbol}")
async def remove_from_watchlist(name: str, symbol: str, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Remove symbol from watchlist."""
    if name in watchlists:
        watchlists[name] = [s for s in watchlists[name] if s.upper() != symbol.upper()]
    return {"watchlists": watchlists}


class PriceAlertCreate(BaseModel):
    symbol: str
    condition: str  # above, below
    price: float = 0
    target_price: float = 0  # frontend sends this


@app.post("/price-alerts")
async def create_price_alert(body: PriceAlertCreate, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Create price alert."""
    target = body.target_price or body.price or 0
    from datetime import datetime
    price_alerts.append({
        "id": f"pa-{len(price_alerts)}",
        "symbol": body.symbol,
        "condition": body.condition,
        "target_price": target,
        "price": target,
        "created": datetime.utcnow().isoformat() + "Z",
    })
    return {"alerts": price_alerts}


@app.get("/price-alerts")
async def list_price_alerts(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """List price alerts."""
    return {"alerts": price_alerts}


@app.delete("/price-alerts/{alert_id}")
async def delete_price_alert(alert_id: str, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Remove a price alert by id."""
    global price_alerts
    before = len(price_alerts)
    price_alerts = [a for a in price_alerts if a.get("id") != alert_id]
    return {"alerts": price_alerts, "removed": before - len(price_alerts)}


@app.get("/export/trades")
async def export_trades(user: str = Depends(get_current_user)) -> Any:
    """Export trades as JSON."""
    eng = get_engine()
    output = eng.run()
    from fastapi.responses import JSONResponse  # type: ignore
    return JSONResponse(
        content=output.trade_outputs,
        headers={"Content-Disposition": "attachment; filename=ade-trades.json"},
    )


@app.post("/internal/uoa_alert")
async def process_uoa_alert(anomaly: Dict[str, Any]) -> Dict[str, Any]:
    """Process a new UOA anomaly and broadcast if high conviction."""
    try:
        eng = get_engine()
        prob, features = eng.signal_engine.process_uoa_anomaly(anomaly)
        
        if prob > 0.8:
            payload = {
                "event": "high_conviction_uoa",
                "data": {
                    "anomaly": anomaly,
                    "probability": round(prob, 4),
                    "features": features
                }
            }
            await broadcast(payload)
            return {"status": "alert_sent", "probability": prob}
        return {"status": "processed", "probability": prob}
    except Exception as e:
        logger.exception("Failed to process UOA anomaly: %s", e)
        from fastapi import HTTPException  # type: ignore
        raise HTTPException(status_code=500, detail=str(e))


# --- Retention tracking (Task 5) ---

class EventCreate(BaseModel):
    user_id: str = "anonymous"
    symbol: str = ""
    action: str  # view_signal, view_reasoning


@app.post("/events")
async def log_event(body: EventCreate) -> Dict[str, Any]:
    """Log a retention-tracking event."""
    from datetime import datetime
    entry = {
        "user_id": body.user_id,
        "symbol": body.symbol,
        "action": body.action,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    event_log.append(entry)
    return {"status": "logged", "event": entry}


@app.get("/admin/events")
async def get_events() -> Dict[str, Any]:
    """Return the full event log as JSON. No auth required (MVP)."""
    return {"events": event_log, "count": len(event_log)}


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "ok"}
