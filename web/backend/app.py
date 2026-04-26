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

import asyncio
import os

# Sentry — initialize early, before routes, only if DSN is set
_SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if _SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        sentry_sdk.init(
            dsn=_SENTRY_DSN,
            integrations=[StarletteIntegration(), FastApiIntegration()],
            traces_sample_rate=0.05,
            send_default_pii=False,
        )
    except ImportError:
        pass  # sentry-sdk not installed — silently skip

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
from web.backend.tier_manager import (  # type: ignore
    get_user_tier,
    check_tier_access,
    get_cache_ttl,
    TIER_LIMITS,
    VALID_TIERS,
)
from engine.core.apex_signal_engine import compute_apex_score  # type: ignore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Apex Decision Engine API",
    description="Institutional-grade multi-asset trading intelligence",
    version="1.0.0",
)


# ── Startup: configure signal logger + launch background accuracy sweep ────────
async def _accuracy_sweep_loop() -> None:
    """Runs the accuracy evaluation sweep every 4 hours. Starts on app startup."""
    from web.backend import signal_logger  # type: ignore
    while True:
        try:
            count = await signal_logger.run_accuracy_sweep()
            if count:
                logger.info("Background accuracy sweep: %d signals evaluated.", count)
        except Exception as e:
            logger.error("Background accuracy sweep error: %s", e)
        await asyncio.sleep(4 * 3600)


@app.on_event("startup")
async def _startup() -> None:
    from web.backend import signal_logger  # type: ignore
    signal_logger.configure(
        os.environ.get("SUPABASE_URL", ""),
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
    )
    asyncio.create_task(_accuracy_sweep_loop())

cors_origins_str = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,https://apex-decision-engine.vercel.app")
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
import re
from collections import defaultdict
auth_rate_limits = defaultdict(list)
signal_rate_limits: Dict[str, List[float]] = defaultdict(list)
# Per-user chat rate limits: {user_email: [timestamps]}  — rolling 24-hour window
chat_rate_limits: Dict[str, List[float]] = defaultdict(list)

# Chat daily limits by tier
_CHAT_DAILY_LIMITS = {"free": 0, "edge": 0, "alpha": 100, "apex": 500}

def check_chat_rate_limit(user_email: str, tier: str) -> None:
    """Enforce per-user daily chat message limits by tier."""
    limit = _CHAT_DAILY_LIMITS.get(tier, 0)
    if limit == 0:
        raise HTTPException(status_code=403, detail={"error": "tier_required", "message": "PRISM chat requires ALPHA or APEX subscription."})
    now = time.time()
    day = 86400  # 24 hours
    chat_rate_limits[user_email] = [t for t in chat_rate_limits[user_email] if now - t < day]
    if len(chat_rate_limits[user_email]) >= limit:
        raise HTTPException(
            status_code=429,
            detail={"error": "chat_limit_reached", "message": f"Daily chat limit of {limit} messages reached for {tier.upper()} tier."}
        )
    chat_rate_limits[user_email].append(now)

def sanitize_message(text: str, max_length: int = 2000) -> str:
    """Strip HTML tags, normalize whitespace, and enforce max length."""
    text = re.sub(r'<[^>]+>', '', text)   # strip HTML
    text = text.strip()
    return text[:max_length]

def check_rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    auth_rate_limits[ip] = [t for t in auth_rate_limits[ip] if now - t < 60]
    if len(auth_rate_limits[ip]) >= 10:
        raise HTTPException(status_code=429, detail="Too many requests")
    auth_rate_limits[ip].append(now)

def check_signal_rate_limit(request: Request):
    """60 requests/min per IP on signal endpoints."""
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    signal_rate_limits[ip] = [t for t in signal_rate_limits[ip] if now - t < 60]
    if len(signal_rate_limits[ip]) >= 60:
        raise HTTPException(
            status_code=429,
            detail={"error": "rate_limited", "retry_after": 60,
                    "message": "Max 60 signal requests per minute per IP."}
        )
    signal_rate_limits[ip].append(now)

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

    # Price alert checking loop — runs every 60 seconds
    async def check_price_alerts_loop():
        await asyncio.sleep(30)
        while True:
            try:
                if price_alerts:
                    for alert in price_alerts:
                        if alert.get("triggered"):
                            continue
                        sym = alert.get("symbol", "")
                        if not sym:
                            continue
                        try:
                            q = connector.market_data.fetch_quote(sym)
                            current_price = q.get("price", 0)
                            target = alert.get("target_price", 0)
                            condition = alert.get("condition", "")
                            triggered = (
                                (condition == "above" and current_price >= target) or
                                (condition == "below" and current_price <= target)
                            )
                            if triggered:
                                alert["triggered"] = True
                                alert["triggered_at"] = datetime.utcnow().isoformat() + "Z"
                                alert["triggered_price"] = current_price
                                await broadcast({
                                    "event":         "price_alert_triggered",
                                    "alert_id":      alert.get("id"),
                                    "symbol":        sym,
                                    "condition":     condition,
                                    "target_price":  target,
                                    "current_price": current_price,
                                    "owner":         alert.get("owner"),
                                })
                                logger.info("Price alert triggered: %s %s %s (price=%.2f)", sym, condition, target, current_price)
                        except Exception:
                            pass
            except Exception as alert_err:
                logger.debug("Price alert check error: %s", alert_err)
            await asyncio.sleep(60)

    asyncio.create_task(check_price_alerts_loop())
    logger.info("Price alert monitoring started.")

    logger.info("=== ADE backend ready ===")


# --- Supabase JWT Auth ---
from datetime import datetime, timedelta
from jose import JWTError, jwt  # type: ignore
from fastapi.security import OAuth2PasswordBearer

SUPABASE_JWT_SECRET       = os.environ.get("SUPABASE_JWT_SECRET", "")
SUPABASE_URL              = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# --- Stripe ---
STRIPE_SECRET_KEY     = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
APP_URL               = os.environ.get("APP_URL", "https://apex-decision-engine.vercel.app")

# Map Stripe price IDs → ADE tier names
_STRIPE_PRICE_MAP: Dict[str, str] = {
    k: v for k, v in {
        os.environ.get("STRIPE_PRICE_EDGE",  ""): "edge",
        os.environ.get("STRIPE_PRICE_ALPHA", ""): "alpha",
        os.environ.get("STRIPE_PRICE_APEX",  ""): "apex",
    }.items() if k
}

if not SUPABASE_JWT_SECRET:
    logger.warning("SUPABASE_JWT_SECRET not set — all authenticated API requests will return 503.")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


