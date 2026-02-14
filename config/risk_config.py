"""
Risk configuration for Apex Decision Engine.
Strict risk controls - deterministic enforcement.
"""

from dataclasses import dataclass, field
from typing import Dict


@dataclass
class PositionRiskConfig:
    """Per-position risk limits."""
    max_risk_pct_per_trade: float = 0.02  # 2% of portfolio per trade
    min_risk_reward_ratio: float = 1.5
    max_position_size_pct: float = 0.05  # 5% of portfolio max per position (spec)
    volatility_adjusted_sizing: bool = True
    atr_multiplier_for_stop: float = 2.0


@dataclass
class PortfolioRiskConfig:
    """Portfolio-level risk limits."""
    max_daily_loss_pct: float = 0.02  # 2% max daily loss (spec)
    max_sector_concentration_pct: float = 0.30  # 30% max per sector (spec)
    max_asset_class_concentration_pct: float = 0.20  # 20% max per asset class (spec)
    max_gross_exposure_pct: float = 1.50  # 150% gross (long + short)
    max_net_exposure_pct: float = 0.80  # 80% net exposure
    correlation_threshold: float = 0.70  # Reject if correlation > threshold
    max_open_positions: int = 20
    max_options_positions: int = 10
    max_futures_positions: int = 5


@dataclass
class VolatilitySizingConfig:
    """Volatility-adjusted position sizing."""
    target_volatility_pct: float = 0.15  # Target 15% annual vol
    min_position_volatility: float = 0.10
    max_position_volatility: float = 0.40
    annualization_factor: float = 252 ** 0.5  # sqrt(252) for daily


@dataclass
class RiskConfig:
    """Master risk configuration."""
    position: PositionRiskConfig = field(default_factory=PositionRiskConfig)
    portfolio: PortfolioRiskConfig = field(default_factory=PortfolioRiskConfig)
    volatility_sizing: VolatilitySizingConfig = field(default_factory=VolatilitySizingConfig)
    sector_map: Dict[str, str] = field(default_factory=dict)  # symbol -> sector


def get_default_risk_config() -> RiskConfig:
    """Return default risk configuration."""
    return RiskConfig()
