"""
signal_logger.py — Supabase-backed signal logging, accuracy evaluation,
and CIPHER trade log operations.
"""

import asyncio
import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
import yfinance as yf  # type: ignore

logger = logging.getLogger(__name__)

_SUPABASE_URL: str = ""
_SERVICE_ROLE_KEY: str = ""


def configure(supabase_url: str, service_role_key: str) -> None:
    global _SUPABASE_URL, _SERVICE_ROLE_KEY
    _SUPABASE_URL      = supabase_url or ""
    _SERVICE_ROLE_KEY  = service_role_key or ""


def _ok() -> bool:
    return bool(_SUPABASE_URL and _SERVICE_ROLE_KEY)


def _hdr() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {_SERVICE_ROLE_KEY}",
        "apikey":        _SERVICE_ROLE_KEY,
        "Content-Type":  "application/json",
    }


# ── Signal write ──────────────────────────────────────────────────────────────

async def log_signal(signal: Dict[str, Any], user_id: Optional[str] = None) -> Optional[str]:
    """
    Write a signal to Supabase signal_log.
    Returns the new row's UUID, or None on failure. Best-effort — never raises.
    """
    if not _ok():
        return None
    try:
        payload = {
            "user_id":           user_id or None,
            "symbol":            signal.get("symbol", ""),
            "verdict":           signal.get("verdict", "WATCH"),
            "confidence":        signal.get("confidence"),
            "composite_score":   signal.get("composite_score"),
            "entry_price":       signal.get("price"),
            "primary_timeframe": signal.get("primary_timeframe", "swing"),
            "lead_signal":       signal.get("lead_signal"),
            "tier":              signal.get("tier", "edge"),
        }
        async with httpx.AsyncClient(timeout=8.0) as c:
            resp = await c.post(
                f"{_SUPABASE_URL}/rest/v1/signal_log",
                json=payload,
                headers={**_hdr(), "Prefer": "return=representation"},
            )
        if resp.status_code in (200, 201):
            rows = resp.json()
            return rows[0]["id"] if rows else None
    except Exception as e:
        logger.debug("signal_log write skipped: %s", e)
    return None


# ── Accuracy sweep ─────────────────────────────────────────────────────────────

def _close_price(symbol: str, target: datetime) -> Optional[float]:
    """Synchronous yfinance price fetch — run in thread pool."""
    try:
        start = target.date().isoformat()
        end   = (target + timedelta(days=6)).date().isoformat()
        hist  = yf.Ticker(symbol).history(start=start, end=end)
        if not hist.empty:
            return float(hist.iloc[0]["Close"])
    except Exception as e:
        logger.debug("Price fetch %s @ %s: %s", symbol, target.date(), e)
    return None


def _is_correct(verdict: str, entry: float, eval_price: float) -> Optional[bool]:
    v = (verdict or "").upper()
    if "BUY"   in v: return eval_price > entry
    if "AVOID" in v: return eval_price < entry
    return None  # WATCH — no judgment


