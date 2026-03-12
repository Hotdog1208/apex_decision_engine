"""
Scoring Engine for Apex Decision Engine.
Composite confidence: structure, volatility, liquidity, risk/reward, strategy fit.
Confidence always 0-100. Deterministic. No randomness.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from config.system_config import ScoringConfig, get_default_system_config  # type: ignore
from engine.strategies.base_strategy import TradeCandidate  # type: ignore


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def _structure_score(candidate: TradeCandidate) -> float:
    """Structure alignment score from reasoning."""
    r = candidate.reasoning.get("structure_alignment", "")
    base = candidate.confidence_subscore
    if "trend_up" in r or "trend_down" in r:
        base = min(100.0, base + 5.0)
    if "momentum" in r:
        base = min(100.0, base + 3.0)
    return _clamp(base)


def _volatility_score(candidate: TradeCandidate) -> float:
    """Volatility alignment score."""
    r = candidate.reasoning.get("volatility_alignment", "")
    pos = candidate.position_details
    vol = pos.get("volatility_20d") or pos.get("implied_volatility")
    if vol is None:
        return 70.0  # Neutral if unknown
    if 0.12 <= vol <= 0.30:  # Normal vol range
        return 85.0
    if vol < 0.12:
        return 70.0
    return 75.0


def _liquidity_score(candidate: TradeCandidate) -> float:
    """Liquidity assessment score."""
    pos = candidate.position_details
    oi = pos.get("open_interest", 0) or 0
    volume = pos.get("volume", 0) or 0
    bid = pos.get("bid")
    ask = pos.get("ask")

    if candidate.asset_class == "stock":
        if volume and volume >= 100000:
            return 90.0
        if volume and volume >= 50000:
            return 75.0
        return 60.0

    if candidate.asset_class == "option":
        if oi >= 5000 and bid and ask and bid > 0:
            return 85.0
        if oi >= 1000:
            return 70.0
        if oi >= 500:
            return 60.0
        return 40.0

    if candidate.asset_class == "future":
        if volume and volume >= 50000:
            return 90.0
        if volume and volume >= 20000:
            return 75.0
        return 65.0

    return 50.0


def _risk_reward_score(candidate: TradeCandidate) -> float:
    """Risk/reward profile score."""
    subscore = candidate.confidence_subscore
    pos = candidate.position_details
    vol = pos.get("volatility_20d") or pos.get("volatility_20d")
    if vol and vol > 0.30:
        return _clamp(subscore - 5.0)  # High vol penalty
    return subscore


def _strategy_fit_score(candidate: TradeCandidate) -> float:
    """Strategy fit score from reasoning."""
    r = candidate.reasoning.get("strategy_fit", "")
    base = candidate.confidence_subscore
    if "acceleration" in r or "trend_follow" in r:
        base = min(100.0, base + 5.0)
    return _clamp(base)


@dataclass
class ScoredTrade:
    """Trade candidate with final confidence score."""
    candidate: TradeCandidate
    structure_score: float
    volatility_score: float
    liquidity_score: float
    risk_reward_score: float
    strategy_fit_score: float
    confidence_score: float  # 0-100
    reasoning: Dict[str, str] = field(default_factory=dict)

    def to_trade_output(
        self,
        capital_allocated: float = 0,
        risk_per_trade: float = 0,
        risk_percentage: float = 0,
        quantity: Optional[float] = None,
        portfolio_value: float = 1.0,
        expected_return: float = 0,
        max_loss: float = 0,
    ) -> Dict[str, Any]:
        """Full trade format per spec: trade_id, lifecycle_state, confidence_breakdown, etc."""
        c = self.candidate
        pos = c.position_details
        qty = quantity if quantity is not None else pos.get("quantity", c.quantity)
        entry = c.entry_price
        mult = pos.get("multiplier", 1.0)
        stop_pct = 0.05
        target_pct = 0.10
        stop = entry * (1 - stop_pct) if c.direction == "long" else entry * (1 + stop_pct)
        target = entry * (1 + target_pct) if c.direction == "long" else entry * (1 - target_pct)
        risk_pct = risk_percentage if portfolio_value > 0 else 0
        return {
            "trade_id": str(uuid4()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "asset_class": c.asset_class,
            "symbol": c.symbol,
            "strategy": c.strategy,
            "direction": c.direction,
            "position_details": self._build_position_details(c, qty, entry, mult, stop, target),
            "confidence_score": round(self.confidence_score, 2),  # type: ignore
            "confidence_breakdown": {
                "structure_score": round(self.structure_score, 2),  # type: ignore
                "volatility_score": round(self.volatility_score, 2),  # type: ignore
                "liquidity_score": round(self.liquidity_score, 2),  # type: ignore
                "risk_reward_score": round(self.risk_reward_score, 2),  # type: ignore
                "strategy_fit_score": round(self.strategy_fit_score, 2),  # type: ignore
            },
            "capital_allocated": capital_allocated,
            "risk_per_trade": risk_per_trade,
            "risk_percentage": risk_pct,
            "expected_return": expected_return,
            "max_loss": max_loss,
            "reasoning": {
                "structure_alignment": c.reasoning.get("structure_alignment", ""),
                "volatility_alignment": c.reasoning.get("volatility_alignment", ""),
                "liquidity_assessment": c.reasoning.get("liquidity_assessment", ""),
                "risk_reward_profile": c.reasoning.get("risk_reward_profile", ""),
                "strategy_fit": c.reasoning.get("strategy_fit", ""),
            },
            "lifecycle_state": "pending",
            "entry_time": datetime.utcnow().isoformat() + "Z",
            "exit_time": None,
            "exit_reason": None,
            "realized_pnl": 0.0,
        }

    def _build_position_details(
        self,
        c: TradeCandidate,
        qty: float,
        entry: float,
        mult: float,
        stop: float,
        target: float,
    ) -> Dict[str, Any]:
        """Build position_details per asset class."""
        pos = c.position_details
        base = {**pos, "entry_price": entry, "quantity": qty}
        if c.asset_class == "stock":
            base.update({"shares": int(qty), "stop_loss": stop, "take_profit": target})
        elif c.asset_class == "option":
            base.update({
                "contract": c.symbol,
                "contracts": int(qty),
                "strike": pos.get("strike"),
                "expiration": pos.get("expiration"),
                "option_type": pos.get("option_type"),
                "implied_volatility": pos.get("implied_volatility"),
                "delta": pos.get("delta"),
                "gamma": pos.get("gamma"),
                "theta": pos.get("theta"),
                "vega": pos.get("vega"),
            })
        elif c.asset_class == "future":
            base.update({
                "contract_code": c.symbol,
                "contract_size": mult,
                "contracts": qty,
                "expiration": pos.get("expiration"),
            })
        return base


class ScoringEngine:
    """Scores trade candidates into final confidence 0-100."""

    def __init__(self, config: Optional[ScoringConfig] = None):
        self.config = config or get_default_system_config().scoring

    def score(self, candidate: TradeCandidate) -> ScoredTrade:
        """Score single candidate."""
        cfg = self.config

        structure = _structure_score(candidate)
        volatility = _volatility_score(candidate)
        liquidity = _liquidity_score(candidate)
        risk_reward = _risk_reward_score(candidate)
        strategy_fit = _strategy_fit_score(candidate)

        # Reject if liquidity below minimum
        if liquidity < cfg.min_liquidity_score:
            liquidity = 0.0  # Will reduce final score heavily
        if volatility < cfg.min_volatility_alignment:
            volatility = cfg.min_volatility_alignment

        # Weighted composite
        confidence = (
            cfg.structure_weight * structure
            + cfg.volatility_weight * volatility
            + cfg.liquidity_weight * liquidity
            + cfg.risk_reward_weight * risk_reward
            + cfg.strategy_fit_weight * strategy_fit
        )
        confidence = _clamp(confidence)

        return ScoredTrade(
            candidate=candidate,
            structure_score=structure,
            volatility_score=volatility,
            liquidity_score=liquidity,
            risk_reward_score=risk_reward,
            strategy_fit_score=strategy_fit,
            confidence_score=confidence,
            reasoning=candidate.reasoning.copy(),
        )

    def score_all(self, candidates: list[TradeCandidate]) -> list[ScoredTrade]:
        """Score all candidates."""
        return [self.score(c) for c in candidates]
