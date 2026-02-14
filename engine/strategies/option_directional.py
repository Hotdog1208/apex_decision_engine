"""
Option Directional Strategy for Apex Decision Engine.
Selects actual contracts from chain - directional thesis, volatility alignment.
"""

from typing import Any, Dict, List, Optional

from engine.core.signal_engine import RegimeType, SignalOutput
from engine.strategies.base_strategy import BaseStrategy, TradeCandidate


def _select_call_from_chain(
    chain: Dict[str, Any],
    direction: str,
    min_open_interest: int = 500,
    min_delta: float = 0.50,
    max_delta: float = 0.70,
) -> Optional[Dict[str, Any]]:
    """Select best call from chain: liquid, delta-aligned."""
    calls = chain.get("calls", [])
    underlying_price = chain.get("underlying_price", 0)
    if underlying_price <= 0 or not calls:
        return None

    best = None
    best_score = -1.0
    for c in calls:
        oi = c.get("open_interest", 0)
        if oi < min_open_interest:
            continue
        delta = abs(c.get("delta", 0))
        if delta < min_delta or delta > max_delta:
            continue
        # Prefer higher OI and delta in range
        score = oi * delta
        if score > best_score:
            best_score = score
            best = c
    return best


def _select_put_from_chain(
    chain: Dict[str, Any],
    min_open_interest: int = 500,
    min_delta: float = 0.50,
    max_delta: float = 0.70,
) -> Optional[Dict[str, Any]]:
    """Select best put from chain: liquid, delta-aligned."""
    puts = chain.get("puts", [])
    if not puts:
        return None

    best = None
    best_score = -1.0
    for p in puts:
        oi = p.get("open_interest", 0)
        if oi < min_open_interest:
            continue
        delta = abs(p.get("delta", 0))
        if delta < min_delta or delta > max_delta:
            continue
        score = oi * delta
        if score > best_score:
            best_score = score
            best = p
    return best


class OptionDirectionalStrategy(BaseStrategy):
    """Directional option plays - calls for bullish, puts for bearish."""

    @property
    def name(self) -> str:
        return "option_directional"

    @property
    def asset_class(self) -> str:
        return "option"

    def evaluate(
        self,
        signals: List[SignalOutput],
        market_data: Dict[str, Any],
        option_chain: Optional[Dict[str, Any]] = None,
        futures_chain: Optional[Dict[str, Any]] = None,
    ) -> List[TradeCandidate]:
        """Evaluate signals and select exact contracts from chain."""
        candidates = []
        if not option_chain:
            return candidates

        underlying = option_chain.get("underlying", "")
        underlying_price = option_chain.get("underlying_price", 0)

        # Get signal for underlying
        sig = next((s for s in signals if s.symbol == underlying and s.asset_class == "stock"), None)
        if not sig:
            sig = next((s for s in signals if s.symbol == underlying), None)

        if not sig:
            return candidates

        # Bullish: trend_up + momentum -> buy call
        if sig.regime == RegimeType.TREND_UP and sig.momentum_score >= 60:
            contract = _select_call_from_chain(option_chain, "long")
            if contract:
                price = (contract.get("bid", 0) + contract.get("ask", 0)) / 2
                if price <= 0:
                    price = contract.get("last", 0)
                candidates.append(TradeCandidate(
                    asset_class="option",
                    symbol=contract["symbol"],
                    strategy=self.name,
                    direction="long",
                    position_details={
                        "underlying": underlying,
                        "strike": contract["strike"],
                        "expiration": contract["expiration"],
                        "option_type": "call",
                        "entry_price": price,
                        "quantity": 0,
                        "multiplier": 100,
                        "bid": contract.get("bid"),
                        "ask": contract.get("ask"),
                        "open_interest": contract.get("open_interest"),
                        "implied_volatility": contract.get("implied_volatility"),
                        "delta": contract.get("delta"),
                    },
                    confidence_subscore=sig.composite_score,
                    reasoning={
                        "structure_alignment": f"trend_up, momentum={sig.momentum_score:.1f}",
                        "volatility_alignment": f"IV={contract.get('implied_volatility', 0):.2%}" if contract.get("implied_volatility") else "n/a",
                        "liquidity_assessment": f"OI={contract.get('open_interest', 0)}, bid-ask available",
                        "strategy_fit": "directional_call",
                    },
                    entry_price=price,
                    quantity=0,
                ))

        # Bearish: trend_down + low momentum -> buy put
        if sig.regime == RegimeType.TREND_DOWN and sig.momentum_score <= 40:
            contract = _select_put_from_chain(option_chain)
            if contract:
                price = (contract.get("bid", 0) + contract.get("ask", 0)) / 2
                if price <= 0:
                    price = contract.get("last", 0)
                candidates.append(TradeCandidate(
                    asset_class="option",
                    symbol=contract["symbol"],
                    strategy=self.name,
                    direction="long",
                    position_details={
                        "underlying": underlying,
                        "strike": contract["strike"],
                        "expiration": contract["expiration"],
                        "option_type": "put",
                        "entry_price": price,
                        "quantity": 0,
                        "multiplier": 100,
                        "bid": contract.get("bid"),
                        "ask": contract.get("ask"),
                        "open_interest": contract.get("open_interest"),
                        "implied_volatility": contract.get("implied_volatility"),
                        "delta": contract.get("delta"),
                    },
                    confidence_subscore=100.0 - sig.momentum_score,
                    reasoning={
                        "structure_alignment": f"trend_down, momentum={sig.momentum_score:.1f}",
                        "volatility_alignment": f"IV={contract.get('implied_volatility', 0):.2%}" if contract.get("implied_volatility") else "n/a",
                        "liquidity_assessment": f"OI={contract.get('open_interest', 0)}",
                        "strategy_fit": "directional_put",
                    },
                    entry_price=price,
                    quantity=0,
                ))

        return candidates
