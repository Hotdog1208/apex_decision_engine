"""
Stock asset implementation for Apex Decision Engine.
Handles long/short equities with position sizing by volatility.
"""

from typing import Optional

from .base_asset import (
    AssetClass,
    AssetSnapshot,
    BaseAsset,
    Direction,
    PositionDetails,
)


class StockAsset(BaseAsset):
    """Stock equity asset."""

    def __init__(
        self,
        symbol: str,
        price: float = 0.0,
        sector: Optional[str] = None,
        volatility: Optional[float] = None,
    ):
        self.symbol = symbol
        self.price = price
        self.sector = sector
        self.volatility = volatility

    @property
    def asset_class(self) -> AssetClass:
        return AssetClass.STOCK

    def from_snapshot(self, snapshot: AssetSnapshot) -> "StockAsset":
        """Create StockAsset from market snapshot."""
        vol = snapshot.extra.get("volatility") if snapshot.extra else None
        return StockAsset(
            symbol=snapshot.symbol,
            price=snapshot.price,
            sector=snapshot.sector,
            volatility=vol,
        )

    def validate_for_trade(self, direction: Direction, quantity: float) -> tuple[bool, str]:
        """Validate stock trade parameters."""
        if quantity <= 0:
            return False, "Quantity must be positive"
        if self.price <= 0:
            return False, "Invalid price"
        return True, "OK"

    def compute_notional(self, quantity: float, price: float) -> float:
        """Stock notional = quantity * price."""
        return quantity * price

    def build_position_details(
        self,
        quantity: float,
        entry_price: float,
        direction: Direction,
    ) -> PositionDetails:
        """Build position details for stock."""
        signed_qty = quantity if direction == Direction.LONG else -quantity
        notional = abs(signed_qty) * entry_price
        return PositionDetails(
            quantity=signed_qty,
            entry_price=entry_price,
            notional=notional,
            multiplier=1.0,
            extra={"direction": direction.value, "asset_class": "stock"},
        )
