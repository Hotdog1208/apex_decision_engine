"""
Performance Engine for Apex Decision Engine.
Computes PnL, win rate, expectancy, Sharpe, drawdown, profit factor.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class PerformanceStats:
    """Performance statistics."""
    total_pnl: float = 0.0
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0
    avg_win: float = 0.0
    avg_loss: float = 0.0
    expectancy: float = 0.0
    sharpe_ratio: float = 0.0
    max_drawdown: float = 0.0
    profit_factor: float = 0.0
    confidence_calibration_mae: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_pnl": self.total_pnl,
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "win_rate": self.win_rate,
            "avg_win": self.avg_win,
            "avg_loss": self.avg_loss,
            "expectancy": self.expectancy,
            "sharpe_ratio": self.sharpe_ratio,
            "max_drawdown": self.max_drawdown,
            "profit_factor": self.profit_factor,
            "confidence_calibration_mae": self.confidence_calibration_mae,
        }


def _compute_sharpe(returns: List[float], risk_free: float = 0.0) -> float:
    """Annualized Sharpe ratio."""
    if not returns or len(returns) < 2:
        return 0.0
    mean_ret = sum(returns) / len(returns)
    variance = sum((r - mean_ret) ** 2 for r in returns) / (len(returns) - 1)
    std = variance ** 0.5 if variance > 0 else 0.0
    if std <= 0:
        return 0.0
    return (mean_ret - risk_free) / std * (252 ** 0.5)


def _compute_max_drawdown(equity_curve: List[float]) -> float:
    """Max drawdown in percentage."""
    if not equity_curve:
        return 0.0
    peak = equity_curve[0]
    max_dd = 0.0
    for eq in equity_curve:
        if eq > peak:
            peak = eq
        if peak > 0:
            dd = (peak - eq) / peak
            if dd > max_dd:
                max_dd = dd
    return max_dd


class PerformanceEngine:
    """Computes performance metrics."""

    def __init__(self):
        self.trade_results: List[Dict[str, Any]] = []

    def record_trade(
        self,
        pnl: float,
        pnl_pct: float,
        predicted_confidence: Optional[float] = None,
        winner: bool = False,
    ) -> None:
        """Record trade outcome."""
        self.trade_results.append({
            "pnl": pnl,
            "pnl_pct": pnl_pct,
            "predicted_confidence": predicted_confidence,
            "winner": winner,
        })

    def compute_stats(
        self,
        initial_value: float = 1.0,
        confidence_records: Optional[List[Dict[str, Any]]] = None,
    ) -> PerformanceStats:
        """Compute performance statistics."""
        stats = PerformanceStats()

        if not self.trade_results:
            return stats

        pnls = [r["pnl"] for r in self.trade_results]
        winners = [r for r in self.trade_results if r.get("winner", r["pnl"] > 0)]
        losers = [r for r in self.trade_results if r.get("winner", r["pnl"] > 0) is False and r["pnl"] <= 0]

        stats.total_pnl = sum(pnls)
        stats.total_trades = len(self.trade_results)
        stats.winning_trades = len(winners)
        stats.losing_trades = len(losers)

        if stats.total_trades > 0:
            stats.win_rate = stats.winning_trades / stats.total_trades * 100.0

        if winners:
            stats.avg_win = sum(r["pnl"] for r in winners) / len(winners)
        if losers:
            stats.avg_loss = sum(r["pnl"] for r in losers) / len(losers)

        # Expectancy
        if stats.total_trades > 0:
            stats.expectancy = (stats.win_rate / 100.0) * stats.avg_win + (1 - stats.win_rate / 100.0) * stats.avg_loss

        # Sharpe from PnL %
        pnl_pcts = [r["pnl_pct"] for r in self.trade_results if "pnl_pct" in r and r["pnl_pct"] is not None]
        if pnl_pcts:
            stats.sharpe_ratio = _compute_sharpe(pnl_pcts)

        # Max drawdown from equity curve
        equity = [initial_value]
        for r in self.trade_results:
            equity.append(equity[-1] + r["pnl"])
        stats.max_drawdown = _compute_max_drawdown(equity) * 100.0

        # Profit factor
        gross_profit = sum(r["pnl"] for r in winners)
        gross_loss = abs(sum(r["pnl"] for r in losers))
        if gross_loss > 0:
            stats.profit_factor = gross_profit / gross_loss
        elif gross_profit > 0:
            stats.profit_factor = 999.0

        # Confidence calibration MAE (Phase 2)
        if confidence_records:
            errors = []
            for rec in confidence_records:
                pred = rec.get("predicted_confidence")
                winner = rec.get("winner")
                if pred is not None and winner is not None:
                    realized = 100.0 if winner else 0.0
                    errors.append(abs(pred - realized))
            if errors:
                stats.confidence_calibration_mae = sum(errors) / len(errors)

        return stats
