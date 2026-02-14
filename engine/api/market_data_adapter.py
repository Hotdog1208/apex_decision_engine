"""
Market Data Adapter for Apex Decision Engine.
Standardizes market data from any source into ADE format.
Swap mock/real implementation via DATA_SOURCE config.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional

import json
import logging

logger = logging.getLogger(__name__)


class MarketDataAdapter(ABC):
    """Standardizes market data from any source into ADE format."""

    @abstractmethod
    def fetch_quote(self, symbol: str) -> Dict[str, Any]:
        """Fetch quote for symbol. Returns: {symbol, price, bid, ask, volume, timestamp}."""
        pass

    @abstractmethod
    def fetch_option_chain(self, symbol: str, expiration: Optional[str] = None) -> Dict[str, Any]:
        """Fetch option chain. Returns standardized chain with calls, puts, underlying_price."""
        pass

    @abstractmethod
    def fetch_futures_chain(self, root_symbol: Optional[str] = None) -> Dict[str, Any]:
        """Fetch futures contracts. Returns standardized chain with contracts, price_history."""
        pass

    @abstractmethod
    def fetch_market_snapshot(self) -> Dict[str, Any]:
        """Fetch full market snapshot: stocks, price_history."""
        pass


class MockMarketDataAdapter(MarketDataAdapter):
    """Mock adapter reading from JSON files. Returns data in same format as real API."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = Path(data_dir) if data_dir else Path(__file__).resolve().parent.parent.parent / "data"
        logger.info("MockMarketDataAdapter initialized with data_dir=%s", self.data_dir)

    def fetch_quote(self, symbol: str) -> Dict[str, Any]:
        """Fetch quote from market snapshot."""
        snapshot = self.fetch_market_snapshot()
        for stock in snapshot.get("stocks", []):
            if stock.get("symbol") == symbol:
                return {
                    "symbol": symbol,
                    "price": stock.get("price", 0),
                    "bid": stock.get("bid", 0),
                    "ask": stock.get("ask", 0),
                    "volume": stock.get("volume", 0),
                    "timestamp": snapshot.get("timestamp", ""),
                }
        return {"symbol": symbol, "price": 0, "bid": 0, "ask": 0, "volume": 0, "timestamp": ""}

    def fetch_option_chain(self, symbol: str, expiration: Optional[str] = None) -> Dict[str, Any]:
        """Fetch option chain from JSON."""
        path = self.data_dir / "option_chain.json"
        try:
            with open(path, "r") as f:
                chain = json.load(f)
            if chain.get("underlying") != symbol:
                logger.warning("Option chain underlying %s != requested %s", chain.get("underlying"), symbol)
            return {
                "underlying": chain.get("underlying", symbol),
                "underlying_price": chain.get("underlying_price", 0),
                "timestamp": chain.get("timestamp", ""),
                "calls": chain.get("calls", []),
                "puts": chain.get("puts", []),
                "expirations": chain.get("expirations", []),
            }
        except Exception as e:
            logger.error("Failed to fetch option chain: %s", e)
            return {"underlying": symbol, "underlying_price": 0, "calls": [], "puts": [], "expirations": []}

    def fetch_futures_chain(self, root_symbol: Optional[str] = None) -> Dict[str, Any]:
        """Fetch futures chain from JSON."""
        path = self.data_dir / "futures_chain.json"
        try:
            with open(path, "r") as f:
                chain = json.load(f)
            contracts = chain.get("contracts", [])
            if root_symbol:
                contracts = [c for c in contracts if c.get("symbol", "").startswith(root_symbol)]
            return {
                "timestamp": chain.get("timestamp", ""),
                "contracts": contracts,
                "price_history": chain.get("price_history", {}),
            }
        except Exception as e:
            logger.error("Failed to fetch futures chain: %s", e)
            return {"contracts": [], "price_history": {}}

    def fetch_market_snapshot(self) -> Dict[str, Any]:
        """Fetch full market snapshot from JSON."""
        path = self.data_dir / "market_snapshot.json"
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Failed to fetch market snapshot: %s", e)
            return {"stocks": [], "price_history": {}, "timestamp": ""}
