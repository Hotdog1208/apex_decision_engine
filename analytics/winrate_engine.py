"""Win rate engine - computes win/loss ratio."""

from dataclasses import dataclass
from typing import List


@dataclass
class WinRateResult:
    """Win rate metrics."""
    win_rate_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int


def compute_winrate(pnls: List[float]) -> WinRateResult:
    """Compute win rate from PnL series."""
    if not pnls:
        return WinRateResult(0.0, 0, 0, 0)

    wins = sum(1 for p in pnls if p > 0)
    losses = sum(1 for p in pnls if p <= 0)
    win_rate = wins / len(pnls) * 100.0 if pnls else 0.0

    return WinRateResult(win_rate, len(pnls), wins, losses)
