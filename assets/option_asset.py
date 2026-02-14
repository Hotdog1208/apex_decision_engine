"""
Option asset implementation for Apex Decision Engine.
Handles single-leg, debit/credit spreads, directional thesis.
Selects exact contracts from provided chain.
"""

from typing import Optional

from .base_asset import (
    AssetClass,
    AssetSnapshot,
    BaseAsset,
    Direction,
    PositionDetails,
)


class OptionAsset(BaseAsset):
    """Option contract asset."""

    def __init__(
        self,
        symbol: str,
        underlying: str,
        strike: float,
        expiration: str,
        option_type: str,  # "call" or "put"
        price: float = 0.0,
        multiplier: float = 100.0,
        bid: float = 0.0,
        ask: float = 0.0,
        iv: Optional[float] = None,
        delta: Optional[float] = None,
        open_interest: int = 0,
    ):
        self.symbol = symbol
        self.underlying = underlying
        self.strike = strike
        self.expiration = expiration
        self.option_type = option_type
        self.price = price
        self.multiplier = multiplier
        self.bid = bid
        self.ask = ask
        self.iv = iv
        self.delta = delta
        self.open_interest = open_interest

    @property
    def asset_class(self) -> AssetClass:
        return AssetClass.OPTION

    def from_snapshot(self, snapshot: AssetSnapshot) -> "OptionAsset":
        """Create OptionAsset from market snapshot."""
        return OptionAsset(
            symbol=snapshot.symbol,
            underlying=snapshot.underlying or "",
            strike=snapshot.strike or 0.0,
            expiration=snapshot.expiration or "",
            option_type=snapshot.option_type or "call",
            price=snapshot.price,
            multiplier=snapshot.multiplier,
            bid=snapshot.bid,
            ask=snapshot.ask,
            iv=snapshot.implied_volatility,
            delta=snapshot.delta,
            open_interest=snapshot.open_interest,
        )

    def validate_for_trade(self, direction: Direction, quantity: float) -> tuple[bool, str]:
        """Validate option trade parameters."""
        if quantity <= 0:
            return False, "Quantity must be positive"
        if self.price <= 0:
            return False, "Invalid option price"
        if self.ask <= 0 and self.bid <= 0:
            return False, "No valid bid/ask"
        if self.open_interest <= 0:
            return False, "No open interest - illiquid"
        return True, "OK"

    def compute_notional(self, quantity: float, price: float) -> float:
        """Option notional = quantity * price * multiplier."""
        return quantity * price * self.multiplier

    def build_position_details(
        self,
        quantity: float,
        entry_price: float,
        direction: Direction,
    ) -> PositionDetails:
        """Build position details for option."""
        signed_qty = quantity if direction == Direction.LONG else -quantity
        notional = abs(signed_qty) * entry_price * self.multiplier
        return PositionDetails(
            quantity=signed_qty,
            entry_price=entry_price,
            notional=notional,
            multiplier=self.multiplier,
            expiration=self.expiration,
            strike=self.strike,
            option_type=self.option_type,
            extra={
                "direction": direction.value,
                "asset_class": "option",
                "underlying": self.underlying,
            },
        )
