"""Unit tests for signal engine."""

import pytest  # type: ignore
from engine.core.signal_engine import SignalEngine, SignalOutput, RegimeType  # type: ignore


def test_signal_engine_trend_up():
    """Trend up regime detection."""
    engine = SignalEngine()
    prices = [100.0, 101.0, 102.0, 103.0, 104.0, 105.0]
    out = engine.process_stock("TEST", prices, returns_20d=0.05, volatility_20d=0.15)
    assert out.regime == RegimeType.TREND_UP
    assert out.momentum_score >= 50


def test_signal_engine_trend_down():
    """Trend down regime detection."""
    engine = SignalEngine()
    out = engine.process_stock("TEST", [100.0, 99.0, 98.0], returns_20d=-0.03, volatility_20d=0.15)
    assert out.regime == RegimeType.TREND_DOWN


def test_signal_engine_scores_bounded():
    """All scores 0-100."""
    engine = SignalEngine()
    out = engine.process_stock("TEST", [100.0, 105.0, 102.0], returns_20d=0.02, volatility_20d=0.20)
    assert 0 <= out.momentum_score <= 100
    assert 0 <= out.mean_reversion_score <= 100
    assert 0 <= out.composite_score <= 100


def test_signal_output_to_dict():
    """SignalOutput serializes."""
    engine = SignalEngine()
    out = engine.process_stock("AAPL", [180.0, 185.0], returns_20d=0.03, volatility_20d=0.18)
    d = out.to_dict()
    assert d["symbol"] == "AAPL"
    assert "regime" in d
    assert "composite_score" in d
