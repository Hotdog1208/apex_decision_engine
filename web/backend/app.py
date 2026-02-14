"""
FastAPI application for Apex Decision Engine web interface.
REST API + WebSocket for live updates.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add project root to path
import sys
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from config.system_config import get_default_system_config
from engine.core.decision_engine import DecisionEngine
from engine.core.performance_engine import PerformanceEngine
from engine.api import MockETradeConnector
from web.backend.chat_engine import chat_completion
from web.backend.data_services import (
    get_mock_alerts,
    get_mock_news,
    get_mock_calendar,
    get_screener_results,
    get_heatmap_data,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Apex Decision Engine API",
    description="Institutional-grade multi-asset trading intelligence",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Engine state
engine: DecisionEngine | None = None
connector = MockETradeConnector(project_root / "data")
active_trades: List[Dict[str, Any]] = []
portfolio_value = 1_000_000.0
websocket_clients: List[WebSocket] = []
chat_sessions: Dict[str, List[Dict[str, str]]] = {}
watchlists: Dict[str, List[str]] = {"default": ["AAPL", "MSFT", "NVDA"]}
price_alerts: List[Dict[str, Any]] = []
users_db: Dict[str, Dict[str, Any]] = {}


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
    logger.info("Apex Decision Engine API started")


# --- Routes ---

@app.get("/portfolio")
async def get_portfolio() -> Dict[str, Any]:
    """Current portfolio state."""
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
        "asset_class_exposure": exposure,
        "sector_exposure": sector_exp,
        "positions": positions,
    }


@app.get("/trades")
async def get_trades(active_only: bool = False) -> Dict[str, Any]:
    """Get trades - active or all."""
    eng = get_engine()
    output = eng.run()
    trades = output.trade_outputs
    if active_only:
        trades = [t for t in trades if t.get("lifecycle_state") in ("pending", "active")]
    return {"trades": trades, "count": len(trades)}


@app.post("/trades/run")
async def run_engine() -> Dict[str, Any]:
    """Run decision engine and return new trade ideas."""
    eng = get_engine()
    output = eng.run()
    global active_trades
    active_trades = output.trade_outputs
    for ws in websocket_clients:
        try:
            await ws.send_json({"event": "trades_updated", "trades": output.trade_outputs})
        except Exception:
            pass
    return {
        "signals_count": len(output.signals),
        "candidates_count": len(output.trade_candidates),
        "allocated_count": len([a for a in output.allocated_trades if not a.rejected]),
        "trades": output.trade_outputs,
    }


class TradeApprove(BaseModel):
    trade_id: str


@app.post("/trades/approve")
async def approve_trade(body: TradeApprove) -> Dict[str, Any]:
    trade_id = body.trade_id
    """Approve trade - transition to active."""
    for t in active_trades:
        if t.get("trade_id") == trade_id:
            t["lifecycle_state"] = "active"
            for ws in websocket_clients:
                try:
                    await ws.send_json({"event": "trade_approved", "trade": t})
                except Exception:
                    pass
            return {"status": "approved", "trade": t}
    return {"status": "not_found", "trade_id": trade_id}


@app.delete("/trades/{trade_id}")
async def close_trade(trade_id: str, exit_reason: str = "manual") -> Dict[str, Any]:
    """Close position."""
    for i, t in enumerate(active_trades):
        if t.get("trade_id") == trade_id:
            t["lifecycle_state"] = "closed"
            t["exit_reason"] = exit_reason
            t["exit_time"] = __import__("datetime").datetime.utcnow().isoformat() + "Z"
            for ws in websocket_clients:
                try:
                    await ws.send_json({"event": "trade_closed", "trade": t})
                except Exception:
                    pass
            return {"status": "closed", "trade": t}
    return {"status": "not_found", "trade_id": trade_id}


@app.get("/analytics")
async def get_analytics() -> Dict[str, Any]:
    """Performance metrics."""
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


@app.get("/signals")
async def get_signals() -> Dict[str, Any]:
    """Current signals from engine run."""
    eng = get_engine()
    output = eng.run()
    return {
        "signals": [s.to_dict() if hasattr(s, "to_dict") else str(s) for s in output.signals],
        "count": len(output.signals),
    }


@app.get("/config")
async def get_config() -> Dict[str, Any]:
    """System configuration (non-sensitive)."""
    cfg = get_default_system_config()
    return {
        "data_source": cfg.data_source,
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
    if update.key == "data_source" and update.value in ("mock", "etrade"):
        cfg.data_source = update.value
    return {"status": "updated", "key": update.key}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for live updates."""
    await websocket.accept()
    websocket_clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data) if data else {}
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        websocket_clients.remove(websocket)


