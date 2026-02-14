"""Unit tests for signal engine."""

import pytest
from engine.core.signal_engine import SignalEngine, SignalOutput, RegimeType


def test_signal_engine_trend_up():
    """Trend up regime detection."""
    engine = SignalEngine()
    prices = [100, 101, 102, 103, 104, 105]
    out = engine.process_stock("TEST", prices, returns_20d=0.05, volatility_20d=0.15)
    assert out.regime == RegimeType.TREND_UP
    assert out.momentum_score >= 50


def test_signal_engine_trend_down():
    """Trend down regime detection."""
    engine = SignalEngine()
    out = engine.process_stock("TEST", [100, 99, 98], returns_20d=-0.03, volatility_20d=0.15)
    assert out.regime == RegimeType.TREND_DOWN


def test_signal_engine_scores_bounded():
    """All scores 0-100."""
    engine = SignalEngine()
    out = engine.process_stock("TEST", [100, 105, 102], returns_20d=0.02, volatility_20d=0.20)
    assert 0 <= out.momentum_score <= 100
    assert 0 <= out.mean_reversion_score <= 100
    assert 0 <= out.composite_score <= 100


def test_signal_output_to_dict():
    """SignalOutput serializes."""
    engine = SignalEngine()
    out = engine.process_stock("AAPL", [180, 185], returns_20d=0.03, volatility_20d=0.18)
    d = out.to_dict()
    assert d["symbol"] == "AAPL"
    assert "regime" in d
    assert "composite_score" in d
