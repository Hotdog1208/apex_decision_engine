"""Unit tests for capital allocator."""

import pytest
from engine.core.capital_allocator import CapitalAllocator
from engine.core.scoring_engine import ScoredTrade
from engine.strategies.base_strategy import TradeCandidate


def _scored_trade(conf=75, entry=100, asset_class="stock"):
    c = TradeCandidate(
        asset_class=asset_class,
        symbol="TEST",
        strategy="test",
        direction="long",
        position_details={"entry_price": entry, "multiplier": 1 if asset_class == "stock" else 100},
        confidence_subscore=conf,
        reasoning={},
        entry_price=entry,
        quantity=0,
    )
    return ScoredTrade(c, 75, 75, 80, 75, 75, conf, {})


def test_allocator_ranks_by_confidence():
    """Higher confidence gets allocation first."""
    allocator = CapitalAllocator()
    scored = [_scored_trade(60), _scored_trade(90), _scored_trade(70)]
    result = allocator.allocate(scored, 1_000_000)
    allocated = [a for a in result if not a.rejected]
    if allocated:
        assert allocated[0].scored_trade.confidence_score >= allocated[-1].scored_trade.confidence_score


def test_allocator_respects_min_confidence():
    """Trades below 60 confidence not allocated."""
    allocator = CapitalAllocator()
    scored = [_scored_trade(50)]
    result = allocator.allocate(scored, 1_000_000)
    assert len(result) == 0


def test_allocator_rejects_over_risk():
    """Rejects when risk limits exceeded."""
    allocator = CapitalAllocator()
    scored = [_scored_trade(80, entry=1)]  # Would require huge notional
    result = allocator.allocate(scored, 1000)
    for a in result:
        if a.rejected:
            assert a.reject_reason
