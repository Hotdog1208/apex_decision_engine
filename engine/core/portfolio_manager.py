"""
Portfolio Manager for Apex Decision Engine.
Tracks positions, exposure, asset class and sector allocation.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Position:
    """Single portfolio position."""
    symbol: str
    asset_class: str
    strategy: str
    direction: str
    quantity: float
    entry_price: float
    notional: float
    sector: Optional[str] = None
    trade_id: Optional[str] = None
    entry_time: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "asset_class": self.asset_class,
            "strategy": self.strategy,
            "direction": self.direction,
            "quantity": self.quantity,
            "entry_price": self.entry_price,
            "notional": self.notional,
            "sector": self.sector,
            "trade_id": self.trade_id,
            "entry_time": self.entry_time,
        }


class PortfolioManager:
    """Tracks portfolio state and exposure."""

    def __init__(self, initial_value: float = 0.0):
        self.initial_value = initial_value
        self.positions: List[Position] = []
        self.cash = initial_value

    def add_position(
        self,
        symbol: str,
        asset_class: str,
        strategy: str,
        direction: str,
        quantity: float,
        entry_price: float,
        sector: Optional[str] = None,
        trade_id: Optional[str] = None,
        entry_time: Optional[str] = None,
    ) -> Position:
        """Add position to portfolio."""
        mult = 100.0 if asset_class == "option" else (1.0 if asset_class == "stock" else 50.0)
        if asset_class == "future":
            mult = 50.0  # ES default; override from position details if needed
        notional = abs(quantity) * entry_price * mult if asset_class != "stock" else abs(quantity) * entry_price
        if asset_class == "stock":
            notional = abs(quantity) * entry_price

        pos = Position(
            symbol=symbol,
            asset_class=asset_class,
            strategy=strategy,
            direction=direction,
            quantity=quantity,
            entry_price=entry_price,
            notional=notional,
            sector=sector,
            trade_id=trade_id,
            entry_time=entry_time,
        )
        self.positions.append(pos)
        self.cash -= notional
        return pos

    def get_positions(self) -> List[Dict[str, Any]]:
        """Return positions as dicts."""
        return [p.to_dict() for p in self.positions]

    def get_asset_class_exposure(self) -> Dict[str, float]:
        """Exposure by asset class."""
        exposure: Dict[str, float] = {}
        for p in self.positions:
            exp = abs(p.notional)
            exposure[p.asset_class] = exposure.get(p.asset_class, 0) + exp
        return exposure

    def get_sector_exposure(self) -> Dict[str, float]:
        """Exposure by sector."""
        exposure: Dict[str, float] = {}
        for p in self.positions:
            sector = p.sector or "Unknown"
            exp = abs(p.notional)
            exposure[sector] = exposure.get(sector, 0) + exp
        return exposure

    def get_total_notional(self) -> float:
        """Total notional of positions."""
        return sum(abs(p.notional) for p in self.positions)
