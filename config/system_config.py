"""
System configuration for Apex Decision Engine.
Central configuration - no hardcoded tickers, all parameter-driven.
"""

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class SignalConfig:
    """Signal engine parameters."""
    lookback_periods: int = 20
    volatility_lookback: int = 10
    trend_threshold: float = 0.02  # 2% move for trend
    range_threshold: float = 0.005  # 0.5% for range detection
    momentum_acceleration_threshold: float = 0.015
    mean_reversion_z_threshold: float = 2.0
    regime_smoothing_periods: int = 5


@dataclass
class ScoringConfig:
    """Scoring engine weights (must sum to 1.0)."""
    structure_weight: float = 0.25
    volatility_weight: float = 0.20
    liquidity_weight: float = 0.15
    risk_reward_weight: float = 0.25
    strategy_fit_weight: float = 0.15
    min_liquidity_score: float = 50.0
    min_volatility_alignment: float = 40.0


@dataclass
class AllocationConfig:
    """Capital allocation parameters."""
    max_trades_per_cycle: int = 10
    min_confidence_for_allocation: float = 60.0
    proportional_weight_base: float = 0.8  # Base weight for proportional allocation
    diversification_penalty: float = 0.1  # Penalty for correlated positions
    kelly_fraction: float = 0.25  # Fractional Kelly for safety (0.25 = quarter Kelly)


@dataclass
class LifecycleConfig:
    """Trade lifecycle parameters."""
    stop_loss_pct: float = 0.05  # 5% stop
    target_profit_pct: float = 0.10  # 10% target
    trailing_stop_activation_pct: float = 0.05
    trailing_stop_pct: float = 0.03
    max_holding_periods: int = 252  # ~1 year in trading days


@dataclass
class SystemConfig:
    """Master system configuration."""
    data_source: str = "mock"  # "mock" | "etrade" - swap adapters via this
    signal: SignalConfig = field(default_factory=SignalConfig)
    scoring: ScoringConfig = field(default_factory=ScoringConfig)
    allocation: AllocationConfig = field(default_factory=AllocationConfig)
    lifecycle: LifecycleConfig = field(default_factory=LifecycleConfig)
    data_paths: Dict[str, str] = field(default_factory=lambda: {
        "market_snapshot": "data/market_snapshot.json",
        "option_chain": "data/option_chain.json",
        "futures_chain": "data/futures_chain.json",
    })
    log_path: str = "logs"


def get_default_system_config() -> SystemConfig:
    """Return default system configuration."""
    return SystemConfig()
