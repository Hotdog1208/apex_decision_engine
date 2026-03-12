"""
Capital Allocator for Apex Decision Engine.
Ranks trades by confidence, respects risk budget, allocates proportionally.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from config.system_config import AllocationConfig, get_default_system_config  # type: ignore
from engine.core.risk_engine import RiskEngine  # type: ignore
from engine.core.scoring_engine import ScoredTrade  # type: ignore


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


@dataclass
class AllocatedTrade:
    """Trade with capital allocation."""
    scored_trade: ScoredTrade
    capital_allocated: float
    risk_per_trade: float
    quantity: float
    rejected: bool = False
    reject_reason: str = ""


class CapitalAllocator:
    """Allocates capital to ranked trades."""

    def __init__(
        self,
        config: Optional[AllocationConfig] = None,
        risk_engine: Optional[RiskEngine] = None,
    ):
        self.config = config or get_default_system_config().allocation
        self.risk_engine = risk_engine or RiskEngine()

    def allocate(
        self,
        scored_trades: List[ScoredTrade],
        portfolio_value: float,
        existing_positions: Optional[List[Dict[str, Any]]] = None,
    ) -> List[AllocatedTrade]:
        """
        Rank by confidence, filter by min confidence, allocate proportionally.
        Reject if risk budget exceeded.
        """
        cfg = self.config
        existing = existing_positions or []

        # Filter by min confidence
        eligible = [st for st in scored_trades if st.confidence_score >= cfg.min_confidence_for_allocation]
        if not eligible:
            return []

        # Sort by confidence descending
        eligible = sorted(eligible, key=lambda x: x.confidence_score, reverse=True)

        # Limit number of trades
        eligible = eligible[: cfg.max_trades_per_cycle]  # type: ignore

        allocated = []
        used_capital = sum(abs(p.get("notional", 0)) for p in existing)
        available = portfolio_value - used_capital
        if available <= 0:
            return [
                AllocatedTrade(st, 0.0, 0.0, 0.0, True, "No available capital")
                for st in eligible
            ]

        # Proportional allocation by confidence
        total_conf = sum(st.confidence_score for st in eligible)
        if total_conf <= 0:
            total_conf = 1.0

        max_pos_notional = portfolio_value * 0.05  # 5% max per position (spec)
        for st in eligible:
            weight = st.confidence_score / total_conf
            weight *= cfg.proportional_weight_base  # type: ignore
            raw_alloc = available * weight * (st.confidence_score / 100.0)  # type: ignore
            raw_alloc = _clamp(raw_alloc, 0, min(available * cfg.proportional_weight_base, max_pos_notional))

            pos = st.candidate.position_details
            entry = st.candidate.entry_price
            mult = pos.get("multiplier", 1.0)
            vol = pos.get("volatility_20d") or pos.get("volatility_20d") or 0.20

            # Risk-adjusted: cap at max risk per trade
            max_risk_capital = portfolio_value * 0.02  # 2% risk
            risk_per_trade = min(raw_alloc * 0.02, max_risk_capital)

            if entry <= 0:
                allocated.append(AllocatedTrade(st, 0.0, 0.0, 0.0, True, "Invalid entry price"))
                continue

            notional = raw_alloc
            qty = notional / (entry * mult) if mult > 0 else notional / entry
            qty = int(qty) if st.candidate.asset_class != "future" else round(qty, 2)  # type: ignore

            if qty <= 0:
                allocated.append(AllocatedTrade(st, 0.0, 0.0, 0.0, True, "Quantity rounded to zero"))
                continue

            actual_notional = qty * entry * mult
            check = self.risk_engine.check_trade_risk(
                symbol=st.candidate.symbol,
                asset_class=st.candidate.asset_class,
                notional=actual_notional,
                portfolio_value=portfolio_value,
                sector=pos.get("sector"),
            )

            if not check.passed:
                allocated.append(AllocatedTrade(st, 0.0, 0.0, 0.0, True, check.reason))
                continue

            allocated.append(AllocatedTrade(
                scored_trade=st,
                capital_allocated=actual_notional,
                risk_per_trade=risk_per_trade,
                quantity=qty,
                rejected=False,
            ))
            available -= actual_notional  # type: ignore
            if available <= 0:
                break

        return allocated
