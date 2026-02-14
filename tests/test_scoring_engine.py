"""Unit tests for scoring engine."""

import pytest
from engine.core.scoring_engine import ScoringEngine
from engine.strategies.base_strategy import TradeCandidate


def _make_candidate(asset_class="stock", symbol="AAPL", confidence=70):
    return TradeCandidate(
        asset_class=asset_class,
        symbol=symbol,
        strategy="equity_momentum",
        direction="long",
        position_details={"entry_price": 100, "multiplier": 1, "volume": 100000, "sector": "Tech"},
        confidence_subscore=confidence,
        reasoning={"structure_alignment": "trend_up", "volatility_alignment": "normal"},
        entry_price=100,
        quantity=10,
    )


def test_scoring_produces_0_100():
    """Confidence 0-100."""
    engine = ScoringEngine()
    c = _make_candidate()
    st = engine.score(c)
    assert 0 <= st.confidence_score <= 100


def test_scoring_breakdown():
    """All sub-scores present."""
    engine = ScoringEngine()
    c = _make_candidate()
    st = engine.score(c)
    assert st.structure_score >= 0
    assert st.volatility_score >= 0
    assert st.liquidity_score >= 0
    assert st.risk_reward_score >= 0
    assert st.strategy_fit_score >= 0


def test_to_trade_output_format():
    """Trade output has required fields."""
    engine = ScoringEngine()
    c = _make_candidate()
    st = engine.score(c)
    out = st.to_trade_output(capital_allocated=1000, risk_per_trade=20, quantity=10)
    assert "trade_id" in out
    assert "asset_class" in out
    assert "confidence_breakdown" in out
    assert "lifecycle_state" in out
    assert out["lifecycle_state"] == "pending"
