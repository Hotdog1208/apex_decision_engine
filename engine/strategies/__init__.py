"""Strategy layer."""

from .base_strategy import BaseStrategy, TradeCandidate
from .equity_momentum import EquityMomentumStrategy
from .equity_mean_reversion import EquityMeanReversionStrategy
from .option_directional import OptionDirectionalStrategy
from .option_spread import OptionSpreadStrategy
from .future_trend import FutureTrendStrategy

__all__ = [
    "BaseStrategy",
    "TradeCandidate",
    "EquityMomentumStrategy",
    "EquityMeanReversionStrategy",
    "OptionDirectionalStrategy",
    "OptionSpreadStrategy",
    "FutureTrendStrategy",
]
