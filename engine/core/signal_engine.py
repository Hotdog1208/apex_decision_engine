"""
Signal Engine for Apex Decision Engine.
Processes price structure, detects regimes, identifies momentum/mean reversion.
All signals scored 0-100. Deterministic.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

from config.system_config import SignalConfig, get_default_system_config


class RegimeType(Enum):
    """Market regime classification."""
    TREND_UP = "trend_up"
    TREND_DOWN = "trend_down"
    RANGE = "range"
    UNKNOWN = "unknown"


class VolatilityRegime(Enum):
    """Volatility regime."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    UNKNOWN = "unknown"


@dataclass
class SignalOutput:
    """Structured signal output for a single symbol."""
    symbol: str
    asset_class: str  # "stock" | "option" | "future"
    regime: RegimeType
    volatility_regime: VolatilityRegime
    momentum_score: float  # 0-100
    mean_reversion_score: float  # 0-100
    momentum_acceleration: bool
    mean_reversion_signal: bool
    composite_score: float  # 0-100
    reasoning: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "asset_class": self.asset_class,
            "regime": self.regime.value,
            "volatility_regime": self.volatility_regime.value,
            "momentum_score": self.momentum_score,
            "mean_reversion_score": self.mean_reversion_score,
            "momentum_acceleration": self.momentum_acceleration,
            "mean_reversion_signal": self.mean_reversion_signal,
            "composite_score": self.composite_score,
            "reasoning": self.reasoning,
        }


def _clamp_score(value: float) -> float:
    """Clamp score to 0-100."""
    return max(0.0, min(100.0, value))


def _compute_returns(prices: List[float]) -> Optional[float]:
    """Compute period return (last/first - 1)."""
    if not prices or len(prices) < 2 or prices[0] <= 0:
        return None
    return (prices[-1] / prices[0]) - 1.0


def _compute_volatility(prices: List[float]) -> Optional[float]:
    """Compute annualized volatility from price series (log returns std * sqrt(252))."""
    if not prices or len(prices) < 3:
        return None
    import math
    log_returns = []
    for i in range(1, len(prices)):
        if prices[i - 1] > 0:
            log_returns.append(math.log(prices[i] / prices[i - 1]))
    if not log_returns:
        return None
    mean_ret = sum(log_returns) / len(log_returns)
    variance = sum((r - mean_ret) ** 2 for r in log_returns) / max(1, len(log_returns) - 1)
    return (variance ** 0.5) * (252 ** 0.5) if variance > 0 else 0.0