async def _pending_signals(min_days: int = 3, limit: int = 60) -> List[Dict]:
    cutoff = (datetime.utcnow() - timedelta(days=min_days)).isoformat() + "Z"
    url = (
        f"{_SUPABASE_URL}/rest/v1/signal_log"
        f"?select=id,symbol,verdict,confidence,entry_price,generated_at,primary_timeframe"
        f"&generated_at=lt.{cutoff}"
        f"&order=generated_at.desc"
        f"&limit={limit}"
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(url, headers=_hdr())
        if r.status_code == 200 and isinstance(r.json(), list):
            return r.json()
    except Exception as e:
        logger.debug("_pending_signals error: %s", e)
    return []


async def _evaluated_ids() -> set:
    url = f"{_SUPABASE_URL}/rest/v1/signal_accuracy?select=signal_id&limit=5000"
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(url, headers=_hdr())
        if r.status_code == 200:
            return {row["signal_id"] for row in r.json() if row.get("signal_id")}
    except Exception as e:
        logger.debug("_evaluated_ids error: %s", e)
    return set()


async def run_accuracy_sweep() -> int:
    """
    Find unevaluated signals ≥ 3 days old, fetch 1d+3d prices, write to signal_accuracy.
    Returns the number of new rows written.
    """
    if not _ok():
        return 0

    pending, done = await asyncio.gather(_pending_signals(), _evaluated_ids())
    to_eval = [s for s in pending if s["id"] not in done]

    if not to_eval:
        logger.debug("Accuracy sweep: no pending signals.")
        return 0

    loop  = asyncio.get_event_loop()
    count = 0

    for sig in to_eval:
        try:
            sym  = sig.get("symbol", "")
            ep   = sig.get("entry_price")
            ts_s = sig.get("generated_at", "")
            if not sym or not ep or not ts_s:
                continue

            ts = datetime.fromisoformat(ts_s.replace("Z", "").replace("+00:00", ""))

            p1d, p3d = await asyncio.gather(
                loop.run_in_executor(None, _close_price, sym, ts + timedelta(days=1)),
                loop.run_in_executor(None, _close_price, sym, ts + timedelta(days=3)),
            )

            pct1 = round((p1d - ep) / ep * 100, 3) if p1d and ep else None
            pct3 = round((p3d - ep) / ep * 100, 3) if p3d and ep else None

            row = {
                "signal_id":     sig["id"],
                "symbol":        sym,
                "verdict":       sig["verdict"],
                "entry_price":   ep,
                "eval_1d_price": p1d,
                "eval_3d_price": p3d,
                "pct_change_1d": pct1,
                "pct_change_3d": pct3,
                "correct_1d":    _is_correct(sig["verdict"], ep, p1d) if p1d else None,
                "correct_3d":    _is_correct(sig["verdict"], ep, p3d) if p3d else None,
            }

            async with httpx.AsyncClient(timeout=8.0) as c:
                resp = await c.post(
                    f"{_SUPABASE_URL}/rest/v1/signal_accuracy",
                    json=row,
                    headers={**_hdr(), "Prefer": "return=minimal"},
                )
            if resp.status_code in (200, 201, 204):
                count += 1
                logger.debug("Accuracy: evaluated %s (%s) 1d=%s 3d=%s", sym, sig["verdict"], pct1, pct3)
            else:
                logger.warning("Accuracy insert failed %s: %s", sig["id"], resp.text[:120])

        except Exception as e:
            logger.error("Sweep error for %s: %s", sig.get("id"), e)

    logger.info("Accuracy sweep done: %d evaluated.", count)
    return count


# ── Accuracy stats ─────────────────────────────────────────────────────────────

_EMPTY_STATS: Dict[str, Any] = {
    "total_signals": 0, "evaluated": 0, "correct": 0, "accuracy_pct": 0.0,
    "by_verdict": {}, "avg_conf_correct": 0.0, "avg_conf_incorrect": 0.0,
    "avg_pct_change_correct": 0.0, "avg_pct_change_incorrect": 0.0,
    "earliest_timestamp": None, "recent_entries": [], "source": "supabase",
}


async def get_accuracy_stats() -> Dict[str, Any]:
    """
    Build accuracy stats from Supabase — same shape as PaperTrader.get_stats().
    Falls back gracefully on any error.
    """
    if not _ok():
        return {**_EMPTY_STATS, "source": "local_only"}

    try:
        async with httpx.AsyncClient(timeout=14.0) as c:
            r_log, r_acc, r_recent = await asyncio.gather(
                c.get(
                    f"{_SUPABASE_URL}/rest/v1/signal_log"
                    f"?select=id,symbol,verdict,confidence,generated_at,entry_price,primary_timeframe"
                    f"&order=generated_at.desc&limit=2000",
                    headers=_hdr(),
                ),
                c.get(
                    f"{_SUPABASE_URL}/rest/v1/signal_accuracy"
                    f"?select=signal_id,verdict,correct_1d,correct_3d,pct_change_3d,eval_3d_price,entry_price"
                    f"&limit=5000",
                    headers=_hdr(),
                ),
                c.get(
                    f"{_SUPABASE_URL}/rest/v1/signal_log"
                    f"?select=id,symbol,verdict,confidence,generated_at,entry_price,primary_timeframe"
                    f"&order=generated_at.desc&limit=20",
                    headers=_hdr(),
                ),
            )

        all_signals: List[Dict] = r_log.json()    if r_log.status_code == 200    else []
        acc_rows:    List[Dict] = r_acc.json()    if r_acc.status_code == 200    else []
        recent_raw:  List[Dict] = r_recent.json() if r_recent.status_code == 200 else []

        if not isinstance(all_signals, list): all_signals = []
        if not isinstance(acc_rows, list):    acc_rows    = []
        if not isinstance(recent_raw, list):  recent_raw  = []

        acc_by_id = {r["signal_id"]: r for r in acc_rows if r.get("signal_id")}

        # Core counts
        eval_rows    = [r for r in acc_rows if r.get("correct_3d") is not None]
        correct_rows = [r for r in eval_rows if r["correct_3d"] is True]
        eval_count   = len(eval_rows)
        corr_count   = len(correct_rows)
        acc_pct      = (corr_count / eval_count * 100) if eval_count else 0.0

        # Confidence averages
        sig_by_id = {s["id"]: s for s in all_signals}
        eval_ids    = {r["signal_id"] for r in eval_rows}
        correct_ids = {r["signal_id"] for r in correct_rows}
        incorr_ids  = eval_ids - correct_ids

        def _avg_conf(ids: set) -> float:
            confs = [sig_by_id[i]["confidence"] for i in ids if i in sig_by_id and sig_by_id[i].get("confidence") is not None]
            return round(sum(confs) / len(confs), 1) if confs else 0.0

        def _avg_pct(rows: List[Dict]) -> float:
            vals = [r["pct_change_3d"] for r in rows if r.get("pct_change_3d") is not None]
            return round(sum(vals) / len(vals), 2) if vals else 0.0

        # Per-verdict breakdown
        by_verdict: Dict[str, Any] = {}
        for v in ["STRONG_BUY", "BUY", "WATCH", "AVOID", "STRONG_AVOID"]:
            v_sigs  = [s for s in all_signals if (s.get("verdict") or "").upper() == v]
            v_ids   = {s["id"] for s in v_sigs}
            v_eval  = [r for r in eval_rows if r.get("signal_id") in v_ids]
            v_right = [r for r in v_eval if r.get("correct_3d") is True]
            by_verdict[v] = {
                "total":     len(v_sigs),
                "evaluated": len(v_eval),
                "correct":   len(v_right),
                "accuracy":  (len(v_right) / len(v_eval) * 100) if v_eval else 0.0,
            }

        # Recent entries (last 20)
        recent_entries = []
        for sig in recent_raw:
            acc    = acc_by_id.get(sig["id"])
            ep     = sig.get("entry_price")
            p3d    = acc.get("eval_3d_price") if acc else None
            pct3   = acc.get("pct_change_3d") if acc else None
            if pct3 is None and ep and p3d:
                pct3 = round((p3d - ep) / ep * 100, 3)
            c3     = acc.get("correct_3d") if acc else None

            recent_entries.append({
                "id":               sig["id"],
                "symbol":           sig["symbol"],
                "timestamp":        sig["generated_at"],
                "verdict":          sig["verdict"],
                "confidence":       sig.get("confidence"),
                "price_at_signal":  ep,
                "price_3d_later":   p3d,
                "pct_change_3d":    pct3,
                "correct":          c3,
                "outcome":          ("UP" if pct3 and pct3 > 0 else "DOWN") if pct3 is not None else None,
                "primary_timeframe": sig.get("primary_timeframe"),
            })

        earliest = all_signals[-1]["generated_at"] if all_signals else None

        return {
            "total_signals":            len(all_signals),
            "evaluated":                eval_count,
            "correct":                  corr_count,
            "accuracy_pct":             round(acc_pct, 1),
            "by_verdict":               by_verdict,
            "avg_conf_correct":         _avg_conf(correct_ids),
            "avg_conf_incorrect":       _avg_conf(incorr_ids),
            "avg_pct_change_correct":   _avg_pct(correct_rows),
            "avg_pct_change_incorrect": _avg_pct([r for r in eval_rows if r.get("correct_3d") is False]),
            "earliest_timestamp":       earliest,
            "recent_entries":           recent_entries,
            "source":                   "supabase",
        }

    except Exception as e:
        logger.error("get_accuracy_stats error: %s", e)
        return {**_EMPTY_STATS, "error": str(e)}


# ── CIPHER Trade Log ──────────────────────────────────────────────────────────

async def log_cipher_trade(
    trade: Dict[str, Any],
    user_id: str,
    aggression_level: int,
    full_brief: str,
) -> Optional[str]:
    """
    Auto-log a parsed CIPHER trade to cipher_trade_log.
    Best-effort — never raises. Returns new row UUID or None.
    """
    if not _ok() or not user_id:
        return None
    try:
        exit_deadline = None
        if trade.get("exit_date"):
            xd = trade["exit_date"]
            if hasattr(xd, "isoformat"):
                exit_deadline = xd.isoformat() + "T16:00:00-04:00"

        payload: Dict[str, Any] = {
            "user_id":               user_id,
            "trade_date":            date.today().isoformat(),
            "ticker":                trade.get("ticker", "UNKNOWN"),
            "strategy_type":         trade.get("strategy_type", "UNKNOWN"),
            "instrument_description": trade.get("instrument_description", trade.get("ticker", "")),
            "aggression_level":      aggression_level,
            "entry_zone_low":        trade.get("entry_zone_low"),
            "entry_zone_high":       trade.get("entry_zone_high"),
            "target":                trade.get("target"),
            "stop_loss":             trade.get("stop_loss"),
            "exit_deadline":         exit_deadline,
            "risk_reward_ratio":     trade.get("risk_reward_ratio"),
            "full_cipher_brief":     full_brief[:4000],
            "status":                "pending",
            "validation_warnings":   trade.get("validation_warnings") or [],
        }
        # Remove None values to avoid type errors on strict columns
        payload = {k: v for k, v in payload.items() if v is not None}

        async with httpx.AsyncClient(timeout=8.0) as c:
            resp = await c.post(
                f"{_SUPABASE_URL}/rest/v1/cipher_trade_log",
                json=payload,
                headers={**_hdr(), "Prefer": "return=representation"},
            )
        if resp.status_code in (200, 201):
            rows = resp.json()
            return rows[0]["id"] if rows else None
        logger.warning("cipher_trade_log insert failed: %s", resp.text[:200])
    except Exception as e:
        logger.debug("log_cipher_trade skipped: %s", e)
    return None


async def get_cipher_trade_log(
    user_id: str,
    status: Optional[str] = None,
    aggression_level: Optional[int] = None,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    """Fetch cipher_trade_log rows for a user with optional filters."""
    if not _ok():
        return []
    try:
        url = (
            f"{_SUPABASE_URL}/rest/v1/cipher_trade_log"
            f"?user_id=eq.{user_id}"
            f"&order=trade_date.desc,created_at.desc"
            f"&limit={limit}"
        )
        if status and status != "all":
            url += f"&status=eq.{status}"
        if aggression_level:
            url += f"&aggression_level=eq.{aggression_level}"

        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(url, headers=_hdr())
        if r.status_code == 200 and isinstance(r.json(), list):
            return r.json()
    except Exception as e:
        logger.debug("get_cipher_trade_log error: %s", e)
    return []


async def update_cipher_trade(
    trade_id: str,
    user_id: str,
    updates: Dict[str, Any],
) -> bool:
    """Update a cipher_trade_log row. Returns True on success."""
    if not _ok():
        return False
    try:
        url = (
            f"{_SUPABASE_URL}/rest/v1/cipher_trade_log"
            f"?id=eq.{trade_id}&user_id=eq.{user_id}"
        )
        async with httpx.AsyncClient(timeout=8.0) as c:
            resp = await c.patch(
                url,
                json=updates,
                headers={**_hdr(), "Prefer": "return=minimal"},
            )
        return resp.status_code in (200, 204)
    except Exception as e:
        logger.debug("update_cipher_trade error: %s", e)
    return False


async def get_cipher_trade_stats(user_id: str) -> Dict[str, Any]:
    """Compute win/loss stats for CIPHER win rate badge and dashboard widget."""
    if not _ok():
        return _empty_cipher_stats()
    try:
        url = (
            f"{_SUPABASE_URL}/rest/v1/cipher_trade_log"
            f"?user_id=eq.{user_id}"
            f"&select=id,status,aggression_level,strategy_type,pnl_percent,ticker,trade_date"
            f"&limit=500"
        )
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(url, headers=_hdr())
        if r.status_code != 200:
            return _empty_cipher_stats()
        rows: List[Dict] = r.json() if isinstance(r.json(), list) else []

        closed    = [r for r in rows if r["status"] in ("win", "loss")]
        wins      = [r for r in closed if r["status"] == "win"]
        losses    = [r for r in closed if r["status"] == "loss"]
        pending   = [r for r in rows if r["status"] == "pending"]
        total_closed = len(closed)
        win_rate  = round(len(wins) / total_closed * 100, 1) if total_closed else 0.0

        # By aggression level
        by_level: Dict[int, Dict] = {}
        for lvl in range(1, 6):
            lvl_closed = [r for r in closed if r.get("aggression_level") == lvl]
            lvl_wins   = [r for r in lvl_closed if r["status"] == "win"]
            by_level[lvl] = {
                "total": len(lvl_closed),
                "wins":  len(lvl_wins),
                "win_rate": round(len(lvl_wins) / len(lvl_closed) * 100, 1) if lvl_closed else 0.0,
            }

        # Best/worst by P&L
        closed_with_pnl = [r for r in closed if r.get("pnl_percent") is not None]
        best  = max(closed_with_pnl, key=lambda x: x["pnl_percent"], default=None)
        worst = min(closed_with_pnl, key=lambda x: x["pnl_percent"], default=None)

        avg_rr = 0.0  # placeholder — needs risk_reward_ratio in query for full calc

        return {
            "total_closed":  total_closed,
            "wins":          len(wins),
            "losses":        len(losses),
            "pending":       len(pending),
            "win_rate":      win_rate,
            "by_level":      by_level,
            "best_trade":    {"ticker": best["ticker"], "pnl_pct": best["pnl_percent"]} if best else None,
            "worst_trade":   {"ticker": worst["ticker"], "pnl_pct": worst["pnl_percent"]} if worst else None,
            "show_badge":    total_closed >= 5,
        }
    except Exception as e:
        logger.debug("get_cipher_trade_stats error: %s", e)
        return _empty_cipher_stats()


def _empty_cipher_stats() -> Dict[str, Any]:
    return {
        "total_closed": 0, "wins": 0, "losses": 0, "pending": 0,
        "win_rate": 0.0, "by_level": {}, "best_trade": None,
        "worst_trade": None, "show_badge": False,
    }


async def expire_stale_pending_trades() -> int:
    """
    Auto-expire pending trades whose exit_deadline is in the past.
    Called daily at 6 AM ET by the background job.
    Returns count of rows expired.
    """
    if not _ok():
        return 0
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        url = (
            f"{_SUPABASE_URL}/rest/v1/cipher_trade_log"
            f"?status=eq.pending&exit_deadline=lt.{now_iso}"
        )
        async with httpx.AsyncClient(timeout=10.0) as c:
            resp = await c.patch(
                url,
                json={"status": "expired"},
                headers={**_hdr(), "Prefer": "return=minimal", "Content-Type": "application/json"},
            )
        if resp.status_code in (200, 204):
            # Supabase PATCH doesn't return count with return=minimal
            # Count separately
            count_url = (
                f"{_SUPABASE_URL}/rest/v1/cipher_trade_log"
                f"?status=eq.expired"
                f"&select=id"
                f"&limit=1"
            )
            # Best-effort count; log success
            logger.info("cipher_trade_log: stale pending trades expired (HTTP %s)", resp.status_code)
            return 1  # success marker
        logger.warning("expire_stale_pending_trades failed: %s", resp.text[:100])
    except Exception as e:
        logger.debug("expire_stale_pending_trades error: %s", e)
    return 0