# --- Auth (simple JWT, in-memory users) ---
import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.environ.get("ADE_SECRET_KEY", "ade-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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


@app.post("/auth/signup")
async def signup(body: UserCreate) -> Dict[str, Any]:
    """Register new user (in-memory)."""
    if body.email in users_db:
        return {"error": "Email already registered"}
    users_db[body.email] = {"email": body.email, "hashed_password": pwd_context.hash(body.password)}
    token = create_access_token({"sub": body.email})
    return {"access_token": token, "token_type": "bearer", "user": {"email": body.email}}


@app.post("/auth/login")
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


@app.post("/chat")
async def chat(body: ChatMessage) -> Dict[str, Any]:
    """Send a message to the AI trading assistant. Returns assistant reply."""
    session_id = body.session_id or "default"
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    chat_sessions[session_id].append({"role": "user", "content": body.message})
    messages = chat_sessions[session_id][-20:]
    reply = await chat_completion(messages, get_engine, connector)
    chat_sessions[session_id].append({"role": "assistant", "content": reply})
    return {"reply": reply, "session_id": session_id}


@app.get("/chat/history")
async def chat_history(session_id: str = "default") -> Dict[str, Any]:
    """Get conversation history for a session."""
    messages = chat_sessions.get(session_id, [])
    return {"messages": messages}


@app.get("/alerts")
async def get_alerts() -> Dict[str, Any]:
    """Alert center: list of recent alerts."""
    eng = get_engine()
    output = eng.run()
    alerts = get_mock_alerts(output)
    return {"alerts": alerts, "count": len(alerts)}


@app.get("/news")
async def get_news() -> Dict[str, Any]:
    """News feed with sentiment."""
    from web.backend.data_services import get_mock_news
    news = get_mock_news()
    return {"items": news, "count": len(news)}


@app.get("/calendar")
async def get_calendar() -> Dict[str, Any]:
    """Economic calendar."""
    from web.backend.data_services import get_mock_calendar
    items = get_mock_calendar()
    return {"items": items, "count": len(items)}


@app.get("/screener")
async def screener(
    min_price: float = 0,
    max_price: float = 10000,
    min_volume: int = 0,
    sectors: str = "",
) -> Dict[str, Any]:
    """Stock screener. sectors comma-separated."""
    snapshot = connector.market_data.fetch_market_snapshot()
    filters = {
        "min_price": min_price,
        "max_price": max_price,
        "min_volume": min_volume,
        "sectors": [s.strip() for s in sectors.split(",") if s.strip()],
    }
    results = get_screener_results(filters, snapshot)
    return {"results": results, "count": len(results)}


@app.get("/heatmap")
async def heatmap() -> Dict[str, Any]:
    """Heatmap data (symbol/sector performance)."""
    snapshot = connector.market_data.fetch_market_snapshot()
    data = get_heatmap_data(snapshot)
    return {"data": data}


@app.get("/watchlists")
async def get_watchlists() -> Dict[str, Any]:
    """Get all watchlists."""
    return {"watchlists": watchlists}


@app.post("/watchlists/{name}")
async def add_to_watchlist(name: str, symbol: str) -> Dict[str, Any]:
    """Add symbol to watchlist."""
    if name not in watchlists:
        watchlists[name] = []
    if symbol.upper() not in watchlists[name]:
        watchlists[name].append(symbol.upper())
    return {"watchlists": watchlists}


@app.delete("/watchlists/{name}/{symbol}")
async def remove_from_watchlist(name: str, symbol: str) -> Dict[str, Any]:
    """Remove symbol from watchlist."""
    if name in watchlists:
        watchlists[name] = [s for s in watchlists[name] if s.upper() != symbol.upper()]
    return {"watchlists": watchlists}


class PriceAlertCreate(BaseModel):
    symbol: str
    condition: str  # above, below
    price: float


@app.post("/price-alerts")
async def create_price_alert(body: PriceAlertCreate) -> Dict[str, Any]:
    """Create price alert."""
    price_alerts.append({
        "id": f"pa-{len(price_alerts)}",
        "symbol": body.symbol,
        "condition": body.condition,
        "price": body.price,
        "created": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    })
    return {"alerts": price_alerts}


@app.get("/price-alerts")
async def list_price_alerts() -> Dict[str, Any]:
    """List price alerts."""
    return {"alerts": price_alerts}


@app.get("/export/trades")
async def export_trades() -> Any:
    """Export trades as JSON."""
    eng = get_engine()
    output = eng.run()
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=output.trade_outputs,
        headers={"Content-Disposition": "attachment; filename=ade-trades.json"},
    )


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "ok"}
