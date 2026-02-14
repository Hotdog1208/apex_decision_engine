"""
E*TRADE API Connector for Apex Decision Engine.
Abstraction layer - prepared for E*TRADE OAuth/API. Not implemented yet.
Swap mock/real via DATA_SOURCE config in system_config.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import logging

from .market_data_adapter import MarketDataAdapter, MockMarketDataAdapter
from .order_adapter import OrderAdapter, MockOrderAdapter

logger = logging.getLogger(__name__)


class ETradeConnector(ABC):
    """Abstract E*TRADE connector. Real implementation adds OAuth + HTTP."""

    @property
    @abstractmethod
    def market_data(self) -> MarketDataAdapter:
        """Market data adapter."""
        pass

    @property
    @abstractmethod
    def orders(self) -> OrderAdapter:
        """Order adapter."""
        pass

    @abstractmethod
    def connect(self) -> bool:
        """Establish connection. OAuth flow for real API."""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Close connection."""
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        """Check if connected."""
        pass


class MockETradeConnector(ETradeConnector):
    """Mock connector using local JSON. No OAuth, no HTTP."""

    def __init__(self, data_dir: Optional[str] = None):
        from pathlib import Path
        self._data_dir = Path(data_dir) if data_dir else None
        self._market_data = MockMarketDataAdapter(self._data_dir)
        self._orders = MockOrderAdapter()
        self._connected = True
        logger.info("MockETradeConnector initialized")

    @property
    def market_data(self) -> MarketDataAdapter:
        return self._market_data

    @property
    def orders(self) -> OrderAdapter:
        return self._orders

    def connect(self) -> bool:
        self._connected = True
        return True

    def disconnect(self) -> None:
        self._connected = False

    def is_connected(self) -> bool:
        return self._connected


# Placeholder for future E*TRADE implementation
# class ETradeConnectorImpl(ETradeConnector):
#     """Real E*TRADE API connector. Requires: consumer_key, consumer_secret, access_token, access_token_secret."""
#     def __init__(self, consumer_key: str, consumer_secret: str, ...):
#         # OAuth 1.0a flow
#         # Market API: https://api.etrade.com/v1/market/
#         # Order API: https://api.etrade.com/v1/accounts/{accountId}/orders
#         pass
