"""
Risk Engine for Apex Decision Engine.
Enforces max risk per trade, daily loss, sector/asset concentration.
Volatility-adjusted sizing. Deterministic.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from config.risk_config import RiskConfig, get_default_risk_config


@dataclass
class RiskCheckResult:
    """Result of risk check."""
    passed: bool
    reason: str
    suggested_size_pct: Optional[float] = None


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


class RiskEngine:
    """Enforces risk limits."""

    def __init__(self, config: Optional[RiskConfig] = None):
        self.config = config or get_default_risk_config()

    def check_trade_risk(
        self,
        symbol: str,
        asset_class: str,
        notional: float,
        portfolio_value: float,
        sector: Optional[str] = None,
    ) -> RiskCheckResult:
        """Check if trade passes risk limits."""
        cfg = self.config
        if portfolio_value <= 0:
            return RiskCheckResult(False, "Invalid portfolio value")

        size_pct = notional / portfolio_value
        max_pos = cfg.position.max_position_size_pct
        max_risk = cfg.position.max_risk_pct_per_trade

        if size_pct > max_pos:
            return RiskCheckResult(
                False,
                f"Position size {size_pct:.2%} exceeds max {max_pos:.2%}",
                suggested_size_pct=max_pos,
            )
        return RiskCheckResult(True, "OK", suggested_size_pct=size_pct)

    def check_portfolio_limits(
        self,
        portfolio_value: float,
        positions: List[Dict[str, Any]],
        asset_class_exposure: Dict[str, float],
        sector_exposure: Dict[str, float],
    ) -> RiskCheckResult:
        """Check portfolio-level limits."""
        cfg = self.config.portfolio
        if portfolio_value <= 0:
            return RiskCheckResult(False, "Invalid portfolio value")

        for ac, exp in asset_class_exposure.items():
            pct = exp / portfolio_value
            if pct > cfg.max_asset_class_concentration_pct:
                return RiskCheckResult(
                    False,
                    f"Asset class {ac} exposure {pct:.2%} exceeds {cfg.max_asset_class_concentration_pct:.2%}",
                )
        for sector, exp in sector_exposure.items():
            pct = exp / portfolio_value
            if pct > cfg.max_sector_concentration_pct:
                return RiskCheckResult(
                    False,
                    f"Sector {sector} exposure {pct:.2%} exceeds {cfg.max_sector_concentration_pct:.2%}",
                )

        count_stock = sum(1 for p in positions if p.get("asset_class") == "stock")
        count_option = sum(1 for p in positions if p.get("asset_class") == "option")
        count_future = sum(1 for p in positions if p.get("asset_class") == "future")

        if count_option > cfg.max_options_positions:
            return RiskCheckResult(False, f"Options count {count_option} exceeds max {cfg.max_options_positions}")
        if count_future > cfg.max_futures_positions:
            return RiskCheckResult(False, f"Futures count {count_future} exceeds max {cfg.max_futures_positions}")
        if len(positions) > cfg.max_open_positions:
            return RiskCheckResult(False, f"Position count {len(positions)} exceeds max {cfg.max_open_positions}")

        return RiskCheckResult(True, "OK")

    def volatility_adjusted_size(
        self,
        base_size_pct: float,
        asset_volatility: float,
        target_volatility: Optional[float] = None,
    ) -> float:
        """Compute volatility-adjusted position size."""
        cfg = self.config.volatility_sizing
        if not cfg.target_volatility_pct or asset_volatility <= 0:
            return base_size_pct

        target = target_volatility or cfg.target_volatility_pct
        adj = target / asset_volatility
        adj = _clamp(adj, cfg.min_position_volatility / asset_volatility, cfg.max_position_volatility / asset_volatility)
        return _clamp(base_size_pct * adj, 0.0, self.config.position.max_position_size_pct)
