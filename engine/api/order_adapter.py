"""
Order Adapter for Apex Decision Engine.
Standardizes order submission across brokers.
Swap mock/real implementation via DATA_SOURCE config.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import logging

logger = logging.getLogger(__name__)


@dataclass
class StockOrder:
    """Stock order specification."""
    symbol: str
    quantity: int
    side: str  # "buy" | "sell"
    order_type: str = "market"
    limit_price: Optional[float] = None


@dataclass
class OptionOrder:
    """Option order specification."""
    symbol: str
    contracts: int
    side: str
    order_type: str = "market"
    limit_price: Optional[float] = None


@dataclass
class FutureOrder:
    """Futures order specification."""
    symbol: str
    contracts: float
    side: str
    order_type: str = "market"
    limit_price: Optional[float] = None


@dataclass
class OrderResponse:
    """Standardized order response."""
    order_id: str
    status: str  # "accepted" | "rejected" | "filled" | "pending"
    message: str = ""
    fills: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class Position:
    """Standardized position."""
    symbol: str
    asset_class: str
    quantity: float
    avg_price: float
    market_value: float
    unrealized_pnl: float = 0.0


class OrderAdapter(ABC):
    """Standardizes order submission across brokers."""

    @abstractmethod
    def place_stock_order(self, order: StockOrder) -> OrderResponse:
        """Place stock order."""
        pass

    @abstractmethod
    def place_option_order(self, order: OptionOrder) -> OrderResponse:
        """Place option order."""
        pass

    @abstractmethod
    def place_futures_order(self, order: FutureOrder) -> OrderResponse:
        """Place futures order."""
        pass

    @abstractmethod
    def cancel_order(self, order_id: str) -> bool:
        """Cancel order by ID."""
        pass

    @abstractmethod
    def get_positions(self) -> List[Position]:
        """Get current positions."""
        pass


class MockOrderAdapter(OrderAdapter):
    """Mock adapter - simulates order placement. No real execution."""

    def __init__(self):
        self._order_counter = 0
        self._positions: List[Position] = []
        self._orders: Dict[str, Dict[str, Any]] = {}
        logger.info("MockOrderAdapter initialized")

    def place_stock_order(self, order: StockOrder) -> OrderResponse:
        """Simulate stock order placement."""
        self._order_counter += 1
        order_id = f"MOCK-STK-{self._order_counter:06d}"
        self._orders[order_id] = {"type": "stock", "symbol": order.symbol, "quantity": order.quantity, "side": order.side}
        logger.info("Mock order placed: %s %s %s %s", order_id, order.side, order.quantity, order.symbol)
        return OrderResponse(order_id=order_id, status="accepted", message="Mock order accepted")

    def place_option_order(self, order: OptionOrder) -> OrderResponse:
        """Simulate option order placement."""
        self._order_counter += 1
        order_id = f"MOCK-OPT-{self._order_counter:06d}"
        self._orders[order_id] = {"type": "option", "symbol": order.symbol, "contracts": order.contracts, "side": order.side}
        logger.info("Mock order placed: %s %s %s %s", order_id, order.side, order.contracts, order.symbol)
        return OrderResponse(order_id=order_id, status="accepted", message="Mock order accepted")

    def place_futures_order(self, order: FutureOrder) -> OrderResponse:
        """Simulate futures order placement."""
        self._order_counter += 1
        order_id = f"MOCK-FUT-{self._order_counter:06d}"
        self._orders[order_id] = {"type": "future", "symbol": order.symbol, "contracts": order.contracts, "side": order.side}
        logger.info("Mock order placed: %s %s %s %s", order_id, order.side, order.contracts, order.symbol)
        return OrderResponse(order_id=order_id, status="accepted", message="Mock order accepted")

    def cancel_order(self, order_id: str) -> bool:
        """Simulate order cancellation."""
        if order_id in self._orders:
            self._orders[order_id]["status"] = "cancelled"
            logger.info("Mock order cancelled: %s", order_id)
            return True
        return False

    def get_positions(self) -> List[Position]:
        """Return mock positions (empty or seeded)."""
        return list(self._positions)

    def set_positions(self, positions: List[Position]) -> None:
        """Set mock positions for testing."""
        self._positions = positions
