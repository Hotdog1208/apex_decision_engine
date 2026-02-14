"""
Future asset implementation for Apex Decision Engine.
Handles futures with contract selection by expiration, trend-following.
"""

from typing import Optional

from .base_asset import (
    AssetClass,
    AssetSnapshot,
    BaseAsset,
    Direction,
    PositionDetails,
)


class FutureAsset(BaseAsset):
    """Futures contract asset."""

    def __init__(
        self,
        symbol: str,
        contract_spec: str,  # e.g. "ESZ4", "CLZ4"
        price: float = 0.0,
        multiplier: float = 1.0,
        expiration: Optional[str] = None,
        tick_size: float = 0.01,
        sector: Optional[str] = None,
    ):
        self.symbol = symbol
        self.contract_spec = contract_spec
        self.price = price
        self.multiplier = multiplier
        self.expiration = expiration
        self.tick_size = tick_size
        self.sector = sector

    @property
    def asset_class(self) -> AssetClass:
        return AssetClass.FUTURE

    def from_snapshot(self, snapshot: AssetSnapshot) -> "FutureAsset":
        """Create FutureAsset from market snapshot."""
        spec = snapshot.extra.get("contract_spec", snapshot.symbol) if snapshot.extra else snapshot.symbol
        return FutureAsset(
            symbol=snapshot.symbol,
            contract_spec=spec,
            price=snapshot.price,
            multiplier=snapshot.multiplier,
            expiration=snapshot.expiration,
            sector=snapshot.sector,
        )

    def validate_for_trade(self, direction: Direction, quantity: float) -> tuple[bool, str]:
        """Validate futures trade parameters."""
        if quantity <= 0:
            return False, "Quantity must be positive"
        if self.price <= 0:
            return False, "Invalid price"
        if self.multiplier <= 0:
            return False, "Invalid multiplier"
        return True, "OK"

    def compute_notional(self, quantity: float, price: float) -> float:
        """Futures notional = quantity * price * multiplier."""
        return quantity * price * self.multiplier

    def build_position_details(
        self,
        quantity: float,
        entry_price: float,
        direction: Direction,
    ) -> PositionDetails:
        """Build position details for futures."""
        signed_qty = quantity if direction == Direction.LONG else -quantity
        notional = abs(signed_qty) * entry_price * self.multiplier
        return PositionDetails(
            quantity=signed_qty,
            entry_price=entry_price,
            notional=notional,
            multiplier=self.multiplier,
            expiration=self.expiration,
            contract_spec=self.contract_spec,
            extra={
                "direction": direction.value,
                "asset_class": "future",
                "sector": self.sector,
            },
        )
