"""
Performance Logger for Apex Decision Engine.
Logs performance metrics over time.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class PerformanceLogger:
    """Logs performance metrics."""

    def __init__(self, log_dir: Optional[Path] = None):
        self.log_dir = Path(log_dir) if log_dir else Path("logs")
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def log_snapshot(
        self,
        portfolio_value: float,
        total_pnl: float,
        win_rate: float,
        sharpe: float,
        max_drawdown: float,
        trade_count: int,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log performance snapshot."""
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "portfolio_value": portfolio_value,
            "total_pnl": total_pnl,
            "win_rate": win_rate,
            "sharpe_ratio": sharpe,
            "max_drawdown": max_drawdown,
            "trade_count": trade_count,
            **(extra or {}),
        }
        path = self.log_dir / f"performance_{datetime.utcnow().strftime('%Y%m%d')}.jsonl"
        with open(path, "a") as f:
            f.write(json.dumps(record) + "\n")
