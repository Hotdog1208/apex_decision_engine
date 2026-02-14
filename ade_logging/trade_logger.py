"""
Trade Logger for Apex Decision Engine.
Structured logging of trades for auditability.
"""

import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional


class TradeLogger:
    """Structured trade logging."""

    def __init__(self, log_dir: Optional[Path] = None):
        self.log_dir = Path(log_dir) if log_dir else Path("logs")
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.trades: list[Dict[str, Any]] = []

    def log_trade(
        self,
        trade_id: str,
        asset_class: str,
        symbol: str,
        strategy: str,
        direction: str,
        quantity: float,
        entry_price: float,
        capital_allocated: float,
        risk_per_trade: float,
        confidence_score: float,
        reasoning: Dict[str, str],
        position_details: Dict[str, Any],
        event: str = "entry",
    ) -> None:
        """Log trade event."""
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "trade_id": trade_id,
            "event": event,
            "asset_class": asset_class,
            "symbol": symbol,
            "strategy": strategy,
            "direction": direction,
            "quantity": quantity,
            "entry_price": entry_price,
            "capital_allocated": capital_allocated,
            "risk_per_trade": risk_per_trade,
            "confidence_score": confidence_score,
            "reasoning": reasoning,
            "position_details": position_details,
        }
        self.trades.append(record)

    def log_exit(
        self,
        trade_id: str,
        exit_price: float,
        exit_reason: str,
        pnl: float,
        pnl_pct: float,
    ) -> None:
        """Log trade exit."""
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "trade_id": trade_id,
            "event": "exit",
            "exit_price": exit_price,
            "exit_reason": exit_reason,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
        }
        self.trades.append(record)

    def flush(self) -> None:
        """Write logs to file."""
        if not self.trades:
            return
        path = self.log_dir / f"trades_{datetime.utcnow().strftime('%Y%m%d')}.jsonl"
        with open(path, "a") as f:
            for t in self.trades:
                f.write(json.dumps(t) + "\n")
        self.trades = []
