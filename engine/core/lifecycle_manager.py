"""
Lifecycle Manager for Apex Decision Engine.
Tracks trade lifecycle: entry, stop, target, trailing, exit.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ExitReason(Enum):
    """Exit reason for trade."""
    TARGET = "target"
    STOP = "stop"
    TRAILING_STOP = "trailing_stop"
    MAX_HOLD = "max_hold"
    MANUAL = "manual"
    OPEN = "open"


@dataclass
class LifecycleState:
    """Lifecycle state for a single trade."""
    trade_id: str
    symbol: str
    asset_class: str
    strategy: str
    direction: str
    entry_price: float
    quantity: float
    entry_time: str
    stop_price: Optional[float] = None
    target_price: Optional[float] = None
    trailing_stop_activated: bool = False
    trailing_stop_price: Optional[float] = None
    exit_price: Optional[float] = None
    exit_time: Optional[str] = None
    exit_reason: ExitReason = ExitReason.OPEN
    pnl: Optional[float] = None
    pnl_pct: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trade_id": self.trade_id,
            "symbol": self.symbol,
            "asset_class": self.asset_class,
            "strategy": self.strategy,
            "direction": self.direction,
            "entry_price": self.entry_price,
            "quantity": self.quantity,
            "entry_time": self.entry_time,
            "stop_price": self.stop_price,
            "target_price": self.target_price,
            "trailing_stop_activated": self.trailing_stop_activated,
            "trailing_stop_price": self.trailing_stop_price,
            "exit_price": self.exit_price,
            "exit_time": self.exit_time,
            "exit_reason": self.exit_reason.value,
            "pnl": self.pnl,
            "pnl_pct": self.pnl_pct,
        }


class LifecycleManager:
    """Manages trade lifecycle."""

    def __init__(
        self,
        stop_loss_pct: float = 0.05,
        target_profit_pct: float = 0.10,
        trailing_activation_pct: float = 0.05,
        trailing_stop_pct: float = 0.03,
    ):
        self.stop_loss_pct = stop_loss_pct
        self.target_profit_pct = target_profit_pct
        self.trailing_activation_pct = trailing_activation_pct
        self.trailing_stop_pct = trailing_stop_pct
        self.trades: Dict[str, LifecycleState] = {}
        self._trade_counter = 0

    def register_trade(
        self,
        symbol: str,
        asset_class: str,
        strategy: str,
        direction: str,
        entry_price: float,
        quantity: float,
        entry_time: str,
    ) -> str:
        """Register new trade and return trade_id."""
        self._trade_counter += 1
        trade_id = f"T{self._trade_counter:06d}"
        mult = 1.0 if direction == "long" else -1.0
        if direction == "short":
            mult = -1.0

        stop = entry_price * (1 - self.stop_loss_pct) if direction == "long" else entry_price * (1 + self.stop_loss_pct)
        target = entry_price * (1 + self.target_profit_pct) if direction == "long" else entry_price * (1 - self.target_profit_pct)

        state = LifecycleState(
            trade_id=trade_id,
            symbol=symbol,
            asset_class=asset_class,
            strategy=strategy,
            direction=direction,
            entry_price=entry_price,
            quantity=quantity * mult,
            entry_time=entry_time,
            stop_price=stop,
            target_price=target,
        )
        self.trades[trade_id] = state
        return trade_id

    def check_exit(
        self,
        trade_id: str,
        current_price: float,
        current_time: str,
    ) -> Optional[ExitReason]:
        """
        Check if trade should exit. Returns ExitReason if exit, else None.
        """
        state = self.trades.get(trade_id)
        if not state or state.exit_price is not None:
            return None

        if state.direction == "long":
            if current_price <= state.stop_price:
                return ExitReason.STOP
            if state.target_price and current_price >= state.target_price:
                return ExitReason.TARGET
            if state.trailing_stop_activated and state.trailing_stop_price and current_price <= state.trailing_stop_price:
                return ExitReason.TRAILING_STOP
            high_water = state.entry_price * (1 + self.trailing_activation_pct)
            if current_price >= high_water:
                state.trailing_stop_activated = True
                state.trailing_stop_price = current_price * (1 - self.trailing_stop_pct)
        else:
            if current_price >= state.stop_price:
                return ExitReason.STOP
            if state.target_price and current_price <= state.target_price:
                return ExitReason.TARGET
            if state.trailing_stop_activated and state.trailing_stop_price and current_price >= state.trailing_stop_price:
                return ExitReason.TRAILING_STOP
            low_water = state.entry_price * (1 - self.trailing_activation_pct)
            if current_price <= low_water:
                state.trailing_stop_activated = True
                state.trailing_stop_price = current_price * (1 + self.trailing_stop_pct)

        return None

    def record_exit(
        self,
        trade_id: str,
        exit_price: float,
        exit_time: str,
        exit_reason: ExitReason,
        multiplier: float = 1.0,
    ) -> None:
        """Record trade exit."""
        state = self.trades.get(trade_id)
        if not state:
            return
        state.exit_price = exit_price
        state.exit_time = exit_time
        state.exit_reason = exit_reason
        if state.direction == "long":
            state.pnl = (exit_price - state.entry_price) * abs(state.quantity) * multiplier
        else:
            state.pnl = (state.entry_price - exit_price) * abs(state.quantity) * multiplier
        if state.entry_price and state.entry_price > 0:
            state.pnl_pct = (exit_price / state.entry_price - 1.0) if state.direction == "long" else (1.0 - exit_price / state.entry_price)