async def _fetch_tier_from_supabase(user_id: str) -> str:
    """Query public.users in Supabase for the user's subscription tier."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return "free"
    try:
        import httpx
        url = f"{SUPABASE_URL}/rest/v1/users?user_id=eq.{user_id}&select=tier&limit=1"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
            })
        if resp.status_code == 200:
            data = resp.json()
            if data:
                return data[0].get("tier", "free")
    except Exception as e:
        logger.warning("Supabase tier lookup failed for %s: %s", user_id, e)
    return "free"


async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """Validate Supabase JWT and return the user's email. Raises 401 if invalid."""
    if not token:
        raise HTTPException(status_code=401, detail="Authorization header required")
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=503, detail="Auth not configured — set SUPABASE_JWT_SECRET on the server")
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        email: str = payload.get("email", "")
        user_id: str = payload.get("sub", "")
        if not email or not user_id:
            raise HTTPException(status_code=401, detail="Invalid auth token — missing claims")
        # Populate in-memory tier cache on first encounter
        if email not in users_db:
            tier = await _fetch_tier_from_supabase(user_id)
            users_db[email] = {"email": email, "tier": tier, "supabase_id": user_id}
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired auth token")


def _safe_get_user(token: Optional[str] = None) -> Optional[str]:
    """Return user email without raising — used for optional-auth endpoints."""
    if not token or not SUPABASE_JWT_SECRET:
        return None
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload.get("email")
    except Exception:
        return None


async def get_optional_user(request: Request) -> Optional[str]:
    """FastAPI dependency for optional auth. Returns email or None."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return _safe_get_user(auth[len("Bearer "):])


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
    """Get trades - active or all. Never 500."""
    try:
        eng = get_engine()
        output = eng.run()
        trades = output.trade_outputs
        if active_only:
            trades = [t for t in trades if t.get("lifecycle_state") in ("pending", "active")]
        return {"trades": trades, "count": len(trades)}
    except Exception as e:
        logger.exception("get_trades failed: %s", e)
        return {"trades": [], "count": 0}


@app.post("/trades/run")
async def run_engine(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Run decision engine and return new trade ideas. Never 500."""
    try:
        eng = get_engine()
        output = eng.run()
        global active_trades
        active_trades = output.trade_outputs
        await broadcast({"event": "trades_updated", "trades": output.trade_outputs})
        return {
            "signals_count":   len(output.signals),
            "candidates_count": len(output.trade_candidates),
            "allocated_count":  len([a for a in output.allocated_trades if not a.rejected]),
            "trades":           output.trade_outputs,
        }
    except Exception as e:
        logger.exception("run_engine failed: %s", e)
        return {"signals_count": 0, "candidates_count": 0, "allocated_count": 0, "trades": []}


class TradeApprove(BaseModel):
    trade_id: str


