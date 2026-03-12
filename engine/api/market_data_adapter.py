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
        raise NotImplementedError

    @abstractmethod
    def fetch_option_chain(self, symbol: str, expiration: Optional[str] = None) -> Dict[str, Any]:
        """Fetch option chain. Returns standardized chain with calls, puts, underlying_price."""
        raise NotImplementedError

    @abstractmethod
    def fetch_futures_chain(self, root_symbol: Optional[str] = None) -> Dict[str, Any]:
        """Fetch futures contracts. Returns standardized chain with contracts, price_history."""
        raise NotImplementedError

    @abstractmethod
    def fetch_market_snapshot(self) -> Dict[str, Any]:
        """Fetch full market snapshot: stocks, price_history."""
        raise NotImplementedError

    def fetch_ohlc(
        self,
        symbol: str,
        period: str = "3mo",
        interval: str = "1d",
    ) -> Dict[str, Any]:
        """Fetch OHLCV series for charting. Returns { symbol, period, interval, series: [{ time, open, high, low, close, volume }] }.
        Default implementation returns empty; adapters can override."""
        return {"symbol": symbol, "period": period, "interval": interval, "series": []}


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

    def fetch_ohlc(
        self,
        symbol: str,
        period: str = "3mo",
        interval: str = "1d",
    ) -> Dict[str, Any]:
        """Build OHLC from price_history (close-only). Derive realistic open/high/low from close series."""
        snapshot = self.fetch_market_snapshot()
        hist = (snapshot.get("price_history") or {}).get(symbol)
        stocks = {s["symbol"]: s for s in snapshot.get("stocks", [])}
        stock = stocks.get(symbol, {})
        if not hist or not isinstance(hist, list):
            return {"symbol": symbol, "period": period, "interval": interval, "series": []}
        from datetime import datetime, timezone, timedelta
        base = datetime.now(timezone.utc)
        series = []
        for i, c in enumerate(hist):
            close = float(c)
            open_ = float(hist[i - 1]) if i > 0 else close
            # Realistic intraday range ~0.3% so candles look natural
            high = max(open_, close) * (1 + 0.003 * (1 if close >= open_ else -1))
            low = min(open_, close) * (1 - 0.003 * (1 if close < open_ else -1))
            t = (base - timedelta(days=len(hist) - 1 - i)).replace(hour=0, minute=0, second=0, microsecond=0)
            vol = int(stock.get("volume", 0) / max(len(hist), 1)) if i == len(hist) - 1 else (1000000 + i * 5000)
            series.append({
                "time": int(t.timestamp()),
                "open": round(float(open_), 2),  # type: ignore
                "high": round(float(high), 2),  # type: ignore
                "low": round(float(low), 2),  # type: ignore
                "close": round(float(close), 2),  # type: ignore
                "volume": vol,
            })
        return {"symbol": symbol, "period": period, "interval": interval, "series": series}


# Default symbols for live snapshot (watchlist can be merged elsewhere)
YAHOO_DEFAULT_SYMBOLS = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA",
    "JPM", "BAC", "XOM", "SPY", "QQQ",
]


