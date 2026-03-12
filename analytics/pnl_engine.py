"""
PnL Engine for Apex Decision Engine.
Computes realized and unrealized PnL.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class PnLResult:
    """PnL computation result."""
    realized_pnl: float
    unrealized_pnl: float
    total_pnl: float
    by_strategy: Dict[str, float]
    by_asset_class: Dict[str, float]


class PnlEngine:
    """Computes PnL metrics."""

    def compute(
        self,
        closed_trades: List[Dict[str, Any]],
        open_positions: List[Dict[str, Any]],
        market_prices: Optional[Dict[str, float]] = None,
    ) -> PnLResult:
        """Compute realized and unrealized PnL."""
        realized = sum(t.get("pnl", 0) for t in closed_trades)
        unrealized = 0.0
        if market_prices:
            for p in open_positions:
                symbol = str(p.get("symbol", ""))
                entry = float(p.get("entry_price", 0.0))
                qty = float(p.get("quantity", 0.0))
                mult = float(p.get("multiplier", 1.0))
                current = market_prices.get(symbol, entry)
                if p.get("direction") == "long":
                    unrealized += (current - entry) * abs(qty) * mult
                else:
                    unrealized += (entry - current) * abs(qty) * mult

        by_strategy: Dict[str, float] = {}
        for t in closed_trades:
            s = str(t.get("strategy", "unknown"))
            by_strategy[s] = by_strategy.get(s, 0.0) + float(t.get("pnl", 0.0))

        by_asset: Dict[str, float] = {}
        for t in closed_trades:
            ac = str(t.get("asset_class", "unknown"))
            by_asset[ac] = by_asset.get(ac, 0.0) + float(t.get("pnl", 0.0))

        return PnLResult(
            realized_pnl=realized,
            unrealized_pnl=unrealized,
            total_pnl=realized + unrealized,
            by_strategy=by_strategy,
            by_asset_class=by_asset,
        )
