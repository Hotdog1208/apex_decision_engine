"""Sharpe ratio engine - computes annualized Sharpe."""

from typing import List


def compute_sharpe(returns: List[float], risk_free: float = 0.0, annualization: float = 252.0) -> float:
    """Annualized Sharpe ratio from daily returns."""
    if not returns or len(returns) < 2:
        return 0.0
    mean_ret = sum(returns) / len(returns)
    variance = sum((r - mean_ret) ** 2 for r in returns) / (len(returns) - 1)
    std = variance ** 0.5 if variance > 0 else 0.0
    if std <= 0:
        return 0.0
    return (mean_ret - risk_free / 252) / std * (annualization ** 0.5)
