"""
Asynchronous Unusual Options Activity (UOA) Scanner using E-Trade API.
This module fetches options chains exclusively from E-Trade and models "Smart Money" footprints mathematically.
"""

import json
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

from engine.api.etrade_real_connector import ETradeRealConnector

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Configuration
WATCHLIST = ["SPY", "QQQ", "TSLA", "AAPL"]
VOL_OI_RATIO_THRESHOLD = 5.0
DATA_FILE = Path("data/uoa_anomalies.json")

class UOAScanner:
    def __init__(self):
        self.etrade = ETradeRealConnector()

    async def run(self):
        logger.info("Starting Unusual Options Activity (UOA) Scanner...")

        if not self.etrade.connect():
            logger.error("Scan aborted: Failed to establish E-Trade OAuth 1.0a connection.")
            return

        logger.info(f"Scanning Watchlist: {WATCHLIST}")

        # Execute queries concurrently to minimize I/O latency
        tasks = [self.scan_ticker(ticker) for ticker in WATCHLIST]
        all_anomalies = []

        results = await asyncio.gather(*tasks, return_exceptions=True)
        for res in results:
            if isinstance(res, list):
                all_anomalies.extend(res)
            else:
                logger.error(f"Error processing ticker task: {res}")

        if all_anomalies:
            self.save_anomalies(all_anomalies)
        else:
            logger.info("No unusual options activity fulfilling the Vol/OI criteria was detected today.")

    async def scan_ticker(self, ticker: str):
        logger.info(f"[{ticker}] Fetching option chain matrix...")
        anomalies = []

        try:
            # Pings E-Trade API. By default, retrieves the near-term option chains if expiry not explicitly parsed
            data = await self.etrade.get_option_chains(ticker)
        except Exception as e:
            logger.error(f"[{ticker}] API Request Error: {e}")
            return anomalies

        if "OptionChainResponse" not in data or "OptionPair" not in data["OptionChainResponse"]:
            logger.warning(f"[{ticker}] Malformed response or no chain available.")
            return anomalies

        pairs = data["OptionChainResponse"]["OptionPair"]

        total_calls_vol = 0
        total_puts_vol = 0
        iv_sum = 0
        iv_count = 0

        # Mathematical Edge Detection
        for pair in pairs:
            call_info = pair.get("Call")
            put_info = pair.get("Put")

            # Evaluate Call Options
            if call_info:
                vol = int(call_info.get("volume", 0))
                oi = int(call_info.get("openInterest", 0))
                iv = float(call_info.get("impliedVolatility", 0.0) or 0.0)
                strike = float(call_info.get("strikePrice", 0.0))

                total_calls_vol += vol
                if iv > 0:
                    iv_sum += iv
                    iv_count += 1

                # Vol/OI Anomaly Trigger
                if oi > 0 and (vol / oi) > VOL_OI_RATIO_THRESHOLD:
                    anomalies.append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "ticker": ticker,
                        "strike": strike,
                        "expiry": call_info.get('quoteDetail', 'Unknown Expiry'), # API structure fallback
                        "type": "CALL",
                        "volume": vol,
                        "open_interest": oi,
                        "vol_oi_ratio": round(vol / oi, 2),
                        "iv": iv
                    })

            # Evaluate Put Options
            if put_info:
                vol = int(put_info.get("volume", 0))
                oi = int(put_info.get("openInterest", 0))
                iv = float(put_info.get("impliedVolatility", 0.0) or 0.0)
                strike = float(put_info.get("strikePrice", 0.0))

                total_puts_vol += vol
                if iv > 0:
                    iv_sum += iv
                    iv_count += 1

                # Vol/OI Anomaly Trigger
                if oi > 0 and (vol / oi) > VOL_OI_RATIO_THRESHOLD:
                    anomalies.append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "ticker": ticker,
                        "strike": strike,
                        "expiry": put_info.get('quoteDetail', 'Unknown Expiry'),
                        "type": "PUT",
                        "volume": vol,
                        "open_interest": oi,
                        "vol_oi_ratio": round(vol / oi, 2),
                        "iv": iv
                    })

        # Calculate Chain-wide Aggregates
        pcr = total_puts_vol / total_calls_vol if total_calls_vol > 0 else 0
        avg_iv = iv_sum / iv_count if iv_count > 0 else 0
        logger.info(f"[{ticker}] Chain Parse Complete. Processed {len(pairs)} strikes. PCR: {pcr:.2f} | Avg IV: {avg_iv:.2f}")

        # Post-process for IV Spikes
        for anomaly in anomalies:
            if anomaly["iv"] > (avg_iv * 1.5):
                anomaly["iv_spike"] = True
            else:
                anomaly["iv_spike"] = False

        return anomalies

    def save_anomalies(self, anomalies):
        """Append anomalies to structured local JSON storage."""
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

        existing_data = []
        if DATA_FILE.exists():
            try:
                with open(DATA_FILE, "r") as f:
                    existing_data = json.load(f)
            except json.JSONDecodeError:
                logger.warning("Corrupted JSON file. Overwriting with new data.")

        existing_data.extend(anomalies)

        with open(DATA_FILE, "w") as f:
            json.dump(existing_data, f, indent=4)

        logger.info(f"Successfully committed {len(anomalies)} anomalies to {DATA_FILE}")

if __name__ == "__main__":
    scanner = UOAScanner()
    asyncio.run(scanner.run())
