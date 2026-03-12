"""Drawdown engine - computes max drawdown and drawdown duration."""

from dataclasses import dataclass
from typing import List


@dataclass
class DrawdownResult:
    """Drawdown metrics."""
    max_drawdown_pct: float
    max_drawdown_duration: int
    current_drawdown_pct: float


def compute_drawdown(equity_curve: List[float]) -> DrawdownResult:
    """Compute drawdown from equity curve."""
    if not equity_curve:
        return DrawdownResult(0.0, 0, 0.0)

    peak: float = equity_curve[0]  # type: ignore
    max_dd: float = 0.0
    max_dd_dur: int = 0
    current_dd_dur: int = 0
    current_dd: float = 0.0

    for eq in equity_curve:
        if eq > peak:
            peak = eq
            current_dd_dur = 0
        if peak > 0:
            dd = (peak - eq) / peak
            if dd > max_dd:
                max_dd = dd
            current_dd = dd
            current_dd_dur += 1  # type: ignore
            if current_dd_dur > max_dd_dur:
                max_dd_dur = current_dd_dur

    return DrawdownResult(
        max_drawdown_pct=max_dd * 100.0,
        max_drawdown_duration=max_dd_dur,
        current_drawdown_pct=current_dd * 100.0,
    )
