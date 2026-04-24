"""
Decision Engine for Apex Decision Engine.
Orchestrates: ingest → signal → strategy → score → allocate → lifecycle.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from config.system_config import get_default_system_config
from engine.core.capital_allocator import AllocatedTrade, CapitalAllocator
from engine.core.confidence_model import ConfidenceModel
from engine.core.lifecycle_manager import LifecycleManager
from engine.core.portfolio_manager import PortfolioManager
from engine.core.risk_engine import RiskEngine
from engine.core.scoring_engine import ScoringEngine
from engine.core.signal_engine import SignalEngine, SignalOutput
from engine.strategies.equity_momentum import EquityMomentumStrategy
from engine.strategies.future_trend import FutureTrendStrategy
from engine.strategies.option_directional import OptionDirectionalStrategy


@dataclass
class EngineOutput:
    """Output of decision engine run."""
    signals: List[SignalOutput]
    trade_candidates: List[Any]
    scored_trades: List[Any]
    allocated_trades: List[AllocatedTrade]
    trade_outputs: List[Dict[str, Any]] = field(default_factory=list)


class DecisionEngine:
    """Main orchestration engine."""

    def __init__(
        self,
        portfolio_value: float = 1_000_000.0,
        data_dir: Optional[Path] = None,
    ):
        self.portfolio_value = portfolio_value
        self.data_dir = Path(data_dir) if data_dir else Path(__file__).resolve().parent.parent.parent / "data"

        cfg = get_default_system_config()

        self.signal_engine = SignalEngine(cfg.signal)
        self.scoring_engine = ScoringEngine(cfg.scoring)
        self.confidence_model = ConfidenceModel()
        self.risk_engine = RiskEngine()
        self.capital_allocator = CapitalAllocator(cfg.allocation, self.risk_engine)
        self.portfolio_manager = PortfolioManager(portfolio_value)
        self.lifecycle_manager = LifecycleManager(
            stop_loss_pct=cfg.lifecycle.stop_loss_pct,
            target_profit_pct=cfg.lifecycle.target_profit_pct,
            trailing_activation_pct=cfg.lifecycle.trailing_stop_activation_pct,
            trailing_stop_pct=cfg.lifecycle.trailing_stop_pct,
        )

        self.strategies = [
            EquityMomentumStrategy(),
            OptionDirectionalStrategy(),
            FutureTrendStrategy(),
        ]

    def load_market_snapshot(self) -> Dict[str, Any]:
        """Load market snapshot from data dir."""
        path = self.data_dir / "market_snapshot.json"
        try:
            with open(path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            import logging
            logging.getLogger(__name__).warning("market_snapshot.json not found at %s", path)
            return {"stocks": [], "price_history": {}, "timestamp": ""}
        except Exception as e:
            import logging
            logging.getLogger(__name__).error("Failed to load market snapshot: %s", e)
            return {"stocks": [], "price_history": {}, "timestamp": ""}

    def load_option_chain(self) -> Dict[str, Any]:
        """Load option chain from data dir."""
        path = self.data_dir / "option_chain.json"
        try:
            with open(path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            import logging
            logging.getLogger(__name__).warning("option_chain.json not found at %s", path)
            return {"underlying": "", "underlying_price": 0, "calls": [], "puts": [], "expirations": []}
        except Exception as e:
            import logging
            logging.getLogger(__name__).error("Failed to load option chain: %s", e)
            return {"underlying": "", "underlying_price": 0, "calls": [], "puts": [], "expirations": []}

    def load_futures_chain(self) -> Dict[str, Any]:
        """Load futures chain from data dir."""
        path = self.data_dir / "futures_chain.json"
        try:
            with open(path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            import logging
            logging.getLogger(__name__).warning("futures_chain.json not found at %s", path)
            return {"contracts": [], "price_history": {}}
        except Exception as e:
            import logging
            logging.getLogger(__name__).error("Failed to load futures chain: %s", e)
            return {"contracts": [], "price_history": {}}

    def run(self) -> EngineOutput:
        """
        Full pipeline: ingest → signal → strategy → score → allocate.
        Returns structured trade outputs.
        """
        market = self.load_market_snapshot()
        option_chain = self.load_option_chain()
        futures_chain = self.load_futures_chain()

        # 1. Signals
        signals = self.signal_engine.process_market_snapshot(market)

        # Add futures signals
        price_history = futures_chain.get("price_history", {})
        for c in futures_chain.get("contracts", []):
            symbol = c.get("symbol", "")
            prices = price_history.get(symbol, [])
            if not prices:
                prices = [c.get("price", 0)]
            sig = self.signal_engine.process_future(
                symbol=symbol,
                prices=prices,
                returns_20d=c.get("returns_20d"),
                volatility_20d=c.get("volatility_20d"),
                high_20d=c.get("high_20d"),
                low_20d=c.get("low_20d"),
            )
            signals.append(sig)

        # 2. Strategy candidates
        candidates = []
        for strat in self.strategies:
            cands = strat.evaluate(signals, market, option_chain, futures_chain)
            candidates.extend(cands)

        # 3. Score
        scored = self.scoring_engine.score_all(candidates)

        # 4. Confidence adjustment (Phase 1: pass-through)
        for st in scored:
            st.confidence_score = self.confidence_model.adjust_confidence(st)

        # 5. Allocate
        existing = self.portfolio_manager.get_positions()
        allocated = self.capital_allocator.allocate(scored, self.portfolio_value, existing)

        # 6. Build trade outputs
        trade_outputs = []
        for alt in allocated:
            if alt.rejected:
                continue
            st = alt.scored_trade
            c = st.candidate
            pos = c.position_details
            pos["quantity"] = alt.quantity
            pos["entry_price"] = c.entry_price
            risk_pct = (alt.risk_per_trade / self.portfolio_value * 100) if self.portfolio_value > 0 else 0
            max_loss = alt.risk_per_trade
            expected_ret = (st.confidence_score / 100) * 0.10
            out = st.to_trade_output(
                capital_allocated=alt.capital_allocated,
                risk_per_trade=alt.risk_per_trade,
                risk_percentage=risk_pct,
                quantity=alt.quantity,
                portfolio_value=self.portfolio_value,
                expected_return=expected_ret,
                max_loss=max_loss,
            )
            trade_outputs.append(out)

        return EngineOutput(
            signals=signals,
            trade_candidates=candidates,
            scored_trades=scored,
            allocated_trades=allocated,
            trade_outputs=trade_outputs,
        )
