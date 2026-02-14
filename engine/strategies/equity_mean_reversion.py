"""
Equity Mean Reversion Strategy for Apex Decision Engine.
Produces candidates when mean_reversion_signal is True.
"""

from typing import Any, Dict, List, Optional

from engine.core.signal_engine import SignalOutput
from engine.strategies.base_strategy import BaseStrategy, TradeCandidate


class EquityMeanReversionStrategy(BaseStrategy):
    """Mean reversion on extreme moves."""

    @property
    def name(self) -> str:
        return "equity_mean_reversion"

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
        """Produce candidates when mean reversion signal fires."""
        candidates = []
        stocks = {s["symbol"]: s for s in market_data.get("stocks", [])}
        signal_map = {s.symbol: s for s in signals if s.asset_class == "stock"}

        for symbol, stock in stocks.items():
            sig = signal_map.get(symbol)
            if not sig or not sig.mean_reversion_signal:
                continue

            price = stock.get("price", 0)
            if price <= 0:
                continue

            # Direction: fade the move (buy if oversold, sell if overbought)
            direction = "long" if sig.momentum_score < 50 else "short"
            subscore = sig.mean_reversion_score

            candidates.append(TradeCandidate(
                asset_class="stock",
                symbol=symbol,
                strategy=self.name,
                direction=direction,
                position_details={
                    "entry_price": price,
                    "quantity": 0,
                    "multiplier": 1.0,
                    "sector": stock.get("sector"),
                    "volatility_20d": stock.get("volatility_20d"),
                },
                confidence_subscore=subscore,
                reasoning={
                    "structure_alignment": f"mean_reversion_signal, z-score extreme",
                    "volatility_alignment": sig.volatility_regime.value,
                    "strategy_fit": "mean_reversion",
                },
                entry_price=price,
                quantity=0,
            ))

        return candidates
