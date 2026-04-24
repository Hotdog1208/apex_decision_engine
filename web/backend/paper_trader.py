"""
Persistent paper trading log manager and accuracy evaluator.
"""
import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import yfinance as yf

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
LOG_FILE = PROJECT_ROOT / "data" / "paper_trade_log.json"

class PaperTrader:
    def __init__(self):
        self._ensure_log_exists()

    def _ensure_log_exists(self):
        if not LOG_FILE.parent.exists():
            LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        if not LOG_FILE.exists():
            with open(LOG_FILE, "w") as f:
                json.dump([], f)
        else:
            try:
                with open(LOG_FILE, "r") as f:
                    json.load(f)
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Malformed paper trade log detected, starting fresh: {e}")
                with open(LOG_FILE, "w") as f:
                    json.dump([], f)

    def log_signal(self, signal: Dict[str, Any]):
        """
        Write a new signal to the paper trade log.
        """
        entry = {
            "id": str(uuid.uuid4()),
            "symbol": signal["symbol"],
            "timestamp": signal["generated_at"],
            "verdict": signal["verdict"],
            "confidence": signal["confidence"],
            "price_at_signal": signal["price"],
            "price_1d_later": None,
            "price_3d_later": None,
            "outcome": None,
            "correct": None
        }
        
        try:
            with open(LOG_FILE, "r+") as f:
                logs = json.load(f)
                logs.append(entry)
                f.seek(0)
                json.dump(logs, f, indent=2)
                f.truncate()
            logger.info(f"Logged signal for {signal['symbol']} to paper trade log.")
        except Exception as e:
            logger.error(f"Failed to log signal: {e}")

    def evaluate_signals(self):
        """
        Background job to fill missing outcomes.
        """
        logger.info("Starting paper trade evaluation job...")
        try:
            with open(LOG_FILE, "r") as f:
                logs = json.load(f)
            
            updated = False
            now = datetime.utcnow()
            
            for entry in logs:
                # If already fully evaluated, skip
                if entry["correct"] is not None:
                    continue
                
                # Parse timestamp
                ts = datetime.fromisoformat(entry["timestamp"].replace("Z", ""))
                days_passed = (now - ts).days
                
                if days_passed >= 1 and entry["price_1d_later"] is None:
                    entry["price_1d_later"] = self._get_historical_price(entry["symbol"], ts + timedelta(days=1))
                    updated = True
                
                if days_passed >= 3 and entry["price_3d_later"] is None:
                    p3d = self._get_historical_price(entry["symbol"], ts + timedelta(days=3))
                    entry["price_3d_later"] = p3d
                    if p3d:
                        # Evaluate outcome
                        p0 = entry["price_at_signal"]
                        movement = "UP" if p3d > p0 else "DOWN"
                        entry["outcome"] = movement
                        
                        # Verdict mapping
                        verdict = entry["verdict"].upper()
                        is_bullish_verdict = "BUY" in verdict
                        is_bearish_verdict = "AVOID" in verdict
                        
                        if is_bullish_verdict:
                            entry["correct"] = (movement == "UP")
                        elif is_bearish_verdict:
                            entry["correct"] = (movement == "DOWN")
                        else: # WATCH
                            entry["correct"] = None # Won't count for accuracy
                            
                    updated = True

            if updated:
                with open(LOG_FILE, "w") as f:
                    json.dump(logs, f, indent=2)
                logger.info("Paper trade log updated with evaluations.")
                
        except Exception as e:
            logger.error(f"Evaluation job failed: {e}")

    def _get_historical_price(self, symbol: str, target_date: datetime) -> Optional[float]:
        """
        Fetch price at or closest to target_date using yfinance.
        """
        try:
            # Buffer of 5 days to ensure we find a trading day
            start_date = target_date.date().isoformat()
            end_date = (target_date + timedelta(days=5)).date().isoformat()
            
            ticker = yf.Ticker(symbol)
            hist = ticker.history(start=start_date, end=end_date)
            if not hist.empty:
                return float(hist.iloc[0]['Close'])
            return None
        except Exception as e:
            logger.warning(f"Failed to fetch price for {symbol} on {target_date}: {e}")
            return None

    def get_stats(self) -> Dict[str, Any]:
        """
        Returns accuracy statistics.
        """
        try:
            with open(LOG_FILE, "r") as f:
                logs = json.load(f)
            
            evaluated = [l for l in logs if l["correct"] is not None]
            total_evaluated = len(evaluated)
            correct_count = len([l for l in evaluated if l["correct"] is True])
            
            accuracy_pct = (correct_count / total_evaluated * 100) if total_evaluated > 0 else 0.0
            
            by_verdict = {}
            for v in ["BUY", "STRONG_BUY", "AVOID", "STRONG_AVOID", "WATCH"]:
                v_logs = [l for l in logs if l["verdict"].upper() == v]
                v_eval = [l for l in v_logs if l["correct"] is not None]
                v_correct = len([l for l in v_eval if l["correct"] is True])
                by_verdict[v] = {
                    "total": len(v_logs),
                    "evaluated": len(v_eval),
                    "correct": v_correct,
                    "accuracy": (v_correct / len(v_eval) * 100) if len(v_eval) > 0 else 0.0
                }

            sorted_logs = sorted(logs, key=lambda x: x.get("timestamp", ""))
            earliest_timestamp = sorted_logs[0].get("timestamp") if sorted_logs else None
            recent_entries = sorted(logs, key=lambda x: x.get("timestamp", ""), reverse=True)[:20]

            return {
                "total_signals": len(logs),
                "evaluated": total_evaluated,
                "correct": correct_count,
                "accuracy_pct": round(accuracy_pct, 1),
                "by_verdict": by_verdict,
                "avg_confidence": round(sum(l["confidence"] for l in logs) / len(logs), 1) if logs else 0.0,
                "earliest_timestamp": earliest_timestamp,
                "recent_entries": recent_entries,
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {"error": str(e)}

    def get_calibration_factor(self, verdict: str) -> Optional[float]:
        """
        Calculate calibration factor for a verdict type.
        factor = historical_accuracy / 100
        """
        stats = self.get_stats()
        v_data = stats.get("by_verdict", {}).get(verdict.upper())
        if v_data and v_data["evaluated"] >= 10:
             return v_data["accuracy"] / 100.0
        return None
