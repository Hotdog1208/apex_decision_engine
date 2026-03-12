"""
Base asset abstraction for Apex Decision Engine.
Asset-class abstraction - strategy-agnostic core.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional


class AssetClass(Enum):
    """Supported asset classes."""
    STOCK = "stock"
    OPTION = "option"
    FUTURE = "future"


class Direction(Enum):
    """Trade direction."""
    LONG = "long"
    SHORT = "short"


@dataclass
class PositionDetails:
    """Structured position details for any asset class."""
    quantity: float = 0.0
    entry_price: float = 0.0
    notional: float = 0.0
    multiplier: float = 1.0
    expiration: Optional[str] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None  # "call" or "put"
    contract_spec: Optional[str] = None  # e.g. "ESZ4" for futures
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to serializable dict."""
        return {
            "quantity": self.quantity,
            "entry_price": self.entry_price,
            "notional": self.notional,
            "multiplier": self.multiplier,
            "expiration": self.expiration,
            "strike": self.strike,
            "option_type": self.option_type,
            "contract_spec": self.contract_spec,
            **self.extra,
        }


@dataclass
class AssetSnapshot:
    """Market snapshot for a single asset."""
    symbol: str
    asset_class: AssetClass
    price: float
    bid: float = 0.0
    ask: float = 0.0
    volume: int = 0
    open_interest: int = 0  # Options/Futures
    implied_volatility: Optional[float] = None
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None
    multiplier: float = 1.0
    sector: Optional[str] = None
    underlying: Optional[str] = None
    expiration: Optional[str] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None
    timestamp: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)

    def mid_price(self) -> float:
        """Mid price between bid and ask."""
        if self.bid > 0 and self.ask > 0:
            return (self.bid + self.ask) / 2.0
        return self.price

    def spread_bps(self) -> float:
        """Bid-ask spread in basis points."""
        mid = self.mid_price()
        if mid <= 0:
            return 0.0
        return ((self.ask - self.bid) / mid) * 10000.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to serializable dict."""
        return {
            "symbol": self.symbol,
            "asset_class": self.asset_class.value,
            "price": self.price,
            "bid": self.bid,
            "ask": self.ask,
            "volume": self.volume,
            "open_interest": self.open_interest,
            "implied_volatility": self.implied_volatility,
            "delta": self.delta,
            "multiplier": self.multiplier,
            "sector": self.sector,
            "underlying": self.underlying,
            "expiration": self.expiration,
            "strike": self.strike,
            "option_type": self.option_type,
            "timestamp": self.timestamp,
            **self.extra,
        }


class BaseAsset(ABC):
    """Abstract base for all asset types."""

    @property
    @abstractmethod
    def asset_class(self) -> AssetClass:
        """Asset class identifier."""
        ...

    @abstractmethod
    def from_snapshot(self, snapshot: AssetSnapshot) -> "BaseAsset":
        """Create asset from market snapshot."""
        ...

    @abstractmethod
    def validate_for_trade(self, direction: Direction, quantity: float) -> tuple[bool, str]:
        """Validate trade parameters. Returns (valid, reason)."""
        ...

    @abstractmethod
    def compute_notional(self, quantity: float, price: float) -> float:
        """Compute notional value of position."""
        ...

    @abstractmethod
    def build_position_details(
        self,
        quantity: float,
        entry_price: float,
        direction: Direction,
    ) -> PositionDetails:
        """Build structured position details."""
        ...