@app.post("/trades/approve")
async def approve_trade(body: TradeApprove, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Approve trade — transition to active and register in PortfolioManager."""
    trade_id = body.trade_id
    for t in active_trades:
        if t.get("trade_id") == trade_id:
            t["lifecycle_state"] = "active"
            # Wire to PortfolioManager (Task 3)
            try:
                eng = get_engine()
                pos = t.get("position_details", {})
                eng.portfolio_manager.add_position(
                    symbol=t.get("symbol", ""),
                    asset_class=t.get("asset_class", "stock"),
                    strategy=t.get("strategy", ""),
                    direction=t.get("direction", "long"),
                    quantity=pos.get("quantity", t.get("quantity", 0)),
                    entry_price=pos.get("entry_price", t.get("entry_price", 0)),
                    sector=pos.get("sector"),
                    trade_id=trade_id,
                    entry_time=t.get("entry_time"),
                )
            except Exception as pm_err:
                logger.warning("PortfolioManager add_position failed for %s: %s", trade_id, pm_err)
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
    """Performance metrics derived from the paper trade log. Never 500."""
    try:
        tier = get_user_tier(user, users_db)
        allowed, err = check_tier_access(user, "portfolio_access", users_db)
        # Analytics is accessible to all authenticated users at summary level.
        # Full PnL breakdown restricted to apex.
        pnl_stats = paper_trader.get_pnl_stats()
        acc_stats  = paper_trader.get_stats()
        return {
            "total_pnl":       0,           # realized PnL requires brokerage integration
            "total_trades":    pnl_stats.get("total_trades", 0),
            "win_rate":        pnl_stats.get("win_rate", 0),
            "sharpe_ratio":    0,
            "max_drawdown":    0,
            "profit_factor":   pnl_stats.get("profit_factor", 0),
            "expectancy":      0,
            "accuracy_pct":    acc_stats.get("accuracy_pct", 0),
            "evaluated_signals": acc_stats.get("evaluated", 0),
            "avg_win_pct":     pnl_stats.get("avg_win_pct", 0) if tier in ("alpha", "apex") else None,
            "avg_loss_pct":    pnl_stats.get("avg_loss_pct", 0) if tier in ("alpha", "apex") else None,
        }
    except Exception as e:
        logger.exception("Analytics failed: %s", e)
        return {
            "total_pnl": 0, "total_trades": 0, "win_rate": 0,
            "sharpe_ratio": 0, "max_drawdown": 0, "profit_factor": 0, "expectancy": 0,
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
    """
    Return accuracy stats for the Track Record page.
    Prefers Supabase (persistent) and falls back to local PaperTrader JSON.
    """
    try:
        from web.backend import signal_logger  # type: ignore
        if signal_logger._ok():
            stats = await signal_logger.get_accuracy_stats()
            # Merge PnL stats from local paper trader (same math, just for the pnl_stats field)
            try:
                pnl = paper_trader.get_pnl_stats()
            except Exception:
                pnl = {}
            return {**stats, "pnl_stats": pnl}
        # Fallback: local JSON (ephemeral but always available)
        stats = paper_trader.get_stats()
        pnl   = paper_trader.get_pnl_stats()
        return {**stats, "pnl_stats": pnl, "source": "local_json"}
    except Exception as e:
        logger.error("Accuracy stats failed: %s", e)
        return {
            "error": "stats_unavailable", "message": str(e),
            "evaluated": 0, "correct": 0, "accuracy_pct": 0,
            "by_verdict": {}, "recent_entries": [],
        }


@app.post("/admin/accuracy/sweep")
async def trigger_accuracy_sweep(admin_key: str = "") -> Dict[str, Any]:
    """Manually trigger the accuracy evaluation sweep (admin only)."""
    _admin_key = os.environ.get("ADMIN_SECRET_KEY", "")
    if _admin_key and admin_key != _admin_key:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        from web.backend import signal_logger  # type: ignore
        count = await signal_logger.run_accuracy_sweep()
        return {"evaluated": count, "status": "ok"}
    except Exception as e:
        return {"error": str(e), "evaluated": 0}


# ── Admin Panel Endpoints (ADMIN_SECRET_KEY gated, no JWT required) ─────────

def _require_admin(admin_key: str) -> None:
    """Raise 403 if admin_key doesn't match ADMIN_SECRET_KEY env var."""
    _key = os.environ.get("ADMIN_SECRET_KEY", "")
    if not _key:
        raise HTTPException(status_code=503, detail="ADMIN_SECRET_KEY not configured on server")
    if admin_key != _key:
        raise HTTPException(status_code=403, detail="Invalid admin key")


@app.get("/admin/panel/status")
async def admin_panel_status(admin_key: str = "") -> Dict[str, Any]:
    """System health snapshot for admin panel."""
    _require_admin(admin_key)
    has_anthropic = bool((os.environ.get("ANTHROPIC_API_KEY") or "").strip())
    has_finnhub   = bool((os.environ.get("FINNHUB_API_KEY") or "").strip())
    has_supabase  = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
    has_stripe    = bool(STRIPE_SECRET_KEY)

    acc_stats: Dict[str, Any] = {}
    try:
        from web.backend import signal_logger  # type: ignore
        if signal_logger._ok():
            acc_stats = await signal_logger.get_accuracy_stats()
        else:
            acc_stats = paper_trader.get_stats()
    except Exception:
        acc_stats = {}

    total_chats = sum(len(v) for v in chat_rate_limits.values())

    return {
        "backend": "ok",
        "data_source": _data_source,
        "model": os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        "services": {
            "anthropic_api": has_anthropic,
            "finnhub":       has_finnhub,
            "supabase":      has_supabase,
            "stripe":        has_stripe,
            "sentry":        bool(_SENTRY_DSN),
        },
        "cached_signals":           len(signal_cache),
        "active_users":             len(users_db),
        "total_chat_messages_today": total_chats,
        "accuracy":                  acc_stats,
        "recent_events":             event_log[-20:],
        "regime":                    get_cached_regime(connector),
    }


class AdminSignalRequest(BaseModel):
    symbol: str
    admin_key: str = ""


@app.post("/admin/panel/signal")
async def admin_panel_signal(body: AdminSignalRequest) -> Dict[str, Any]:
    """Test PRISM signal for any symbol — bypasses tier/auth checks."""
    _require_admin(body.admin_key)
    sym = validate_symbol(body.symbol)
    # Force-clear cache so we always get a fresh Claude response
    for key in list(signal_cache.keys()):
        if key.startswith(f"{sym}:"):
            del signal_cache[key]
    return await _generate_claude_signal(sym, connector, user_email="admin", tier="apex")


class AdminBriefRequest(BaseModel):
    watchlist: List[str] = ["SPY", "QQQ", "NVDA", "AAPL", "TSLA"]
    admin_key: str = ""


@app.post("/admin/panel/brief")
async def admin_panel_brief(body: AdminBriefRequest) -> Dict[str, Any]:
    """Test CIPHER brief generation — bypasses tier/auth checks."""
    _require_admin(body.admin_key)
    watchlist = [s.strip().upper() for s in body.watchlist[:8] if s.strip()]
    if not watchlist:
        watchlist = ["SPY", "QQQ", "NVDA", "AAPL", "TSLA"]
    tasks = [_generate_claude_signal(sym, connector, user_email="admin", tier="apex") for sym in watchlist]
    sig_results = await asyncio.gather(*tasks, return_exceptions=True)
    signals = [r for r in sig_results if not isinstance(r, Exception)]
    regime = get_cached_regime(connector)
    from web.backend import agent_engine  # type: ignore
    brief_text = await agent_engine.generate_brief(
        user_email="admin",
        user_id="admin",
        preferences={"watchlist": watchlist},
        signals=signals,
        regime=regime,
    )
    return {
        "brief": brief_text,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "symbols": watchlist,
        "signal_count": len(signals),
    }


class AdminAskRequest(BaseModel):
    question: str
    watchlist: List[str] = ["SPY", "QQQ", "NVDA"]
    session_id: str = "admin-session"
    admin_key: str = ""


@app.post("/admin/panel/ask")
async def admin_panel_ask(body: AdminAskRequest) -> Dict[str, Any]:
    """Ask CIPHER a follow-up question — bypasses tier/auth checks."""
    _require_admin(body.admin_key)
    question = sanitize_message(body.question)
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    watchlist = [s.strip().upper() for s in body.watchlist[:5] if s.strip()] or ["SPY", "QQQ"]
    tasks = [_generate_claude_signal(sym, connector, user_email="admin", tier="apex") for sym in watchlist]
    sig_results = await asyncio.gather(*tasks, return_exceptions=True)
    signals = [r for r in sig_results if not isinstance(r, Exception)]
    regime = get_cached_regime(connector)
    from web.backend import chat_engine, agent_engine  # type: ignore
    history = chat_engine.get_history(body.session_id)
    reply = await agent_engine.answer_question(
        question=question,
        preferences={"watchlist": watchlist},
        signals=signals,
        regime=regime,
        history=history,
    )
    chat_engine._add_to_history(body.session_id, "user", question)
    chat_engine._add_to_history(body.session_id, "assistant", reply)
    return {"reply": reply, "session_id": body.session_id}


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

SIGNAL_SYSTEM_PROMPT = """You are PRISM — ADE's multi-spectrum signal intelligence engine.

You receive structured quantitative output from ADE's multi-factor scoring model. Your job is synthesis and commitment across ALL timeframes — not computation. The math is done; you interpret it.

TIMEFRAME CLASSIFICATION — select the DOMINANT timeframe from the data:
- scalp (0-4hr): RSI extreme (<25 or >75), volume spike >2.5×, sharp momentum divergence
- day (same session): MACD crossover, VWAP level break, volume 1.5-2.5×, same-day UOA
- swing (3-10 days): EMA alignment, clean trend structure, UOA with 14-45 DTE, sector momentum
- long (weeks/months): 200MA position, fundamental valuation (P/E vs sector), macro regime, earnings setup

Rules:
1. Accept the quantitative verdict as starting point. Push back ONE tier max — only if a specific number justifies it.
2. Verdict: exactly one of STRONG_BUY, BUY, WATCH, AVOID, STRONG_AVOID
3. Confidence: integer 0-100, start from composite_score, adjust ±10 max.
4. lead_signal: use the one provided or the single dominant indicator you identify.
5. bear_case: name the single biggest risk with a specific number.
6. key_indicators: cite ≥3 specific values (e.g. "RSI 34.2 OVERSOLD", "MACD hist +0.41", "vol 1.84× avg").
7. Never hedge. No "monitor closely", "wait and see", or "it depends." Commit.
8. bull_case and bear_case: exactly one sentence each, with ≥1 specific number.
9. scalp_note: one sentence for intraday traders — entry trigger or "No intraday edge."
10. long_note: one sentence using fundamentals if provided — or "Insufficient fundamental data."
11. Output valid JSON only. No markdown. No preamble. No trailing text.

Output schema (fill every field):
{
  "verdict": "BUY",
  "confidence": 72,
  "primary_timeframe": "swing",
  "timeframe_label": "Swing Trade (3-10 days)",
  "lead_signal": "exact string from input",
  "bull_case": "One sentence with ≥1 specific number.",
  "bear_case": "One sentence naming the risk with a specific value.",
  "key_indicators": ["RSI 34.2 OVERSOLD", "MACD hist +0.41 BULLISH", "vol 1.84× avg"],
  "reasoning": "2-3 sentences. Cite numbers. State what dominates and why. No hedging.",
  "scalp_note": "Intraday: [entry trigger or No intraday edge]",
  "long_note": "Long-term: [fundamental/macro note or Insufficient fundamental data]"
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

async def _log_signal_supabase(signal: Dict[str, Any], user_id: Optional[str]) -> None:
    """Non-blocking Supabase signal write — never raises."""
    try:
        from web.backend import signal_logger  # type: ignore
        await signal_logger.log_signal(signal, user_id)
    except Exception:
        pass


async def _generate_claude_signal(
    sym: str,
    connector: Any,
    user_email: str = "anonymous",
    tier: str = "edge",
) -> Dict[str, Any]:
    """Generate a multi-factor signal using the APEX quantitative engine + Claude reasoning."""
    global signal_cache

    # --- Cache TTL is tier-aware ---
    cache_ttl = get_cache_ttl(user_email, users_db) if user_email != "anonymous" else 900
    cache_key = f"{sym}:{tier}"

    now = time.time()
    if cache_key in signal_cache:
        cached = signal_cache[cache_key]
        if now - cached["timestamp"] < cache_ttl:
            logger.info("Returning cached signal for %s (tier=%s, ttl=%ds)", sym, tier, cache_ttl)
            return cached["data"]

    try:
        # 1. Market data
        quote  = connector.market_data.fetch_quote(sym)
        hist   = connector.market_data.fetch_ohlc(sym, period="1y", interval="1d")
        series = hist.get("series", [])
        indicators = calculate_indicators(series)
        regime_data = get_cached_regime(connector)
        regime = regime_data.get("regime", "NEUTRAL")

        # 2. UOA score (graceful — returns None if no data or model fails)
        uoa_data = None
        try:
            from engine.ml_models.uoa_service import get_uoa_score
            uoa_data = get_uoa_score(sym, series)
        except Exception as uoa_err:
            logger.debug("UOA score unavailable for %s: %s", sym, uoa_err)

        # 3. News sentiment
        news_sentiment = "NEUTRAL"
        news_counts = {"pos": 0, "neg": 0, "neu": 0}
        try:
            news_list = [n for n in fetch_news() if sym in n.get("symbols", [])]
            pos = len([n for n in news_list if n.get("sentiment", 50) > 60])
            neg = len([n for n in news_list if n.get("sentiment", 50) < 40])
            neu = len(news_list) - pos - neg
            news_counts = {"pos": pos, "neg": neg, "neu": neu}
            news_sentiment = "POSITIVE" if pos > neg else "NEGATIVE" if neg > pos else "NEUTRAL"
        except Exception as news_err:
            logger.debug("News sentiment unavailable for %s: %s", sym, news_err)

        # 4. Run APEX quantitative scoring (Task 1)
        apex_scores = compute_apex_score(
            indicators=indicators,
            regime=regime,
            uoa_data=uoa_data,
            news_sentiment=news_sentiment,
        )

        price = quote.get("price") or 0

        # 5. Fundamentals (lightweight — for long-term signal layer)
        fundamentals: Dict[str, Any] = {}
        try:
            import yfinance as yf  # type: ignore
            info = yf.Ticker(sym).info
            pe  = info.get("trailingPE") or info.get("forwardPE")
            pb  = info.get("priceToBook")
            de  = info.get("debtToEquity")
            rg  = info.get("revenueGrowth")
            mc  = info.get("marketCap")
            sec = info.get("sector")
            if any(x is not None for x in [pe, pb, de, rg, mc]):
                fundamentals = {k: v for k, v in {
                    "pe": round(pe, 1) if pe else None,
                    "pb": round(pb, 1) if pb else None,
                    "de": round(de, 1) if de else None,
                    "rev_growth_pct": round(rg * 100, 1) if rg else None,
                    "mcap_b": round(mc / 1e9, 1) if mc else None,
                    "sector": sec,
                }.items() if v is not None}
        except Exception:
            pass  # fundamentals are enrichment only — never block a signal

        # 6. Claude reasoning with PRISM
        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        signal: Dict[str, Any] = {}

        if api_key:
            try:
                ind = indicators
                context_for_claude = {
                    "sym":    sym,
                    "px":     price,
                    "score":  apex_scores["composite_score"],
                    "verdict": apex_scores["verdict"],
                    "lead":   apex_scores["lead_signal"],
                    "factors": apex_scores["factor_scores"],
                    "signals": apex_scores["key_signals"],
                    "uoa":    apex_scores["uoa_note"],
                    "regime": apex_scores["regime_applied"],
                    "news":   {"sentiment": news_sentiment, "pos": news_counts["pos"], "neg": news_counts["neg"]},
                    "ind": {
                        "rsi":    ind.get("rsi", {}),
                        "macd":   ind.get("macd", {}),
                        "ema":    ind.get("ema", {}),
                        "volr":   ind.get("volume_ratio"),
                        "52w":    ind.get("range_52w", {}),
                        "bb_pos": ind.get("bollinger", {}).get("position"),
                    },
                }
                if fundamentals:
                    context_for_claude["fund"] = fundamentals

                client = anthropic.Anthropic(api_key=api_key)
                response = client.messages.create(
                    model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
                    max_tokens=520,
                    system=[
                        {
                            "type": "text",
                            "text": SIGNAL_SYSTEM_PROMPT,
                            "cache_control": {"type": "ephemeral"},
                        }
                    ],
                    messages=[{
                        "role": "user",
                        "content": (
                            f"Signal {sym}: "
                            f"{json.dumps(context_for_claude, separators=(',', ':'))}"
                        ),
                    }],
                )

                raw = response.content[0].text.strip()
                if "```json" in raw:
                    raw = raw.split("```json")[1].split("```")[0].strip()
                elif "```" in raw:
                    raw = raw.split("```")[1].split("```")[0].strip()

                signal = json.loads(raw)
            except Exception as claude_err:
                logger.warning("Claude reasoning failed for %s: %s — using quantitative only", sym, claude_err)

        # Fill any missing fields from quantitative output
        if not signal.get("verdict"):
            signal["verdict"] = apex_scores["verdict"]
        if not signal.get("confidence"):
            signal["confidence"] = apex_scores["composite_score"]
        if not signal.get("key_indicators"):
            signal["key_indicators"] = apex_scores["key_signals"]
        if not signal.get("lead_signal"):
            signal["lead_signal"] = apex_scores["lead_signal"]
        if not signal.get("reasoning"):
            signal["reasoning"] = (
                f"{apex_scores['verdict']} signal at {price}. "
                f"Lead factor: {apex_scores['lead_signal']}. "
                f"Regime: {regime}. Score: {apex_scores['composite_score']}/100."
            )
        if not signal.get("bull_case"):
            signal["bull_case"] = apex_scores["key_signals"][0] if apex_scores["key_signals"] else "—"
        if not signal.get("bear_case"):
            signal["bear_case"] = f"Adverse move against {apex_scores['regime_applied']} context"
        if not signal.get("primary_timeframe"):
            signal["primary_timeframe"] = "swing"
        if not signal.get("timeframe_label"):
            signal["timeframe_label"] = "Swing Trade (3-10 days)"
        signal.setdefault("scalp_note", "No intraday edge.")
        signal.setdefault("long_note", "Insufficient fundamental data.")
        # Backward compat: Dashboard.jsx reads .timeframe
        if not signal.get("timeframe"):
            signal["timeframe"] = signal.get("timeframe_label", "Swing Trade (3-10 days)")

        # Attach metadata
        signal["symbol"]           = sym
        signal["price"]            = price
        signal["generated_at"]     = datetime.utcnow().isoformat() + "Z"
        signal["composite_score"]  = apex_scores["composite_score"]
        signal["factor_scores"]    = apex_scores["factor_scores"]
        signal["uoa_contribution"] = apex_scores["uoa_contribution"]
        signal["uoa_note"]         = apex_scores["uoa_note"]
        signal["regime_conflict"]  = regime in ("BEAR", "HIGH_VOLATILITY") and "BUY" in signal["verdict"]
        signal["market_regime"]    = regime
        signal["indicators_snapshot"] = indicators

        # 6. Tier-based reasoning truncation (FREE gets one sentence)
        raw_conf = signal.get("confidence", 50)
        signal["raw_confidence"] = raw_conf

        if tier == "free":
            full_reasoning = signal.get("reasoning", "")
            sentences = [s.strip() for s in full_reasoning.replace(".", ".|").split("|") if s.strip()]
            signal["reasoning"] = (sentences[0] + ".") if sentences else full_reasoning

        # 7. Confidence calibration from paper trade history
        stats = paper_trader.get_stats()
        v_key = signal.get("verdict", "WATCH").upper()
        v_data = stats.get("by_verdict", {}).get(v_key, {})

        if v_data.get("evaluated", 0) >= 10:
            hist_acc = v_data["accuracy"] / 100.0
            calibrated = int(raw_conf * (0.5 + 0.5 * hist_acc))  # blend raw with historical
            signal["confidence"] = max(5, min(95, calibrated))
            signal["calibrated_label"] = f"Calibrated on {v_data['evaluated']} evaluated {v_key} signals"
        else:
            signal["calibrated_label"] = "Uncalibrated — building track record"

        # 8. Log to paper trade (local JSON, skip duplicates)
        paper_trader.log_signal(signal)

        # 8b. Fire-and-forget write to Supabase signal_log (persistent across restarts)
        _uid = users_db.get(user_email, {}).get("supabase_id") if user_email != "anonymous" else None
        asyncio.create_task(_log_signal_supabase(signal, _uid))

        # 9. Cache
        signal_cache[cache_key] = {"timestamp": now, "data": signal}

        # 10. Broadcast signal update via WebSocket
        await broadcast({
            "event":    "signal_updated",
            "symbol":   sym,
            "verdict":  signal["verdict"],
            "confidence": signal.get("confidence"),
        })

        logger.info("Signal generated for %s: %s (%s)", sym, signal["verdict"], signal.get("confidence"))
        return signal

    except Exception as e:
        logger.exception("Signal generation failed for %s: %s", sym, e)
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
async def get_mvp_signals(
    request: Request,
    _rl: None = Depends(check_signal_rate_limit),
) -> Dict[str, Any]:
    """Batch signal cards for all 10 MVP watchlist symbols."""
    import asyncio
    tasks = [_generate_claude_signal(sym, connector, tier="edge") for sym in _MVP_SYMBOLS]
    signals = await asyncio.gather(*tasks)
    return {"signals": list(signals), "symbols": _MVP_SYMBOLS}


@app.get("/signals/batch")
async def get_batch_signals(
    request: Request,
    symbols: str = "",
    user: Optional[str] = Depends(get_optional_user),
    _rl: None = Depends(check_signal_rate_limit),
) -> Dict[str, Any]:
    """Batch signal cards for custom symbol list (comma-separated, max 20)."""
    try:
        import asyncio
        tier = get_user_tier(user or "anonymous", users_db) if user else "free"

        # Tier limit on signal count
        limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        max_signals = min(limits.get("signal_count", 0), 20)
        if max_signals == 0:
            return JSONResponse(
                status_code=403,
                content={"error": "tier_limit", "feature": "signal_count",
                         "limit": 0, "upgrade_to": "edge",
                         "message": "Upgrade to EDGE to access AI signals."}
            )

        sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
        validated = []
        for s in sym_list[:max_signals]:
            try:
                validated.append(validate_symbol(s))
            except Exception:
                pass
        if not validated:
            return {"signals": [], "symbols": []}
        email = user or "anonymous"
        tasks = [_generate_claude_signal(sym, connector, user_email=email, tier=tier) for sym in validated]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        signals = []
        for sym, res in zip(validated, results):
            if isinstance(res, Exception):
                signals.append(_generate_signal_for_symbol(sym, {}))
            else:
                signals.append(res)
        return {"signals": signals, "symbols": validated}
    except Exception as e:
        logger.error("Batch signals failed: %s", e)
        return {"error": str(e), "signals": [], "symbols": []}


@app.get("/signals/{symbol}")
async def get_signal_for_symbol(
    symbol: str,
    request: Request,
    force: bool = False,
    user: Optional[str] = Depends(get_optional_user),
    _rl: None = Depends(check_signal_rate_limit),
) -> Dict[str, Any]:
    """AI signal card for a single symbol. Set force=true to bypass cache."""
    try:
        sym  = validate_symbol(symbol)
        tier = get_user_tier(user or "anonymous", users_db) if user else "free"

        if force:
            for key in list(signal_cache.keys()):
                if key.startswith(f"{sym}:"):
                    del signal_cache[key]

        return await _generate_claude_signal(sym, connector, user_email=user or "anonymous", tier=tier)
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
        if not SUPABASE_JWT_SECRET:
            await websocket.close(code=1008)
            return
        jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
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


# ── Auth management routes ──────────────────────────────────────────────────
# Authentication is handled by Supabase on the frontend.
# The backend only validates Supabase JWTs; it does not issue its own tokens.


@app.get("/admin/set-tier")
async def admin_set_tier(user_id: str, tier: str, admin_key: str = "") -> Dict[str, Any]:
    """Manually set a user's tier in the local cache (for testing). Production writes go via Stripe webhook."""
    _admin_key = os.environ.get("ADMIN_SECRET_KEY", "")
    if _admin_key and admin_key != _admin_key:
        raise HTTPException(status_code=403, detail="Forbidden")
    if tier not in VALID_TIERS:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Valid: {sorted(VALID_TIERS)}")
    users_db[user_id] = users_db.get(user_id, {"email": user_id})
    users_db[user_id]["tier"] = tier
    logger.info("Admin: set tier for %s → %s", user_id, tier)
    return {"status": "updated", "user_id": user_id, "tier": tier}


@app.get("/admin/tier-config")
async def get_tier_config() -> Dict[str, Any]:
    """Return tier limits config (read-only)."""
    return {"tiers": TIER_LIMITS}


# ── Stripe helpers ─────────────────────────────────────────────────────────────

def _find_email_by_stripe_customer(stripe_customer_id: str) -> Optional[str]:
    """Search in-memory cache for a user with the given Stripe customer ID."""
    for email, data in users_db.items():
        if data.get("stripe_customer_id") == stripe_customer_id:
            return email
    return None


async def _update_supabase_subscription(
    user_id: str,
    tier: str,
    stripe_customer_id: str,
    subscription_status: str,
    current_period_end: Optional[int] = None,
) -> None:
    """Write subscription state to Supabase public.users (service-role access)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase not configured — tier update not persisted for user %s", user_id)
        return
    try:
        import httpx
        payload: Dict[str, Any] = {
            "tier": tier,
            "stripe_customer_id": stripe_customer_id,
            "subscription_status": subscription_status,
        }
        if current_period_end:
            from datetime import timezone
            payload["current_period_end"] = (
                datetime.fromtimestamp(current_period_end, tz=timezone.utc).isoformat()
            )
        url = f"{SUPABASE_URL}/rest/v1/users?user_id=eq.{user_id}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.patch(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
            )
        if resp.status_code not in (200, 204):
            logger.error("Supabase tier update failed for %s: %s", user_id, resp.text)
        else:
            logger.info("Supabase tier updated: user=%s tier=%s status=%s", user_id, tier, subscription_status)
    except Exception as e:
        logger.error("_update_supabase_subscription error: %s", e)


# ── Stripe endpoints ────────────────────────────────────────────────────────────

_TIER_PRICE_ENV = {
    "edge":  "STRIPE_PRICE_EDGE",
    "alpha": "STRIPE_PRICE_ALPHA",
    "apex":  "STRIPE_PRICE_APEX",
}

class CheckoutRequest(BaseModel):
    tier: str


@app.post("/create-checkout-session")
async def create_checkout_session(
    body: CheckoutRequest,
    user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create a Stripe Checkout session for the selected subscription tier."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment service not configured")
    if body.tier not in ("edge", "alpha", "apex"):
        raise HTTPException(status_code=400, detail="Invalid tier")

    price_env_key = _TIER_PRICE_ENV[body.tier]
    price_id = os.environ.get(price_env_key, "")
    if not price_id:
        raise HTTPException(status_code=503, detail=f"{price_env_key} not set on server")

    import stripe  # type: ignore
    stripe.api_key = STRIPE_SECRET_KEY

    user_data = users_db.get(user, {})
    supabase_id = user_data.get("supabase_id", "")
    stripe_customer_id = user_data.get("stripe_customer_id") or None

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            client_reference_id=supabase_id or user,
            customer=stripe_customer_id,
            customer_email=user if not stripe_customer_id else None,
            success_url=f"{APP_URL}/account?checkout=success",
            cancel_url=f"{APP_URL}/pricing",
            metadata={"supabase_user_id": supabase_id, "email": user, "tier": body.tier},
            subscription_data={"metadata": {"email": user, "tier": body.tier}},
        )
        return {"url": session.url}
    except Exception as e:
        logger.error("Stripe checkout session failed: %s", e)
        raise HTTPException(status_code=502, detail="Could not create checkout session")


@app.post("/create-portal-session")
async def create_portal_session(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Open the Stripe Customer Portal so users can cancel, upgrade, or update payment info."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment service not configured")

    user_data = users_db.get(user, {})
    stripe_customer_id = user_data.get("stripe_customer_id")
    if not stripe_customer_id:
        raise HTTPException(status_code=400, detail="No active subscription found for this account")

    import stripe  # type: ignore
    stripe.api_key = STRIPE_SECRET_KEY

    try:
        portal = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=f"{APP_URL}/account",
        )
        return {"url": portal.url}
    except Exception as e:
        logger.error("Stripe portal session failed: %s", e)
        raise HTTPException(status_code=502, detail="Could not open billing portal")


@app.post("/stripe-webhook")
async def stripe_webhook(request: Request) -> Dict[str, Any]:
    """Receive and process Stripe webhook events. Validates Stripe-Signature before acting."""
    if not STRIPE_WEBHOOK_SECRET or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    import stripe  # type: ignore
    stripe.api_key = STRIPE_SECRET_KEY

    raw_body = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(raw_body, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook: invalid signature")
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception as e:
        logger.error("Stripe webhook parse error: %s", e)
        raise HTTPException(status_code=400, detail="Malformed event")

    evt_type = event["type"]
    logger.info("Stripe webhook received: %s", evt_type)

    if evt_type == "checkout.session.completed":
        session = event["data"]["object"]
        supabase_id = session.get("client_reference_id", "") or session.get("metadata", {}).get("supabase_user_id", "")
        email       = session.get("metadata", {}).get("email", "")
        stripe_cust = session.get("customer", "")
        sub_id      = session.get("subscription", "")
        tier        = "edge"  # default to cheapest paid tier

        if sub_id:
            try:
                sub      = stripe.Subscription.retrieve(sub_id)
                price_id = sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else ""
                tier     = _STRIPE_PRICE_MAP.get(price_id, "edge")
                period_end = sub.get("current_period_end")
            except Exception as sub_err:
                logger.error("Could not retrieve subscription %s: %s", sub_id, sub_err)
                period_end = None
        else:
            period_end = None

        if supabase_id:
            await _update_supabase_subscription(supabase_id, tier, stripe_cust, "active", period_end)

        # Refresh in-memory cache so next request is instant
        if email and email in users_db:
            users_db[email]["tier"] = tier
            users_db[email]["stripe_customer_id"] = stripe_cust

    elif evt_type in ("customer.subscription.deleted",):
        sub = event["data"]["object"]
        stripe_cust = sub.get("customer", "")
        email = _find_email_by_stripe_customer(stripe_cust)
        supabase_id = users_db.get(email, {}).get("supabase_id", "") if email else ""

        if supabase_id:
            await _update_supabase_subscription(supabase_id, "free", stripe_cust, "cancelled")
        if email and email in users_db:
            users_db[email]["tier"] = "free"

    elif evt_type == "customer.subscription.updated":
        sub = event["data"]["object"]
        stripe_cust = sub.get("customer", "")
        status      = sub.get("status", "")
        price_id    = sub["items"]["data"][0]["price"]["id"] if sub.get("items", {}).get("data") else ""
        new_tier    = _STRIPE_PRICE_MAP.get(price_id, "free") if status == "active" else "free"
        period_end  = sub.get("current_period_end")

        email       = _find_email_by_stripe_customer(stripe_cust)
        supabase_id = users_db.get(email, {}).get("supabase_id", "") if email else ""

        if supabase_id:
            await _update_supabase_subscription(supabase_id, new_tier, stripe_cust, status, period_end)
        if email and email in users_db:
            users_db[email]["tier"] = new_tier

    return {"received": True}


@app.get("/auth/me")
async def get_me(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Return current user info and tier. Validates the Supabase JWT."""
    from web.backend.tier_manager import get_user_tier  # type: ignore
    tier = get_user_tier(user, users_db)
    return {"email": user, "tier": tier}


class ChatMessage(BaseModel):
    session_id: str = "default"
    message: str
    signal_context: Optional[Dict[str, Any]] = None


@app.post("/chat")
async def chat(body: ChatMessage, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Send a message to PRISM — the multi-spectrum AI trading analyst."""
    user_tier = get_user_tier(user, users_db)
    check_chat_rate_limit(user, user_tier)
    message = sanitize_message(body.message)
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    from web.backend import chat_engine
    reply = await chat_engine.chat(
        body.session_id,
        message,
        signal_context=body.signal_context
    )
    return {"reply": reply, "session_id": body.session_id}


# ── CIPHER Agent helpers ─────────────────────────────────────────────────────

async def _fetch_agent_preferences(user_id: str) -> Optional[Dict[str, Any]]:
    """Read user_preferences from Supabase. Returns None if not found."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        import httpx
        url = f"{SUPABASE_URL}/rest/v1/user_preferences?user_id=eq.{user_id}&limit=1"
        async with httpx.AsyncClient(timeout=8.0) as c:
            resp = await c.get(url, headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
            })
        if resp.status_code == 200:
            rows = resp.json()
            return rows[0] if rows else None
    except Exception as e:
        logger.error("_fetch_agent_preferences error: %s", e)
    return None


async def _upsert_agent_preferences(user_id: str, payload: Dict[str, Any]) -> bool:
    """Upsert user_preferences into Supabase. Returns True on success."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return False
    try:
        import httpx
        data = {**payload, "user_id": user_id}
        url = f"{SUPABASE_URL}/rest/v1/user_preferences"
        async with httpx.AsyncClient(timeout=8.0) as c:
            resp = await c.post(url, json=data, headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            })
        return resp.status_code in (200, 201, 204)
    except Exception as e:
        logger.error("_upsert_agent_preferences error: %s", e)
        return False


async def _fetch_latest_brief(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch the most recent CIPHER brief from Supabase."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        import httpx
        # 001 schema uses created_at; sort by brief_date desc then created_at desc
        url = f"{SUPABASE_URL}/rest/v1/agent_briefs?user_id=eq.{user_id}&order=created_at.desc&limit=1"
        async with httpx.AsyncClient(timeout=8.0) as c:
            resp = await c.get(url, headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
            })
        if resp.status_code == 200:
            rows = resp.json()
            return rows[0] if rows else None
    except Exception as e:
        logger.error("_fetch_latest_brief error: %s", e)
    return None


async def _store_brief(user_id: str, content: str, symbols: List[str]) -> None:
    """Upsert a CIPHER brief into Supabase agent_briefs (one per user per day)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return
    try:
        import httpx
        from datetime import date
        payload = {
            "user_id":    user_id,
            "brief_date": date.today().isoformat(),  # required by 001 schema
            "content":    content,
            "symbols":    symbols,                    # added in 003 migration
        }
        url = f"{SUPABASE_URL}/rest/v1/agent_briefs"
        async with httpx.AsyncClient(timeout=8.0) as c:
            await c.post(url, json=payload, headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            })
    except Exception as e:
        logger.error("_store_brief error: %s", e)