class SignalEngine:
    """Processes market data and produces structured signals."""

    def __init__(self, config: Optional[SignalConfig] = None):
        self.config = config or get_default_system_config().signal

    def process_stock(
        self,
        symbol: str,
        prices: List[float],
        returns_20d: Optional[float] = None,
        returns_10d: Optional[float] = None,
        volatility_20d: Optional[float] = None,
        volatility_10d: Optional[float] = None,
        high_20d: Optional[float] = None,
        low_20d: Optional[float] = None,
    ) -> SignalOutput:
        """Process stock price structure and produce signal."""
        return self._process_symbol(
            symbol=symbol,
            asset_class="stock",
            prices=prices,
            returns_20d=returns_20d,
            returns_10d=returns_10d,
            volatility_20d=volatility_20d,
            volatility_10d=volatility_10d,
            high_20d=high_20d,
            low_20d=low_20d,
        )

    def process_future(
        self,
        symbol: str,
        prices: List[float],
        returns_20d: Optional[float] = None,
        volatility_20d: Optional[float] = None,
        high_20d: Optional[float] = None,
        low_20d: Optional[float] = None,
    ) -> SignalOutput:
        """Process futures price structure and produce signal."""
        return self._process_symbol(
            symbol=symbol,
            asset_class="future",
            prices=prices,
            returns_20d=returns_20d,
            returns_10d=None,
            volatility_20d=volatility_20d,
            volatility_10d=None,
            high_20d=high_20d,
            low_20d=low_20d,
        )

    def _process_symbol(
        self,
        symbol: str,
        asset_class: str,
        prices: List[float],
        returns_20d: Optional[float] = None,
        returns_10d: Optional[float] = None,
        volatility_20d: Optional[float] = None,
        volatility_10d: Optional[float] = None,
        high_20d: Optional[float] = None,
        low_20d: Optional[float] = None,
    ) -> SignalOutput:
        """Core signal processing logic."""
        cfg = self.config

        ret_20 = returns_20d
        ret_10 = returns_10d
        if ret_20 is None and prices and len(prices) >= cfg.lookback_periods:
            short = prices[-cfg.lookback_periods:]
            ret_20 = _compute_returns(short)
        if ret_10 is None and prices and len(prices) >= cfg.volatility_lookback:
            short = prices[-cfg.volatility_lookback:]
            ret_10 = _compute_returns(short)

        vol_20 = volatility_20d
        vol_10 = volatility_10d
        if vol_20 is None and prices and len(prices) >= cfg.lookback_periods:
            vol_20 = _compute_volatility(prices[-cfg.lookback_periods:])
        if vol_10 is None and prices and len(prices) >= cfg.volatility_lookback:
            vol_10 = _compute_volatility(prices[-cfg.volatility_lookback:])

        regime = self._detect_regime(ret_20, ret_10, high_20d, low_20d, prices)
        vol_regime = self._detect_volatility_regime(vol_20, vol_10)

        momentum_score = 50.0
        if ret_20 is not None:
            momentum_score = 50.0 + (ret_20 / cfg.trend_threshold) * 25.0
            momentum_score = _clamp_score(momentum_score)
        reasoning_regime = f"regime={regime.value}, ret_20d={ret_20:.4f}" if ret_20 is not None else "insufficient data"

        mr_score = 50.0
        mr_signal = False
        if ret_20 is not None and vol_20 and vol_20 > 0:
            z = ret_20 / vol_20
            if abs(z) >= cfg.mean_reversion_z_threshold:
                mr_signal = True
                mr_score = _clamp_score(70.0 + abs(z) * 5)
            else:
                mr_score = _clamp_score(50.0 - abs(z) * 10)
        reasoning_mr = f"z={ret_20/vol_20:.2f}" if (ret_20 and vol_20) else "n/a"

        mom_accel = False
        if ret_10 is not None and ret_20 is not None:
            if ret_10 > ret_20 and ret_10 > cfg.momentum_acceleration_threshold:
                mom_accel = True

        if regime == RegimeType.TREND_UP or regime == RegimeType.TREND_DOWN:
            composite = 0.7 * momentum_score + 0.3 * mr_score
        else:
            composite = 0.4 * momentum_score + 0.6 * mr_score
        composite = _clamp_score(composite)

        return SignalOutput(
            symbol=symbol,
            asset_class=asset_class,
            regime=regime,
            volatility_regime=vol_regime,
            momentum_score=momentum_score,
            mean_reversion_score=mr_score,
            momentum_acceleration=mom_accel,
            mean_reversion_signal=mr_signal,
            composite_score=composite,
            reasoning={
                "regime_detection": reasoning_regime,
                "mean_reversion": reasoning_mr,
                "volatility_regime": vol_regime.value,
            },
        )

    def _detect_regime(
        self,
        ret_20: Optional[float],
        ret_10: Optional[float],
        high_20d: Optional[float],
        low_20d: Optional[float],
        prices: List[float],
    ) -> RegimeType:
        """Detect trend vs range regime."""
        cfg = self.config
        if ret_20 is None:
            return RegimeType.UNKNOWN
        if ret_20 >= cfg.trend_threshold:
            return RegimeType.TREND_UP
        if ret_20 <= -cfg.trend_threshold:
            return RegimeType.TREND_DOWN
        if abs(ret_20) <= cfg.range_threshold:
            return RegimeType.RANGE
        return RegimeType.RANGE

    def _detect_volatility_regime(
        self,
        vol_20: Optional[float],
        vol_10: Optional[float],
    ) -> VolatilityRegime:
        """Detect volatility regime."""
        if vol_20 is None:
            return VolatilityRegime.UNKNOWN
        if vol_20 < 0.12:
            return VolatilityRegime.LOW
        if vol_20 > 0.25:
            return VolatilityRegime.HIGH
        return VolatilityRegime.NORMAL

    def process_market_snapshot(self, snapshot: Dict[str, Any]) -> List[SignalOutput]:
        """Process full market snapshot and return signals for all instruments."""
        signals = []
        stocks = snapshot.get("stocks", [])
        price_history = snapshot.get("price_history", {})

        for s in stocks:
            symbol = s.get("symbol", "")
            prices = price_history.get(symbol, [])
            if not prices and s.get("price"):
                prices = [s.get("close_prev", s["price"]), s["price"]]
            sig = self.process_stock(
                symbol=symbol,
                prices=prices,
                returns_20d=s.get("returns_20d"),
                returns_10d=s.get("returns_10d"),
                volatility_20d=s.get("volatility_20d"),
                volatility_10d=s.get("volatility_10d"),
                high_20d=s.get("high_20d"),
                low_20d=s.get("low_20d"),
            )
            signals.append(sig)

        return signals

    def process_uoa_anomaly(self, anomaly: Dict[str, Any]) -> tuple[float, Dict[str, Any]]:
        """Process an unusual options activity anomaly through the XGBoost ML pipeline."""
        from engine.ml_models.uoa_xgboost import UOAModelPipeline
        from config.system_config import get_default_system_config
        pipeline = UOAModelPipeline(data_source=get_default_system_config().data_source)
        ticker = anomaly.get("ticker")
        
        # History is fetched by the model pipeline to engineer features
        history_data = pipeline.market_adapter.fetch_ohlc(ticker, period="3mo", interval="1d")
        history = history_data.get("series", [])
        
        prob = pipeline.predict(anomaly, history)
        features = pipeline.engineer_features(anomaly, history) or {}
        
        return prob, features
