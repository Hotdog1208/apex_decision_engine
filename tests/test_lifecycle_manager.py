"""Unit tests for lifecycle manager."""

import pytest
from engine.core.lifecycle_manager import LifecycleManager, ExitReason


def test_register_trade():
    """Trade registration returns trade_id."""
    lm = LifecycleManager()
    tid = lm.register_trade("AAPL", "stock", "momentum", "long", 100.0, 10, "2025-01-01T00:00:00Z")
    assert tid.startswith("T")
    assert "AAPL" in [t.symbol for t in lm.trades.values()]


def test_stop_triggered_long():
    """Stop hit on long when price drops."""
    lm = LifecycleManager(stop_loss_pct=0.05, target_profit_pct=0.10)
    tid = lm.register_trade("AAPL", "stock", "momentum", "long", 100.0, 10, "2025-01-01")
    reason = lm.check_exit(tid, 94.0, "2025-01-02")  # 6% drop
    assert reason == ExitReason.STOP


def test_target_triggered_long():
    """Target hit on long when price rises."""
    lm = LifecycleManager(stop_loss_pct=0.05, target_profit_pct=0.10)
    tid = lm.register_trade("AAPL", "stock", "momentum", "long", 100.0, 10, "2025-01-01")
    reason = lm.check_exit(tid, 111.0, "2025-01-02")  # 11% gain
    assert reason == ExitReason.TARGET


def test_record_exit():
    """Exit recorded with PnL."""
    lm = LifecycleManager()
    tid = lm.register_trade("AAPL", "stock", "momentum", "long", 100.0, 10, "2025-01-01")
    lm.record_exit(tid, 110.0, "2025-01-02", ExitReason.TARGET, 1.0)
    state = lm.trades[tid]
    assert state.exit_price == 110.0
    assert state.pnl == 100.0
    assert state.pnl_pct == 0.10
