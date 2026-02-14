"""Expectancy engine - expected value per trade."""

from dataclasses import dataclass
from typing import List


@dataclass
class ExpectancyResult:
    """Expectancy metrics."""
    expectancy: float
    win_rate: float
    avg_win: float
    avg_loss: float


def compute_expectancy(pnls: List[float]) -> ExpectancyResult:
    """Compute expectancy from PnL series."""
    if not pnls:
        return ExpectancyResult(0.0, 0.0, 0.0, 0.0)

    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]

    win_rate = len(wins) / len(pnls) if pnls else 0.0
    avg_win = sum(wins) / len(wins) if wins else 0.0
    avg_loss = sum(losses) / len(losses) if losses else 0.0
    expectancy = win_rate * avg_win + (1 - win_rate) * avg_loss

    return ExpectancyResult(expectancy, win_rate, avg_win, avg_loss)
