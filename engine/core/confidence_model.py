"""
Confidence Model for Apex Decision Engine.
Calibration tracking - predicted vs realized. Phase 2 full implementation.
Phase 1: pass-through using scoring engine output.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from engine.core.scoring_engine import ScoredTrade


@dataclass
class CalibrationRecord:
    """Single calibration record: predicted confidence vs outcome."""
    symbol: str
    strategy: str
    predicted_confidence: float
    realized_pnl_pct: Optional[float] = None
    winner: Optional[bool] = None
    timestamp: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "strategy": self.strategy,
            "predicted_confidence": self.predicted_confidence,
            "realized_pnl_pct": self.realized_pnl_pct,
            "winner": self.winner,
            "timestamp": self.timestamp,
        }


class ConfidenceModel:
    """
    Confidence calibration model.
    Phase 1: no adjustment - uses raw scores.
    Phase 2: compare predicted vs realized, adjust weights.
    """

    def __init__(self):
        self.calibration_history: List[CalibrationRecord] = []
        self.overconfidence_bias: float = 0.0
        self.underconfidence_bias: float = 0.0

    def adjust_confidence(self, scored_trade: ScoredTrade) -> float:
        """
        Apply calibration adjustment to confidence.
        Phase 1: return raw score.
        Phase 2: apply bias correction.
        """
        raw = scored_trade.confidence_score
        # Phase 1: no adjustment
        adjusted = raw - self.overconfidence_bias + self.underconfidence_bias
        return max(0.0, min(100.0, adjusted))

    def record_outcome(
        self,
        symbol: str,
        strategy: str,
        predicted_confidence: float,
        realized_pnl_pct: Optional[float] = None,
        winner: Optional[bool] = None,
        timestamp: Optional[str] = None,
    ) -> None:
        """Record trade outcome for calibration."""
        self.calibration_history.append(CalibrationRecord(
            symbol=symbol,
            strategy=strategy,
            predicted_confidence=predicted_confidence,
            realized_pnl_pct=realized_pnl_pct,
            winner=winner,
            timestamp=timestamp,
        ))

    def get_calibration_stats(self) -> Dict[str, Any]:
        """Return calibration statistics for Phase 2."""
        if not self.calibration_history:
            return {
                "count": 0,
                "overconfidence_bias": 0.0,
                "underconfidence_bias": 0.0,
            }
        return {
            "count": len(self.calibration_history),
            "overconfidence_bias": self.overconfidence_bias,
            "underconfidence_bias": self.underconfidence_bias,
        }
