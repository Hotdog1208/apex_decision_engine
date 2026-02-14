"""
Equity Momentum Strategy for Apex Decision Engine.
Consumes signals, evaluates trend/momentum conditions, produces stock trade candidates.
"""

from typing import Any, Dict, List, Optional

from engine.core.signal_engine import RegimeType, SignalOutput
from engine.strategies.base_strategy import BaseStrategy, TradeCandidate


class EquityMomentumStrategy(BaseStrategy):
    """Long momentum stocks in uptrend with acceleration."""

    @property
    def name(self) -> str:
        return "equity_momentum"

    @property
    def asset_class(self) -> str:
        return "stock"

    def evaluate(
        self,
        signals: List[SignalOutput],
        market_data: Dict[str, Any],
        option_chain: Optional[Dict[str, Any]] = None,
        futures_chain: Optional[Dict[str, Any]] = None,
    ) -> List[TradeCandidate]:
        """Evaluate momentum conditions and produce stock candidates."""
        candidates = []
        stocks = {s["symbol"]: s for s in market_data.get("stocks", [])}
        signal_map = {s.symbol: s for s in signals if s.asset_class == "stock"}

        for symbol, stock in stocks.items():
            sig = signal_map.get(symbol)
            if not sig:
                continue

            # Momentum strategy: trend_up + high momentum + optional acceleration
            if sig.regime != RegimeType.TREND_UP:
                continue
            if sig.momentum_score < 65:
                continue

            price = stock.get("price", 0)
            if price <= 0:
                continue

            # Subscore: blend momentum and composite
            subscore = 0.6 * sig.momentum_score + 0.4 * sig.composite_score
            if sig.momentum_acceleration:
                subscore = min(100.0, subscore + 5.0)  # Bonus for acceleration

            # Quantity placeholder - will be sized by allocator
            candidates.append(TradeCandidate(
                asset_class="stock",
                symbol=symbol,
                strategy=self.name,
                direction="long",
                position_details={
                    "entry_price": price,
                    "quantity": 0,
                    "multiplier": 1.0,
                    "sector": stock.get("sector"),
                    "volatility_20d": stock.get("volatility_20d"),
                },
                confidence_subscore=subscore,
                reasoning={
                    "structure_alignment": f"trend_up regime, momentum_score={sig.momentum_score:.1f}",
                    "volatility_alignment": f"vol_regime={sig.volatility_regime.value}",
                    "strategy_fit": "momentum_acceleration" if sig.momentum_acceleration else "trend_follow",
                },
                entry_price=price,
                quantity=0,
            ))

        return candidates
