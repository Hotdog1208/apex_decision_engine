"""
Future Trend Strategy for Apex Decision Engine.
Selects contracts from futures chain, trend-following, volatility scaling.
"""

from typing import Any, Dict, List, Optional

from engine.core.signal_engine import RegimeType, SignalOutput
from engine.strategies.base_strategy import BaseStrategy, TradeCandidate


def _select_future_contract(
    chain: Dict[str, Any],
    sector: Optional[str] = None,
    min_volume: int = 50000,
) -> List[Dict[str, Any]]:
    """Select liquid futures from chain by sector or all."""
    contracts = chain.get("contracts", [])
    selected = []
    for c in contracts:
        if c.get("volume", 0) < min_volume:
            continue
        if sector and c.get("sector") != sector:
            continue
        selected.append(c)
    return selected


class FutureTrendStrategy(BaseStrategy):
    """Trend-following futures - long in uptrend, short in downtrend."""

    @property
    def name(self) -> str:
        return "future_trend"

    @property
    def asset_class(self) -> str:
        return "future"

    def evaluate(
        self,
        signals: List[SignalOutput],
        market_data: Dict[str, Any],
        option_chain: Optional[Dict[str, Any]] = None,
        futures_chain: Optional[Dict[str, Any]] = None,
    ) -> List[TradeCandidate]:
        """Evaluate signals and select contracts from futures chain."""
        candidates = []
        if not futures_chain:
            return candidates

        # Map futures symbols to signals - use price_history to get symbol list
        price_history = futures_chain.get("price_history", {})
        contracts = futures_chain.get("contracts", [])

        for c in contracts:
            symbol = c.get("symbol", "")
            prices = price_history.get(symbol, [])
            if not prices:
                prices = [c.get("price", 0)]

            # Build synthetic signal for futures (no stock signal)
            ret_20 = c.get("returns_20d")
            vol_20 = c.get("volatility_20d")
            high_20d = c.get("high_20d")
            low_20d = c.get("low_20d")

            # Regime from returns
            regime = RegimeType.RANGE
            if ret_20 is not None:
                if ret_20 >= 0.02:
                    regime = RegimeType.TREND_UP
                elif ret_20 <= -0.02:
                    regime = RegimeType.TREND_DOWN

            momentum_score = 50.0
            if ret_20 is not None:
                momentum_score = 50.0 + (ret_20 / 0.02) * 25.0
                momentum_score = max(0.0, min(100.0, momentum_score))

            composite = momentum_score

            # Only trade strong trends
            if regime == RegimeType.RANGE:
                continue
            if regime == RegimeType.TREND_UP and momentum_score < 65:
                continue
            if regime == RegimeType.TREND_DOWN and momentum_score > 35:
                continue

            price = c.get("price", 0)
            multiplier = c.get("multiplier", 1)
            if price <= 0:
                continue

            direction = "long" if regime == RegimeType.TREND_UP else "short"
            subscore = momentum_score if regime == RegimeType.TREND_UP else 100.0 - momentum_score

            candidates.append(TradeCandidate(
                asset_class="future",
                symbol=symbol,
                strategy=self.name,
                direction=direction,
                position_details={
                    "contract_spec": symbol,
                    "expiration": c.get("expiration"),
                    "entry_price": price,
                    "quantity": 0,
                    "multiplier": multiplier,
                    "sector": c.get("sector"),
                    "volatility_20d": vol_20,
                    "returns_20d": ret_20,
                },
                confidence_subscore=subscore,
                reasoning={
                    "structure_alignment": f"regime={regime.value}, ret_20d={ret_20:.2%}" if ret_20 else "n/a",
                    "volatility_alignment": f"vol_20d={vol_20:.2%}" if vol_20 else "n/a",
                    "liquidity_assessment": f"volume={c.get('volume', 0)}, OI={c.get('open_interest', 0)}",
                    "strategy_fit": "trend_follow",
                },
                entry_price=price,
                quantity=0,
            ))

        return candidates