# ── CIPHER Agent endpoints ───────────────────────────────────────────────────

class AgentPreferences(BaseModel):
    watchlist: List[str] = []
    alert_types: List[str] = []
    brief_time: str = "09:00"
    voice_mode: bool = False
    voice_name: str = "default"
    onboarding_complete: bool = False


class AgentQuestion(BaseModel):
    question: str
    session_id: str = "cipher-default"


@app.get("/agent/preferences")
async def get_agent_preferences(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Return CIPHER preferences for the authenticated user."""
    user_data = users_db.get(user, {})
    user_id   = user_data.get("supabase_id", "")
    if not user_id:
        return {"watchlist": [], "alert_types": [], "brief_time": "09:00",
                "voice_mode": False, "voice_name": "default", "onboarding_complete": False}
    prefs = await _fetch_agent_preferences(user_id)
    if not prefs:
        return {"watchlist": [], "alert_types": [], "brief_time": "09:00",
                "voice_mode": False, "voice_name": "default", "onboarding_complete": False}
    return {
        "watchlist":            prefs.get("watchlist", []),
        "alert_types":          prefs.get("alert_types", []),
        "brief_time":           prefs.get("brief_time", "09:00"),
        "voice_mode":           prefs.get("voice_mode", False),
        "voice_name":           prefs.get("voice_name", "default"),
        "onboarding_complete":  prefs.get("onboarding_complete", False),
    }


@app.post("/agent/preferences")
async def save_agent_preferences(
    body: AgentPreferences,
    user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Upsert CIPHER preferences for the authenticated user."""
    tier = get_user_tier(user, users_db)
    if tier != "apex":
        raise HTTPException(status_code=403, detail="CIPHER requires APEX tier")

    user_data = users_db.get(user, {})
    user_id   = user_data.get("supabase_id", "")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not resolved — re-login")

    watchlist = [s.strip().upper() for s in body.watchlist[:20] if s.strip()]
    payload = {
        "watchlist": watchlist,
        "alert_types": body.alert_types[:10],
        "brief_time": body.brief_time,
        "voice_mode": body.voice_mode,
        "voice_name": body.voice_name,
        "onboarding_complete": body.onboarding_complete,
    }
    ok = await _upsert_agent_preferences(user_id, payload)
    return {"status": "saved" if ok else "local_only", "preferences": payload}


@app.get("/agent/brief")
async def get_agent_brief(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Return the latest cached CIPHER brief for the user."""
    tier = get_user_tier(user, users_db)
    if tier != "apex":
        raise HTTPException(status_code=403, detail="CIPHER requires APEX tier")

    user_data = users_db.get(user, {})
    user_id   = user_data.get("supabase_id", "")
    if not user_id:
        return {"brief": None, "generated_at": None}

    brief = await _fetch_latest_brief(user_id)
    if not brief:
        return {"brief": None, "generated_at": None}
    # 001 schema stores time in created_at; 003 migration adds symbols column
    ts = brief.get("created_at") or brief.get("generated_at")
    return {"brief": brief["content"], "generated_at": ts, "symbols": brief.get("symbols", [])}


# Rate-limit: 1 brief per hour per user (in-memory — resets on restart)
_brief_cooldowns: Dict[str, float] = {}
BRIEF_COOLDOWN_SECONDS = 3600


@app.post("/agent/brief/generate")
async def generate_agent_brief(user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """Generate a new CIPHER brief on demand. Rate-limited to once per hour."""
    tier = get_user_tier(user, users_db)
    if tier != "apex":
        raise HTTPException(status_code=403, detail="CIPHER requires APEX tier")

    now = time.time()
    last = _brief_cooldowns.get(user, 0)
    wait = BRIEF_COOLDOWN_SECONDS - (now - last)
    if wait > 0:
        raise HTTPException(
            status_code=429,
            detail=f"Brief rate limit: available again in {int(wait // 60)}m {int(wait % 60)}s"
        )

    user_data = users_db.get(user, {})
    user_id   = user_data.get("supabase_id", user)

    # Fetch user preferences
    prefs = await _fetch_agent_preferences(user_id) or {}
    watchlist = prefs.get("watchlist", []) or ["SPY", "QQQ", "NVDA", "AAPL", "TSLA"]

    # Generate signals for the watchlist
    import asyncio
    tasks  = [_generate_claude_signal(sym, connector, user_email=user, tier="apex") for sym in watchlist[:8]]
    sig_results = await asyncio.gather(*tasks, return_exceptions=True)
    signals = [r for r in sig_results if not isinstance(r, Exception)]

    regime = get_cached_regime(connector)

    # Generate CIPHER brief
    from web.backend import agent_engine
    brief_text = await agent_engine.generate_brief(
        user_email=user,
        user_id=user_id,
        preferences=prefs,
        signals=signals,
        regime=regime,
    )

    _brief_cooldowns[user] = now
    await _store_brief(user_id, brief_text, watchlist)

    return {"brief": brief_text, "generated_at": datetime.utcnow().isoformat() + "Z", "symbols": watchlist}


@app.post("/agent/ask")
async def agent_ask(
    body: AgentQuestion,
    user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Ask CIPHER a follow-up question. APEX only."""
    tier = get_user_tier(user, users_db)
    if tier != "apex":
        raise HTTPException(status_code=403, detail="CIPHER requires APEX tier")
    check_chat_rate_limit(user, tier)
    body.question = sanitize_message(body.question)
    if not body.question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    user_data = users_db.get(user, {})
    user_id   = user_data.get("supabase_id", user)
    prefs = await _fetch_agent_preferences(user_id) or {}
    watchlist = prefs.get("watchlist", ["SPY", "QQQ", "NVDA"])

    import asyncio
    from web.backend import chat_engine, agent_engine
    tasks = [_generate_claude_signal(sym, connector, user_email=user, tier="apex") for sym in watchlist[:5]]
    sig_results = await asyncio.gather(*tasks, return_exceptions=True)
    signals = [r for r in sig_results if not isinstance(r, Exception)]

    history = chat_engine.get_history(body.session_id)
    regime  = get_cached_regime(connector)

    reply = await agent_engine.answer_question(
        question=body.question,
        preferences=prefs,
        signals=signals,
        regime=regime,
        history=history,
    )

    chat_engine._add_to_history(body.session_id, "user", body.question)
    chat_engine._add_to_history(body.session_id, "assistant", reply)

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
    sort_by: str = "score",   # score | signal_strength | price | volume
) -> Dict[str, Any]:
    """Stock screener. sectors comma-separated. Sortable by signal_strength. Never 500."""
    try:
        snapshot = connector.market_data.fetch_market_snapshot()
        filters = {
            "min_price":  min_price,
            "max_price":  max_price,
            "min_volume": min_volume,
            "sectors":    [s.strip() for s in sectors.split(",") if s.strip()],
            "min_rsi":    min_rsi,
            "max_rsi":    max_rsi,
        }
        results = get_screener_results(filters, snapshot)

        if sort_by == "signal_strength":
            price_history = snapshot.get("price_history", {})
            regime_data   = get_cached_regime(connector)
            regime        = regime_data.get("regime", "NEUTRAL")
            for row in results:
                sym = row.get("symbol", "")
                series = price_history.get(sym, [])
                # Convert plain price list to OHLCV-compatible format for indicators
                ohlcv = []
                if isinstance(series, list):
                    for i, c in enumerate(series):
                        ohlcv.append({"time": i, "open": c, "high": c, "low": c, "close": c, "volume": row.get("volume", 0)})
                try:
                    ind = calculate_indicators(ohlcv) if len(ohlcv) >= 20 else {}
                    apex = compute_apex_score(indicators=ind, regime=regime)
                    row["signal_score"]   = apex["composite_score"]
                    row["signal_verdict"] = apex["verdict"]
                except Exception:
                    row["signal_score"]   = 50
                    row["signal_verdict"] = "WATCH"
            results.sort(key=lambda x: x.get("signal_score", 0), reverse=True)
        elif sort_by == "price":
            results.sort(key=lambda x: x.get("price", 0), reverse=True)
        elif sort_by == "volume":
            results.sort(key=lambda x: x.get("volume", 0), reverse=True)
        # default: already sorted by score in get_screener_results

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
    tier = get_user_tier(user, users_db)
    allowed, err = check_tier_access(user, "alerts_count", users_db, len(price_alerts))
    if not allowed:
        return JSONResponse(status_code=403, content=err)

    target = body.target_price or body.price or 0
    price_alerts.append({
        "id":           f"pa-{len(price_alerts)}",
        "symbol":       body.symbol,
        "condition":    body.condition,
        "target_price": target,
        "price":        target,
        "created":      datetime.utcnow().isoformat() + "Z",
        "owner":        user,
        "triggered":    False,
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
    """Log a retention-tracking event (in-memory + Supabase if configured)."""
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    entry = {
        "user_id": body.user_id,
        "symbol": body.symbol,
        "action": body.action,
        "timestamp": now,
    }
    event_log.append(entry)
    # Fire-and-forget write to Supabase
    sb_url = os.environ.get("SUPABASE_URL", "")
    sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if sb_url and sb_key:
        async def _persist():
            try:
                import httpx as _httpx
                async with _httpx.AsyncClient() as client:
                    await client.post(
                        f"{sb_url}/rest/v1/event_log",
                        headers={
                            "apikey": sb_key,
                            "Authorization": f"Bearer {sb_key}",
                            "Content-Type": "application/json",
                        },
                        json={"user_id": body.user_id, "symbol": body.symbol, "action": body.action},
                        timeout=5,
                    )
            except Exception as _e:
                logger.debug("Event log Supabase write failed: %s", _e)
        asyncio.create_task(_persist())
    return {"status": "logged", "event": entry}


@app.get("/admin/events")
async def get_events(admin_key: str = "") -> Dict[str, Any]:
    """Return the full event log as JSON (admin only)."""
    _admin_key = os.environ.get("ADMIN_SECRET_KEY", "")
    if _admin_key and admin_key != _admin_key:
        raise HTTPException(status_code=403, detail="Forbidden")
    # Prefer Supabase if configured
    sb_url = os.environ.get("SUPABASE_URL", "")
    sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if sb_url and sb_key:
        try:
            import httpx as _httpx
            async with _httpx.AsyncClient() as client:
                r = await client.get(
                    f"{sb_url}/rest/v1/event_log",
                    headers={"apikey": sb_key, "Authorization": f"Bearer {sb_key}"},
                    params={"order": "created_at.desc", "limit": "1000"},
                    timeout=8,
                )
                if r.status_code == 200:
                    rows = r.json()
                    return {"events": rows, "count": len(rows), "source": "supabase"}
        except Exception as _e:
            logger.warning("Supabase event_log read failed: %s", _e)
    return {"events": event_log, "count": len(event_log), "source": "memory"}


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "ok"}
