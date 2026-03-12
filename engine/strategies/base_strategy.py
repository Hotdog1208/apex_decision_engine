"""
Base strategy abstraction for Apex Decision Engine.
Strategy-agnostic core - all strategies implement this interface.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from engine.core.signal_engine import SignalOutput  # type: ignore


@dataclass
class TradeCandidate:
    """Structured trade candidate from a strategy."""
    asset_class: str  # "stock" | "option" | "future"
    symbol: str
    strategy: str
    direction: str  # "long" | "short"
    position_details: Dict[str, Any]
    confidence_subscore: float  # 0-100
    reasoning: Dict[str, str] = field(default_factory=dict)
    entry_price: float = 0.0
    quantity: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "asset_class": self.asset_class,
            "symbol": self.symbol,
            "strategy": self.strategy,
            "direction": self.direction,
            "position_details": self.position_details,
            "confidence_subscore": self.confidence_subscore,
            "reasoning": self.reasoning,
            "entry_price": self.entry_price,
            "quantity": self.quantity,
        }


class BaseStrategy(ABC):
    """Abstract base for all strategies."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Strategy identifier."""
        ...

    @property
    @abstractmethod
    def asset_class(self) -> str:
        """Target asset class: stock, option, future."""
        ...

    @abstractmethod
    def evaluate(
        self,
        signals: List[SignalOutput],
        market_data: Dict[str, Any],
        option_chain: Optional[Dict[str, Any]] = None,
        futures_chain: Optional[Dict[str, Any]] = None,
    ) -> List[TradeCandidate]:
        """Evaluate signals and market data, produce trade candidates."""
        ...