class YahooMarketDataAdapter(MarketDataAdapter):
    """Live market data via yfinance (no API key). Use DATA_SOURCE=yahoo."""

    def __init__(self, data_dir: Optional[Path] = None, symbols: Optional[List[str]] = None):
        self.data_dir = Path(data_dir) if data_dir else Path(__file__).resolve().parent.parent.parent / "data"
        self.symbols = list(symbols) if symbols else YAHOO_DEFAULT_SYMBOLS.copy()
        self._mock = MockMarketDataAdapter(self.data_dir)
        logger.info("YahooMarketDataAdapter initialized with symbols=%s", list(self.symbols)[0:5])  # type: ignore

    def fetch_quote(self, symbol: str) -> Dict[str, Any]:
        try:
            import yfinance as yf  # type: ignore
            t = yf.Ticker(symbol)
            info = t.fast_info
            price = getattr(info, "last_price", None) or getattr(info, "previous_close", 0)
            volume = getattr(info, "last_volume", None) or 0
            from datetime import datetime, timezone
            return {
                "symbol": symbol,
                "price": float(price) if price is not None else 0,
                "bid": float(price) if price is not None else 0,
                "ask": float(price) if price is not None else 0,
                "volume": int(volume) if volume is not None else 0,
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
        except Exception as e:
            logger.warning("Yahoo fetch_quote %s: %s", symbol, e)
            return {"symbol": symbol, "price": 0, "bid": 0, "ask": 0, "volume": 0, "timestamp": ""}

    def fetch_option_chain(self, symbol: str, expiration: Optional[str] = None) -> Dict[str, Any]:
        """Fallback to mock option chain from JSON; or use yfinance option_chain later."""
        return self._mock.fetch_option_chain(symbol, expiration)

    def fetch_futures_chain(self, root_symbol: Optional[str] = None) -> Dict[str, Any]:
        return self._mock.fetch_futures_chain(root_symbol)

    def fetch_market_snapshot(self) -> Dict[str, Any]:
        try:
            import pandas as pd  # type: ignore
            import numpy as np  # type: ignore
            import yfinance as yf  # type: ignore
            from datetime import datetime, timezone

            syms = [s for s in self.symbols if s]
            if not syms:
                return {"stocks": [], "price_history": {}, "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}

            hist: Any = yf.download(syms, period="3mo", interval="1d", group_by="ticker", auto_adjust=True, progress=False, threads=True)
            if hist.empty:
                return {"stocks": [], "price_history": {}, "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}

            # Single symbol: columns are Open, High, Low, Close, Volume. Multi: (SYM, Open), (SYM, Close), ...
            multi = isinstance(hist.columns, pd.MultiIndex)
            stocks = []
            price_history = {}

            for symbol in syms:
                try:
                    if multi:
                        if (symbol, "Close") not in hist.columns:
                            continue
                        close_ser = hist[(symbol, "Close")].dropna()
                        vol_ser = hist[(symbol, "Volume")] if (symbol, "Volume") in hist.columns else pd.Series(dtype=float)
                    else:
                        close_ser = hist["Close"].dropna() if "Close" in hist.columns else pd.Series(dtype=float)
                        vol_ser = hist["Volume"] if "Volume" in hist.columns else pd.Series(dtype=float)

                    if close_ser.empty:
                        try:
                            t = yf.Ticker(symbol)
                            info = t.info or {}
                            price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
                            volume = info.get("volume") or 0
                            sector = info.get("sector") or "Unknown"
                            stocks.append({
                                "symbol": symbol,
                                "price": float(price),
                                "bid": float(price),
                                "ask": float(price),
                                "volume": int(volume),
                                "sector": sector,
                                "returns_20d": 0,
                                "returns_10d": 0,
                                "volatility_20d": 0.2,
                                "volatility_10d": 0.15,
                                "high_20d": float(price),
                                "low_20d": float(price),
                                "close_prev": float(price),
                            })
                            price_history[symbol] = [float(price)]
                        except Exception as e:
                            logger.warning("Yahoo snapshot ticker %s: %s", symbol, e)
                        continue

                    closes = close_ser.tolist()
                    price = float(closes[-1])
                    prev = float(closes[-2]) if len(closes) >= 2 else price
                    volume = int(vol_ser.iloc[-1]) if not vol_ser.empty and len(vol_ser) > 0 else 0
                    n20 = min(20, len(closes) - 1)
                    n10 = min(10, len(closes) - 1)
                    ret_20 = (price / closes[-1 - n20] - 1) if n20 and len(closes) > n20 else 0
                    ret_10 = (price / closes[-1 - n10] - 1) if n10 and len(closes) > n10 else 0
                    arr = np.array(closes[-21:] if len(closes) >= 21 else closes, dtype=float)
                    vol_20 = float(np.std(np.diff(np.log(arr + 1e-10)))) if len(arr) > 1 else 0.2
                    vol_10 = float(np.std(np.diff(np.log(np.array(closes[-11:], dtype=float) + 1e-10)))) if len(closes) >= 2 else 0.15
                    high_20 = max(closes[-20:]) if len(closes) >= 20 else price
                    low_20 = min(closes[-20:]) if len(closes) >= 20 else price
                    try:
                        sector = (yf.Ticker(symbol).info or {}).get("sector") or "Unknown"
                    except Exception:
                        sector = "Unknown"
                    stocks.append({
                        "symbol": symbol,
                        "price": price,
                        "bid": price,
                        "ask": price,
                        "volume": volume,
                        "sector": sector,
                        "returns_20d": round(float(ret_20), 4),  # type: ignore
                        "returns_10d": round(float(ret_10), 4),  # type: ignore
                        "volatility_20d": round(float(vol_20), 4) if vol_20 else 0.2,  # type: ignore
                        "volatility_10d": round(float(vol_10), 4) if vol_10 else 0.15,  # type: ignore
                        "high_20d": high_20,
                        "low_20d": low_20,
                        "close_prev": prev,
                    })
                    price_history[symbol] = [round(float(x), 2) for x in closes]  # type: ignore
                except Exception as e:
                    logger.warning("Yahoo snapshot row %s: %s", symbol, e)

            return {
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "stocks": stocks,
                "price_history": price_history,
            }
        except Exception as e:
            logger.exception("Yahoo fetch_market_snapshot: %s", e)
            return self._mock.fetch_market_snapshot()

    def fetch_ohlc(
        self,
        symbol: str,
        period: str = "3mo",
        interval: str = "1d",
    ) -> Dict[str, Any]:
        """Fetch OHLCV from yfinance for charting."""
        try:
            import yfinance as yf  # type: ignore
            from datetime import timezone

            ticker = yf.Ticker(symbol)
            # yfinance: period 1d,5d,1mo,3mo,6mo,1y ; interval 1m,2m,5m,15m,30m,60m,90m,1d,5d,1wk,1mo,3mo
            df: Any = ticker.history(period=period, interval=interval, auto_adjust=True)
            if df is None or df.empty:
                return {"symbol": symbol, "period": period, "interval": interval, "series": []}
            series = []
            for dt, row in df.iterrows():
                ts = int(dt.timestamp()) if hasattr(dt, "timestamp") else 0  # type: ignore
                series.append({
                    "time": ts,
                    "open": round(float(row.get("Open", 0)), 2),  # type: ignore
                    "high": round(float(row.get("High", 0)), 2),  # type: ignore
                    "low": round(float(row.get("Low", 0)), 2),  # type: ignore
                    "close": round(float(row.get("Close", 0)), 2),  # type: ignore
                    "volume": int(row.get("Volume", 0)),
                })
            return {"symbol": symbol, "period": period, "interval": interval, "series": series}
        except Exception as e:
            logger.warning("Yahoo fetch_ohlc %s: %s", symbol, e)
            return self._mock.fetch_ohlc(symbol, period, interval)
