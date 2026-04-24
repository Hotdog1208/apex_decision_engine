"""
Persistent paper trading log manager and accuracy evaluator.
"""
import json
import logging
import os
import tempfile
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import yfinance as yf

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

def _resolve_log_path() -> Path:
    """Resolve paper trade log path from env or default."""
    env_path = os.environ.get("PAPER_LOG_PATH", "").strip()
    if env_path:
        p = Path(env_path)
        if not p.is_absolute():
            p = PROJECT_ROOT / p
        return p
    return PROJECT_ROOT / "data" / "paper_trade_log.json"


LOG_FILE = _resolve_log_path()


def _atomic_write(path: Path, data: list) -> None:
    """Write JSON atomically using a temp file + rename to prevent corruption."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp_path, path)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


class PaperTrader:
    def __init__(self):
        self._ensure_log_exists()

    def _ensure_log_exists(self):
        if not LOG_FILE.parent.exists():
            LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        if not LOG_FILE.exists():
            logger.warning("Paper trade log not found at %s — creating empty file.", LOG_FILE)
            _atomic_write(LOG_FILE, [])
        else:
            try:
                with open(LOG_FILE, "r") as f:
                    json.load(f)
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning("Malformed paper trade log — starting fresh: %s", e)
                _atomic_write(LOG_FILE, [])

    def log_signal(self, signal: Dict[str, Any]):
        """Write a new signal to the paper trade log."""
        factor_scores = {}
        if "factor_scores" in signal:
            factor_scores = signal["factor_scores"]
        elif "confidence_breakdown" in signal:
            factor_scores = signal["confidence_breakdown"]

        entry = {
            "id":               str(uuid.uuid4()),
            "symbol":           signal.get("symbol", ""),
            "timestamp":        signal.get("generated_at", datetime.utcnow().isoformat() + "Z"),
            "verdict":          signal.get("verdict", "WATCH"),
            "confidence":       signal.get("confidence", signal.get("raw_confidence", 50)),
            "raw_confidence":   signal.get("raw_confidence", signal.get("confidence", 50)),
            "price_at_signal":  signal.get("price"),
            # Algorithm scores for post-hoc analysis
            "composite_score":  signal.get("composite_score"),
            "factor_scores":    factor_scores,
            "lead_signal":      signal.get("lead_signal", ""),
            "uoa_contribution": signal.get("uoa_contribution", 0),
            "regime":           signal.get("market_regime", ""),
            # Outcome fields (filled by evaluation job)
            "price_1d_later":   None,
            "price_3d_later":   None,
            "outcome":          None,
            "correct":          None,
            "pct_change_3d":    None,
        }

        try:
            logs = self._read_log()
            logs.append(entry)
            _atomic_write(LOG_FILE, logs)
            logger.info("Logged signal for %s to paper trade log.", signal.get("symbol"))
        except Exception as e:
            logger.error("Failed to log signal: %s", e)

    def _read_log(self) -> List[Dict[str, Any]]:
        """Read log file safely, returning empty list on any error."""
        try:
            with open(LOG_FILE, "r") as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
            logger.warning("Paper log is not a list — returning empty")
            return []
        except Exception as e:
            logger.warning("Could not read paper log: %s", e)
            return []

    def evaluate_signals(self):
        """Background job to fill missing outcomes. Safe to call repeatedly."""
        logger.info("Starting paper trade evaluation job...")
        try:
            logs = self._read_log()
            updated = False
            now = datetime.utcnow()

            for entry in logs:
                if entry.get("correct") is not None:
                    continue

                raw_ts = entry.get("timestamp", "")
                if not raw_ts:
                    continue
                try:
                    ts = datetime.fromisoformat(raw_ts.replace("Z", ""))
                except (ValueError, TypeError):
                    continue

                days_passed = (now - ts).days
                symbol = entry.get("symbol", "")
                if not symbol:
                    continue

                if days_passed >= 1 and entry.get("price_1d_later") is None:
                    p1d = self._get_historical_price(symbol, ts + timedelta(days=1))
                    if p1d is not None:
                        entry["price_1d_later"] = p1d
                        updated = True

                if days_passed >= 3 and entry.get("price_3d_later") is None:
                    p3d = self._get_historical_price(symbol, ts + timedelta(days=3))
                    if p3d is not None:
                        entry["price_3d_later"] = p3d
                        updated = True
                        p0 = entry.get("price_at_signal") or 0
                        if p0 and p0 > 0:
                            pct_change = (p3d - p0) / p0 * 100
                            entry["pct_change_3d"] = round(pct_change, 3)
                            movement = "UP" if p3d > p0 else "DOWN"
                            entry["outcome"] = movement

                            verdict = (entry.get("verdict") or "").upper()
                            is_bullish = "BUY" in verdict
                            is_bearish = "AVOID" in verdict
                            if is_bullish:
                                entry["correct"] = (movement == "UP")
                            elif is_bearish:
                                entry["correct"] = (movement == "DOWN")
                            # WATCH: no correctness judgment

            if updated:
                _atomic_write(LOG_FILE, logs)
                logger.info("Paper trade log updated with evaluations.")

        except Exception as e:
            logger.error("Evaluation job failed: %s", e)

    def _get_historical_price(self, symbol: str, target_date: datetime) -> Optional[float]:
        """Fetch price at or closest to target_date using yfinance."""
        try:
            start_date = target_date.date().isoformat()
            end_date = (target_date + timedelta(days=5)).date().isoformat()
            ticker = yf.Ticker(symbol)
            hist = ticker.history(start=start_date, end=end_date)
            if not hist.empty:
                return float(hist.iloc[0]["Close"])
            return None
        except Exception as e:
            logger.warning("Failed to fetch price for %s on %s: %s", symbol, target_date, e)
            return None

    def get_stats(self) -> Dict[str, Any]:
        """Return accuracy statistics including confidence calibration."""
        try:
            logs = self._read_log()

            evaluated    = [l for l in logs if l.get("correct") is not None]
            correct_list = [l for l in evaluated if l.get("correct") is True]

            total_evaluated = len(evaluated)
            correct_count   = len(correct_list)
            accuracy_pct    = (correct_count / total_evaluated * 100) if total_evaluated > 0 else 0.0

            # Confidence of correct vs incorrect
            def _avg_conf(entries):
                confs = []
                for l in entries:
                    c = l.get("confidence") or l.get("raw_confidence")
                    if c is not None:
                        val = float(c)
                        confs.append(val if val > 1 else val * 100)
                return round(sum(confs) / len(confs), 1) if confs else 0.0

            incorrect_list = [l for l in evaluated if l.get("correct") is False]
            avg_conf_correct   = _avg_conf(correct_list)
            avg_conf_incorrect = _avg_conf(incorrect_list)

            # Per-verdict breakdown
            by_verdict = {}
            for v in ["BUY", "STRONG_BUY", "AVOID", "STRONG_AVOID", "WATCH"]:
                v_logs  = [l for l in logs if (l.get("verdict") or "").upper() == v]
                v_eval  = [l for l in v_logs if l.get("correct") is not None]
                v_right = [l for l in v_eval if l.get("correct") is True]
                by_verdict[v] = {
                    "total":    len(v_logs),
                    "evaluated": len(v_eval),
                    "correct":   len(v_right),
                    "accuracy":  (len(v_right) / len(v_eval) * 100) if v_eval else 0.0,
                }

            sorted_logs     = sorted(logs, key=lambda x: x.get("timestamp", ""))
            earliest_ts     = sorted_logs[0].get("timestamp") if sorted_logs else None
            recent_entries  = sorted(logs, key=lambda x: x.get("timestamp", ""), reverse=True)[:20]

            # Average pct_change_3d for correct vs incorrect
            def _avg_pct(entries):
                vals = [l.get("pct_change_3d") for l in entries if l.get("pct_change_3d") is not None]
                return round(sum(vals) / len(vals), 2) if vals else 0.0

            return {
                "total_signals":        len(logs),
                "evaluated":            total_evaluated,
                "correct":              correct_count,
                "accuracy_pct":         round(accuracy_pct, 1),
                "by_verdict":           by_verdict,
                "avg_confidence":       _avg_conf(logs),
                "avg_conf_correct":     avg_conf_correct,
                "avg_conf_incorrect":   avg_conf_incorrect,
                "avg_pct_change_correct":   _avg_pct(correct_list),
                "avg_pct_change_incorrect": _avg_pct(incorrect_list),
                "earliest_timestamp":   earliest_ts,
                "recent_entries":       recent_entries,
            }
        except Exception as e:
            logger.error("Failed to get stats: %s", e)
            return {
                "error":        str(e),
                "total_signals": 0,
                "evaluated":    0,
                "correct":      0,
                "accuracy_pct": 0,
                "by_verdict":   {},
                "recent_entries": [],
            }

    def get_calibration_factor(self, verdict: str) -> Optional[float]:
        """Return historical_accuracy / 100 for a verdict type. None if <10 evaluated."""
        stats  = self.get_stats()
        v_data = stats.get("by_verdict", {}).get(verdict.upper())
        if v_data and v_data.get("evaluated", 0) >= 10:
            return v_data["accuracy"] / 100.0
        return None

    def get_pnl_stats(self) -> Dict[str, Any]:
        """Compute PnL-style metrics from evaluated paper trade entries."""
        logs     = self._read_log()
        evaluated = [l for l in logs if l.get("pct_change_3d") is not None and l.get("correct") is not None]

        if not evaluated:
            return {"total_trades": 0, "win_rate": 0, "avg_return_pct": 0, "profit_factor": 0}

        winners = [l for l in evaluated if l.get("correct") is True]
        losers  = [l for l in evaluated if l.get("correct") is False]

        win_rate = len(winners) / len(evaluated) * 100

        def _avg(entries, field):
            vals = [abs(l.get(field) or 0) for l in entries]
            return sum(vals) / len(vals) if vals else 0.0

        avg_win  = _avg(winners, "pct_change_3d")
        avg_loss = _avg(losers,  "pct_change_3d")
        profit_factor = (avg_win * len(winners)) / (avg_loss * len(losers)) if avg_loss > 0 and losers else 0.0

        return {
            "total_trades":   len(evaluated),
            "win_rate":       round(win_rate, 1),
            "avg_win_pct":    round(avg_win, 2),
            "avg_loss_pct":   round(avg_loss, 2),
            "profit_factor":  round(profit_factor, 2),
        }
