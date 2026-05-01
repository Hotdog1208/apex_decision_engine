"""
CIPHER — Apex Decision Engine's personal AI market intelligence agent.

Mission upgrades (2026-04-29):
  1. Deterministic pre-output validation gate (no LLM validator calls)
  2. Compressed system prompt + structured data injection (<400 token context)
  3. Two-step scan → analyze chain for trade questions
  4. Historical performance context injection (20+ closed trades)
"""

import json
import logging
import os
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import anthropic  # type: ignore
from market_calendar import (
    get_trading_calendar_context,
    is_valid_trading_day,
    nearest_valid_friday_expiry,
)

logger = logging.getLogger(__name__)

# ── Aggression level system ───────────────────────────────────────────────────
AGGRESSION_CONFIGS: Dict[int, Dict[str, str]] = {
    1: {
        "name": "CONSERVATIVE",
        "label": "Conservative",
        "instructions": (
            "Large-cap equities (>$10B market cap) only. No options. "
            "Defined risk, 80%+ confidence setups. Max 2% per trade."
        ),
    },
    2: {
        "name": "MODERATE",
        "label": "Moderate",
        "instructions": (
            "Mid/large-cap. Options OK with 30+ DTE; defined-risk spreads preferred. "
            "70%+ confidence. Max 3% per trade."
        ),
    },
    3: {
        "name": "BALANCED",
        "label": "Balanced",
        "instructions": (
            "Any market cap. Near-term options OK (7+ DTE). "
            "60%+ confidence. Max 4% per trade. Default operating mode."
        ),
    },
    4: {
        "name": "AGGRESSIVE",
        "label": "Aggressive",
        "instructions": (
            "All instruments including 0DTE with a defined hedge. "
            "Momentum plays and catalyst trades valid. 50%+ confidence. Max 5% per trade."
        ),
    },
    5: {
        "name": "APEX",
        "label": "Apex",
        "instructions": (
            "No confidence floor. All instruments — 0DTE, leveraged ETFs, futures. "
            "Pure edge-seeking. User manages their own risk."
        ),
    },
}

# ── Compressed CIPHER master prompt (~650 tokens) ────────────────────────────
CIPHER_MASTER_SYSTEM_PROMPT = """You are CIPHER, ADE's quantitative trading analyst. Produce institutional-grade trade briefs with exact entry/exit/stop levels and full thesis. No filler, no hedging, no vague language.

HARD RULES — NEVER VIOLATE:
R1. Options timing: Always specify PRE-PRINT or POST-CRUSH explicitly. Pre-print exit = before earnings close. Post-print exit = after IV crush settles (next morning open). Never leave this ambiguous.
R2. Merger arb minimum hold: 30 days. Never apply a week-long exit to a merger arb. State spread-to-close thesis.
R3. Iron condor R/R: Max profit = premium collected. Max loss = (spread width × 100) − premium. Always calculate and state both. Typical R/R is 0.3:1 to 1:1 — never invent a ratio above 2:1.
R4. Your output is parsed by code before reaching the user. Expiry/exit date contradictions and inverted R/R will be caught and sent back for correction. Build clean output the first time.
R5. Strategy type declaration: Every trade must begin TRADE [N]: [TICKER] — [STRATEGY_TYPE] where STRATEGY_TYPE is exactly one of: EARNINGS_PRE_PRINT | EARNINGS_POST_CRUSH | MERGER_ARB | TECHNICAL_BREAKOUT | MOMENTUM | MEAN_REVERSION | VOLATILITY_SPREAD | MACRO_CATALYST
R6. Position sizing: Max 5% per trade. Options on sub-$10 stocks: max 2%. Iron condors: max 3%.
R7. Use get_stock_quote for EVERY ticker before stating any entry price. Web article prices may be hours stale.
R8. Strike selection: Directional calls/puts → delta 0.35–0.55. Breakout-only plays → delta 0.20–0.35. Never pick a strike that requires the stock to break ATH or key resistance by more than 1% to reach target. Always state DELTA_EST and PROB_PROFIT explicitly.
R9. Macro coherence: Before finalizing any trade, run 4-step second-order check: (1) Fed trajectory vs trade direction, (2) USD/sector rotation alignment, (3) earnings risk within HORIZON window, (4) VIX regime vs premium paid. If unresolved tension exists, state it in THESIS.
R10. Self-correction: If you detect a logical error mid-response, silently fix it. No footnote corrections, no "actually" revisions after completing a card. Regenerate cleanly.
R11. Horizon match: EARNINGS_PRE_PRINT → exit before print, never on expiry day. EARNINGS_POST_CRUSH → next morning open after print. MERGER_ARB → 30+ days, state spread-to-close. TECHNICAL_BREAKOUT → 5–15 day hold, specific date. MOMENTUM → 1–5 days, time-of-day exit. MEAN_REVERSION → hold to target OR stop, 3–10 days. VOLATILITY_SPREAD → hold to expiry or 50% max profit.

AGGRESSION_LEVEL: {AGGRESSION_LEVEL} — {AGGRESSION_NAME}
RULES: {AGGRESSION_INSTRUCTIONS}

MARKET_CONTEXT:
{MARKET_CONTEXT}

PERFORMANCE_CONTEXT:
{PERFORMANCE_CONTEXT}

OUTPUT FORMAT — use exactly this structure for every trade:
---
TRADE [N]: [TICKER] — [STRATEGY_TYPE]
INSTRUMENT: [exact ticker, or full option: TICKER $STRIKE MON DD YYYY CALL/PUT]
CURRENT_PRICE: $X.XX
ENTRY: $X.XX–$X.XX [one-line rationale]
TARGET: $X.XX [why this level]
STOP: $X.XX [what breaks the thesis]
HORIZON: [specific date and time, e.g. "Close by Fri May 2 4PM ET" — always include PRE/POST-PRINT if options]
RR: X:1 [verified math — show max profit and max loss for spreads]
MAX_LOSS_PER_CONTRACT: $X [options/spreads only]
DELTA_EST: X.XX [option delta at entry strike; N/A for stocks]
PROB_PROFIT: XX% [estimated probability of reaching target]
THESIS: [3–4 sentences. Lead with the catalyst. Include specific numbers from context.]
KILLS: [one specific scenario that invalidates the thesis]
CONFIRMS: [one price action signal that says thesis is intact]
---

Use the trade format for: stock picks, options trades, catalyst plays, merger arb, momentum setups.
For non-trade questions: natural prose, direct and specific, no rigid format needed.

*This is intelligence, not advice. Trade responsibly.*"""

# ── Brief prompt (daily summary, no trade cards) ─────────────────────────────
CIPHER_SYSTEM_PROMPT = """You are CIPHER — the personal market intelligence agent for Apex Decision Engine.

Identity: You are the user's dedicated desk analyst. Sharp, specific, no filler. Confident, occasionally dry.

Brief structure (markdown headers, in order):
## Market Pulse
One sharp sentence on macro regime right now.

## Your Watchlist
For each symbol: verdict (STRONG_BUY/BUY/WATCH/AVOID/STRONG_AVOID), one conviction sentence, most important number. 2–3 lines max per symbol.

## The Edge
Highest-conviction idea from today's data. Lead with the number that matters. One paragraph.

## Heads Up
One specific tail risk or catalyst. Not "watch macro" — give the actual thing.

## —
One sentence close in CIPHER's voice. Then: *This is intelligence, not advice. Trade responsibly.*

Rules: Clean markdown. Specific numbers over adjectives. "RSI at 28" beats "oversold." No invented conviction."""


# ── Month map for date parsing ────────────────────────────────────────────────
_MONTH_MAP: Dict[str, int] = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}

_TRADE_KEYWORDS = re.compile(
    r'\b(trade|setup|buy|sell|option|call|put|short|long|play|recommend|idea|'
    r'catalyst|earnings|breakout|momentum|condor|spread|arb|arbitrage)\b',
    re.IGNORECASE,
)

# ── FOMC schedule 2026 (hard-coded, update annually) ─────────────────────────
_FOMC_2026 = [
    date(2026, 1, 29), date(2026, 3, 19), date(2026, 5, 7),  date(2026, 6, 18),
    date(2026, 7, 30), date(2026, 9, 17), date(2026, 10, 29), date(2026, 12, 10),
]
_FED_FUNDS_RATE = "4.50%"


def _get_next_fomc() -> str:
    today = date.today()
    upcoming = [d for d in _FOMC_2026 if d >= today]
    if not upcoming:
        return f"FED: Rate={_FED_FUNDS_RATE} | No more 2026 FOMC meetings"
    nxt = upcoming[0]
    return f"FED: Next FOMC {nxt.strftime('%b %d')} ({(nxt - today).days}d away) | Rate={_FED_FUNDS_RATE}"


def _get_finnhub_earnings(today_str: str, tomorrow_str: str) -> List[str]:
    """Fetch AH-today and BMO-tomorrow earnings from Finnhub. Best-effort, 2s timeout."""
    token = os.environ.get("FINNHUB_API_KEY", "")
    if not token:
        return []
    try:
        import httpx  # type: ignore
        url = (
            f"https://finnhub.io/api/v1/calendar/earnings"
            f"?from={today_str}&to={tomorrow_str}&token={token}"
        )
        r = httpx.get(url, timeout=2.0)
        if r.status_code != 200:
            return []
        cal = r.json().get("earningsCalendar", [])
        ah  = [e["symbol"] for e in cal if e.get("date") == today_str    and "amc" in (e.get("hour") or "")]
        bmo = [e["symbol"] for e in cal if e.get("date") == tomorrow_str and "bmo" in (e.get("hour") or "")]
        result = []
        if ah:
            result.append(f"EARNINGS_AH_TODAY: {', '.join(ah[:8])}")
        if bmo:
            result.append(f"EARNINGS_BMO_TOMORROW: {', '.join(bmo[:8])}")
        return result
    except Exception:
        return []


# ── Date / float helpers ──────────────────────────────────────────────────────

def _parse_date_from_text(s: str) -> Optional[date]:
    """Parse a date from various text formats used in CIPHER output."""
    if not s:
        return None
    u = s.strip().upper()
    # "APR 30 2026", "APR 30" — month name format
    m = re.search(
        r'(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})(?:[,\s]+(\d{4}))?', u
    )
    if m:
        try:
            mon = _MONTH_MAP[m.group(1)]
            day = int(m.group(2))
            yr  = int(m.group(3)) if m.group(3) else date.today().year
            return date(yr, mon, day)
        except (ValueError, KeyError):
            pass
    # "04/30/2026"
    m2 = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', u)
    if m2:
        try:
            return date(int(m2.group(3)), int(m2.group(1)), int(m2.group(2)))
        except ValueError:
            pass
    # "2026-04-30"
    m3 = re.search(r'(\d{4})-(\d{2})-(\d{2})', u)
    if m3:
        try:
            return date(int(m3.group(1)), int(m3.group(2)), int(m3.group(3)))
        except ValueError:
            pass
    return None


def _parse_float(s: str) -> Optional[float]:
    if not s:
        return None
    cleaned = re.sub(r'[,$\s]', '', s)
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


# ── MISSION 1: Parse + Validate ───────────────────────────────────────────────

def parse_cipher_output(raw_text: str) -> List[Dict[str, Any]]:
    """
    Parse CIPHER's structured output into trade objects using regex.
    Deterministic, zero-token. Returns list of trade dicts.
    Handles both new plain format (TRADE N: ...) and legacy ═══ delimited.
    """
    trades: List[Dict[str, Any]] = []

    # Split on trade headers — works for both old and new format
    blocks = re.split(r'(?=TRADE\s+\d+\s*:)', raw_text, flags=re.IGNORECASE)

    for block in blocks:
        block = block.strip()
        if not re.match(r'TRADE\s+\d+\s*:', block, re.IGNORECASE):
            continue

        trade: Dict[str, Any] = {}

        # Header: TRADE N: TICKER — STRATEGY_TYPE
        hdr = re.match(r'TRADE\s+(\d+)\s*:\s*([A-Z0-9.\-]+)\s*[—–\-]+\s*(.+?)(?:\n|$)', block, re.IGNORECASE)
        if not hdr:
            continue
        trade["trade_num"]     = int(hdr.group(1))
        trade["ticker"]        = hdr.group(2).strip().upper()
        strategy_raw           = hdr.group(3).strip().upper()
        # Take first token as strategy type (strip decorative chars)
        trade["strategy_type"] = re.split(r'[\s─━═]', strategy_raw)[0]
        trade["_raw_block"]    = block

        # INSTRUMENT
        instr_m = re.search(r'INSTRUMENT\s*[:\|▸]?\s*(.+?)(?:\n|$)', block, re.IGNORECASE)
        if instr_m:
            instr = instr_m.group(1).strip()
            trade["instrument_description"] = instr
            instr_up = instr.upper()
            if re.search(r'\b(CALL|PUT)\b', instr_up):
                trade["instrument_type"] = "option"
                if "CONDOR" in instr_up or re.search(r'\$[\d.]+/\$?[\d.]+/\$?[\d.]+', instr):
                    trade["instrument_type"] = "spread"
                    trade["strategy_type"]   = "IRON_CONDOR"
                    strikes = [_parse_float(x) for x in re.findall(r'\$?([\d.]+)', instr) if _parse_float(x)]
                    if len(strikes) >= 4:
                        s_sorted = sorted(strikes[:4])
                        trade["spread_width"] = round(s_sorted[1] - s_sorted[0], 2)
                exp = _parse_date_from_text(instr)
                if exp:
                    trade["expiry_date"] = exp
            else:
                trade["instrument_type"] = "stock"

        # CURRENT_PRICE
        cp_m = re.search(r'CURRENT.PRICE\s*[:\|▸]?\s*\$?([\d,.]+)', block, re.IGNORECASE)
        if cp_m:
            trade["current_price"] = _parse_float(cp_m.group(1))

        # ENTRY (zone or single)
        ez_m = re.search(
            r'ENTRY(?:\s+ZONE)?\s*[:\|▸]?\s*\$?([\d,.]+)\s*[–—\-]+\s*\$?([\d,.]+)',
            block, re.IGNORECASE,
        )
        if ez_m:
            lo = _parse_float(ez_m.group(1))
            hi = _parse_float(ez_m.group(2))
            trade["entry_zone_low"]  = lo
            trade["entry_zone_high"] = hi
            trade["entry_midpoint"]  = round((lo + hi) / 2, 4) if lo and hi else lo or hi
        else:
            es_m = re.search(r'ENTRY(?:\s+ZONE)?\s*[:\|▸]?\s*\$?([\d,.]+)', block, re.IGNORECASE)
            if es_m:
                ep = _parse_float(es_m.group(1))
                trade["entry_zone_low"] = trade["entry_zone_high"] = trade["entry_midpoint"] = ep

        # TARGET
        tgt_m = re.search(r'TARGET\s*[:\|▸]?\s*\$?([\d,.]+)', block, re.IGNORECASE)
        if tgt_m:
            trade["target"] = _parse_float(tgt_m.group(1))

        # STOP / STOP-LOSS
        sl_m = re.search(r'STOP(?:-?LOSS)?\s*[:\|▸]?\s*\$?([\d,.]+)', block, re.IGNORECASE)
        if sl_m:
            trade["stop_loss"] = _parse_float(sl_m.group(1))

        # HORIZON — extract exit date and detect pre-print
        hz_m = re.search(r'(?:TIME\s+)?HORIZON\s*[:\|▸]?\s*(.+?)(?:\n|$)', block, re.IGNORECASE)
        if hz_m:
            htxt = hz_m.group(1).strip()
            trade["horizon_text"] = htxt
            xd = _parse_date_from_text(htxt)
            if xd:
                trade["exit_date"] = xd
                trade["hold_days"] = (xd - date.today()).days
            if re.search(r'PRE.PRINT|PRE.EARNINGS|BEFORE\s+EARN', htxt.upper()):
                trade["strategy_subtype"] = "earnings_pre_print"

        # Also check STRATEGY_TYPE for pre-print
        if trade["strategy_type"] in ("EARNINGS_PRE_PRINT",):
            trade["strategy_subtype"] = "earnings_pre_print"

        # RISK/REWARD
        rr_m = re.search(r'(?:RISK/?REWARD|RR)\s*[:\|▸]?\s*([\d.]+)\s*:?\s*1', block, re.IGNORECASE)
        if rr_m:
            trade["risk_reward_ratio"] = _parse_float(rr_m.group(1))

        # MAX_LOSS_PER_CONTRACT
        ml_m = re.search(r'MAX.LOSS.PER.CONTRACT\s*[:\|▸]?\s*\$?([\d,.]+)', block, re.IGNORECASE)
        if ml_m:
            trade["max_loss_per_contract"] = _parse_float(ml_m.group(1))

        # DELTA_EST
        de_m = re.search(r'DELTA.EST\s*[:\|▸]?\s*([0-9.]+|N/A)', block, re.IGNORECASE)
        if de_m:
            val = de_m.group(1).strip()
            trade["delta_est"] = None if val.upper() == "N/A" else _parse_float(val)

        # PROB_PROFIT
        pp_m = re.search(r'PROB.PROFIT\s*[:\|▸]?\s*([0-9.]+)\s*%?', block, re.IGNORECASE)
        if pp_m:
            trade["prob_profit"] = _parse_float(pp_m.group(1))

        trades.append(trade)

    return trades


def validate_cipher_trade(trade: Dict[str, Any]) -> List[str]:
    """
    Deterministic validation of a parsed trade dict.
    Returns list of error strings. Empty list = valid.
    Zero token cost — pure Python logic.
    """
    errors: List[str] = []
    today = date.today()

    # Rule 1: Options expiry vs exit date consistency
    if trade.get("instrument_type") in ("option", "spread"):
        expiry = trade.get("expiry_date")
        exit_d = trade.get("exit_date")
        if expiry and exit_d:
            if exit_d > expiry:
                errors.append(
                    f"EXIT_AFTER_EXPIRY: Exit date {exit_d} is after option expiry {expiry}. "
                    f"Fix exit to be on or before expiry date."
                )
            if exit_d == expiry and trade.get("strategy_subtype") == "earnings_pre_print":
                errors.append(
                    "PRE_PRINT_EXIT: This is a pre-earnings play. "
                    "Exit must be BEFORE the earnings print, not on expiry day. "
                    "Adjust the exit deadline."
                )

    # Rule 2: Iron condor R/R sanity
    if trade.get("strategy_type") == "IRON_CONDOR":
        rr = trade.get("risk_reward_ratio")
        if rr and rr > 2.0:
            errors.append(
                f"RR_MATH_ERROR: Iron condor R/R of {rr}:1 is implausible. "
                f"Iron condors collect premium < spread width, giving R/R of 0.3:1–1:1. "
                f"Recalculate: state max_profit (premium collected) and max_loss "
                f"((spread_width × 100) − premium)."
            )

    # Rule 3: Merger arb minimum hold
    strat = (trade.get("strategy_type") or "").upper()
    if "MERGER" in strat or strat == "MERGER_ARB":
        hold = trade.get("hold_days")
        if hold is not None and hold < 30:
            errors.append(
                f"MERGER_ARB_TOO_SHORT: Merger arb with {hold}-day exit. "
                f"Deal close is months away — minimum 30-day horizon required. "
                f"State the spread-to-close thesis explicitly."
            )

    # Rule 4: Inverted R/R (stop wider than target)
    entry  = trade.get("entry_midpoint")
    target = trade.get("target")
    stop   = trade.get("stop_loss")
    if entry and target and stop:
        reward = abs(target - entry)
        risk   = abs(entry - stop)
        if risk > 0 and reward > 0 and risk > reward * 1.1:
            errors.append(
                f"INVERTED_RR: Risk (${risk:.2f}) is larger than reward (${reward:.2f}). "
                f"R/R is less than 1:1. Reconsider entry, target, or stop."
            )

    # Rule 5: Options expiry must be a valid trading Friday
    if trade.get("instrument_type") in ("option", "spread"):
        expiry = trade.get("expiry_date")
        if expiry:
            if expiry.weekday() != 4 or not is_valid_trading_day(expiry):
                nearest = nearest_valid_friday_expiry(expiry)
                errors.append(
                    f"INVALID_EXPIRY: {expiry.strftime('%a %b %d %Y')} is not a valid options expiry. "
                    f"Options expire on valid trading Fridays only. "
                    f"Nearest valid expiry: {nearest.strftime('%a %b %d %Y')}."
                )

    return errors


def _inject_validation_warnings(block: str, errors: List[str]) -> str:
    """Append a visible warning block to a failing trade card."""
    warn_lines = "\n".join(f"  • {e}" for e in errors)
    return block.rstrip() + f"\n\n⚠ VALIDATION WARNINGS:\n{warn_lines}\n"


def _split_response_into_sections(text: str) -> Tuple[str, List[str], str]:
    """
    Split CIPHER response into: preamble, [trade blocks], postamble.
    Trade blocks start with 'TRADE N:'.
    """
    # Find all trade block positions
    matches = list(re.finditer(r'(?:^|\n)(---\n)?(TRADE\s+\d+\s*:)', text, re.IGNORECASE))
    if not matches:
        return text, [], ""

    preamble = text[: matches[0].start()].strip()
    trade_blocks: List[str] = []

    for i, m in enumerate(matches):
        start = m.start()
        end   = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        trade_blocks.append(text[start:end].strip())

    postamble = ""
    # If last "trade block" ends with non-trade text (e.g. italic disclaimer), strip it
    if trade_blocks:
        last = trade_blocks[-1]
        disc_m = re.search(r'\n\*This is intelligence.*$', last, re.IGNORECASE | re.DOTALL)
        if disc_m:
            postamble = disc_m.group(0).strip()
            trade_blocks[-1] = last[: disc_m.start()].strip()

    return preamble, trade_blocks, postamble


# ── MISSION 3: Compact market context builder ─────────────────────────────────

def build_cipher_context(symbols: Optional[List[str]] = None) -> str:
    """
    Build a compact market context string under 400 tokens.
    Replaces verbose prose context injection.
    """
    try:
        import yfinance as yf  # type: ignore

        # ET offset: UTC-4 (EDT) or UTC-5 (EST)
        now_utc  = datetime.now(timezone.utc)
        et_offset = -4 if (3 <= now_utc.month <= 11) else -5
        now_et   = now_utc + timedelta(hours=et_offset)
        ts_str   = now_et.strftime("%m/%d %H:%M ET")

        # Session detection
        hour = now_et.hour
        minute = now_et.minute
        is_regular = (hour == 9 and minute >= 30) or (10 <= hour < 16)
        is_pre = (4 <= hour < 9) or (hour == 9 and minute < 30)
        session = "REGULAR" if is_regular else ("PRE" if is_pre else "AFTER/CLOSED")

        # Macro snapshot
        macro_map = {"SPY": "SPY", "QQQ": "QQQ", "VIX": "^VIX", "DXY": "DX-Y.NYB", "10Y": "^TNX", "OIL": "CL=F"}
        macro: Dict[str, Dict] = {}
        for label, sym in macro_map.items():
            try:
                info  = yf.Ticker(sym).fast_info
                price = float(info.last_price)
                prev  = float(getattr(info, "previous_close", None) or price)
                chg   = round((price - prev) / prev * 100, 2) if prev else 0.0
                macro[label] = {"p": price, "c": chg}
            except Exception:
                macro[label] = {"p": 0, "c": 0}

        def _fmt(label: str) -> str:
            d = macro.get(label, {"p": 0, "c": 0})
            return f"{label}:{d['p']:.2f}({d['c']:+.1f}%)"

        lines = [
            f"MARKET_SNAPSHOT [{ts_str}]",
            f"{_fmt('SPY')} {_fmt('QQQ')} {_fmt('VIX')} DXY:{macro.get('DXY',{}).get('p',0):.2f} 10Y:{macro.get('10Y',{}).get('p',0):.2f}%",
            f"SESSION:{session} OIL:{macro.get('OIL',{}).get('p',0):.2f}({'↑' if macro.get('OIL',{}).get('c',0)>0 else '↓'}{abs(macro.get('OIL',{}).get('c',0)):.1f}%)",
            _get_next_fomc(),
        ]

        # Finnhub earnings (best-effort, 2s timeout)
        today_str    = now_et.strftime("%Y-%m-%d")
        tomorrow_str = (now_et + timedelta(days=1)).strftime("%Y-%m-%d")
        lines.extend(_get_finnhub_earnings(today_str, tomorrow_str))

        # Per-symbol compact data
        if symbols:
            for sym in symbols[:5]:
                try:
                    t = yf.Ticker(sym)
                    fi = t.fast_info
                    price = float(fi.last_price)
                    prev  = float(getattr(fi, "previous_close", None) or price)
                    chg   = round((price - prev) / prev * 100, 2) if prev else 0.0

                    # RSI-14 approximation
                    hist = t.history(period="1mo", interval="1d")
                    rsi = 50
                    if len(hist) >= 15:
                        delta = hist["Close"].diff().dropna()
                        gain = delta.clip(lower=0).rolling(14).mean().iloc[-1]
                        loss = (-delta.clip(upper=0)).rolling(14).mean().iloc[-1]
                        if loss > 0:
                            rsi = round(100 - 100 / (1 + gain / loss), 0)

                    # Volume ratio
                    vol_ratio = 1.0
                    if "Volume" in hist.columns and len(hist) >= 20:
                        avg_vol = hist["Volume"].rolling(20).mean().iloc[-1]
                        last_vol = hist["Volume"].iloc[-1]
                        vol_ratio = round(last_vol / avg_vol, 1) if avg_vol > 0 else 1.0

                    # ATH proximity
                    year_high = float(getattr(fi, "year_high", 0) or 0)
                    ath_label = ""
                    if year_high > 0:
                        ath_pct = round((price - year_high) / year_high * 100, 1)
                        ath_label = f" ATH:{year_high:.2f}({ath_pct:+.1f}%)"

                    lines.append(f"{sym}:${price:.2f}({chg:+.1f}%) RSI:{rsi:.0f} VOL:{vol_ratio:.1f}x{ath_label}")
                except Exception:
                    lines.append(f"{sym}: N/A")

        # Prepend calendar context so CIPHER always knows valid expiry dates
        cal_ctx = get_trading_calendar_context()
        return cal_ctx + "\n" + "\n".join(lines)

    except Exception as exc:
        logger.warning("build_cipher_context failed: %s", exc)
        return "Market context unavailable"


def build_macro_context() -> str:
    """Legacy compatibility — calls build_cipher_context with no symbols."""
    return build_cipher_context()


# ── Performance context injection (Mission 3.4) ───────────────────────────────

async def build_performance_context(user_id: str, supabase_url: str, service_key: str) -> str:
    """
    Inject compact CIPHER win-rate context into the prompt once 20+ closed trades exist.
    Returns empty string if insufficient data.
    """
    if not supabase_url or not service_key or not user_id:
        return ""
    try:
        import httpx  # type: ignore
        hdrs = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
        }
        url = (
            f"{supabase_url}/rest/v1/cipher_trade_log"
            f"?user_id=eq.{user_id}"
            f"&status=in.(win,loss)"
            f"&select=status,strategy_type,pnl_percent,aggression_level"
            f"&limit=200"
        )
        async with httpx.AsyncClient(timeout=6.0) as c:
            r = await c.get(url, headers=hdrs)
        if r.status_code != 200:
            return ""
        rows = r.json()
        if not isinstance(rows, list) or len(rows) < 20:
            return ""

        wins   = [r for r in rows if r["status"] == "win"]
        losses = [r for r in rows if r["status"] == "loss"]
        total  = len(wins) + len(losses)
        if total == 0:
            return ""

        wr = round(len(wins) / total * 100, 0)

        # By strategy type
        strat_stats: Dict[str, Dict[str, int]] = {}
        for row in rows:
            st = row.get("strategy_type", "UNKNOWN")
            if st not in strat_stats:
                strat_stats[st] = {"w": 0, "l": 0}
            if row["status"] == "win":
                strat_stats[st]["w"] += 1
            else:
                strat_stats[st]["l"] += 1

        strat_lines = []
        for st, d in sorted(strat_stats.items(), key=lambda x: x[1]["w"] + x[1]["l"], reverse=True)[:4]:
            tot = d["w"] + d["l"]
            if tot >= 3:
                wr_st = round(d["w"] / tot * 100, 0)
                strat_lines.append(f"{st}={wr_st:.0f}%({tot})")

        return (
            f"CIPHER_PERF ({total} closed): WinRate={wr:.0f}% | "
            f"By strategy: {', '.join(strat_lines) or 'insufficient data'}"
        )
    except Exception as exc:
        logger.debug("build_performance_context failed: %s", exc)
        return ""


# ── CIPHER brief ──────────────────────────────────────────────────────────────

def _compact_signal(sig: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "sym":   sig.get("symbol"),
        "v":     sig.get("verdict"),
        "c":     sig.get("confidence"),
        "p":     sig.get("price"),
        "tf":    sig.get("timeframe_label") or sig.get("timeframe"),
        "lead":  sig.get("lead_signal"),
        "bull":  sig.get("bull_case"),
        "bear":  sig.get("bear_case"),
        "uoa":   sig.get("uoa_note"),
    }


async def generate_brief(
    user_email: str,
    user_id: str,
    preferences: Dict[str, Any],
    signals: List[Dict[str, Any]],
    regime: Dict[str, Any],
) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return "_CIPHER offline — ANTHROPIC_API_KEY not configured._"

    client = anthropic.Anthropic(api_key=api_key)
    model  = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    watchlist       = preferences.get("watchlist", [])
    alert_types     = preferences.get("alert_types", [])
    compact_signals = [_compact_signal(s) for s in signals]

    ctx_parts = [
        f"Watchlist: {', '.join(watchlist) if watchlist else 'not configured'}",
        f"Alert focus: {', '.join(alert_types) if alert_types else 'general'}",
        f"Macro regime: {regime.get('regime', 'NEUTRAL')} | SPY vs 200MA: {regime.get('spy_vs_200ma', 0):+.1f}% | VIX: {regime.get('vix_level', 'NORMAL')}",
        f"Signals: {json.dumps(compact_signals, separators=(',', ':'))}",
    ]

    try:
        response = client.messages.create(
            model=model,
            max_tokens=900,
            system=[{"type": "text", "text": CIPHER_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": f"Generate my brief.\n\n{chr(10).join(ctx_parts)}"}],
        )
        return response.content[0].text
    except Exception as e:
        logger.error("CIPHER brief generation failed: %s", e)
        raise


# ── Tool helpers ──────────────────────────────────────────────────────────────

def _fetch_quote_sync(symbol: str) -> str:
    try:
        from web.backend.app import connector as _conn  # type: ignore
        q = _conn.market_data.fetch_quote(symbol.upper().strip())
        return json.dumps(q)
    except Exception:
        try:
            import yfinance as yf  # type: ignore
            info = yf.Ticker(symbol.upper().strip()).fast_info
            prev = float(getattr(info, "previous_close", 0) or info.last_price)
            chg  = round((float(info.last_price) - prev) / prev * 100, 2) if prev else 0.0
            return json.dumps({
                "symbol":     symbol.upper(),
                "price":      round(float(info.last_price), 2),
                "change_pct": chg,
                "volume":     int(getattr(info, "three_month_average_volume", 0) or 0),
            })
        except Exception as exc2:
            return json.dumps({"error": str(exc2), "symbol": symbol})


def _extract_text(response: Any) -> str:
    return "\n".join(
        block.text for block in response.content
        if hasattr(block, "type") and block.type == "text" and getattr(block, "text", "")
    )


def _build_master_prompt(
    aggression_level: int = 3,
    market_context: str = "",
    performance_context: str = "",
) -> str:
    cfg = AGGRESSION_CONFIGS.get(aggression_level, AGGRESSION_CONFIGS[3])
    return CIPHER_MASTER_SYSTEM_PROMPT.format(
        AGGRESSION_LEVEL=aggression_level,
        AGGRESSION_NAME=cfg["name"],
        AGGRESSION_INSTRUCTIONS=cfg["instructions"],
        MARKET_CONTEXT=market_context or "Unavailable",
        PERFORMANCE_CONTEXT=performance_context or "Building track record...",
    )


# ── Tool-use loop ─────────────────────────────────────────────────────────────

def _run_tool_loop(
    client: Any,
    model: str,
    system_blocks: List[Dict],
    messages: List[Dict],
    tools: List[Dict],
    max_tokens: int = 3000,
    max_iter: int = 8,
) -> Any:
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_blocks,
        messages=messages,
        tools=tools,
    )

    for _ in range(max_iter):
        if response.stop_reason != "tool_use":
            break

        assistant_content = []
        for block in response.content:
            if hasattr(block, "model_dump"):
                assistant_content.append(block.model_dump())
            elif isinstance(block, dict):
                assistant_content.append(block)
            else:
                assistant_content.append({"type": "text", "text": str(block)})
        messages.append({"role": "assistant", "content": assistant_content})

        client_results = []
        for block in response.content:
            btype  = getattr(block, "type",  None) if not isinstance(block, dict) else block.get("type")
            bname  = getattr(block, "name",  None) if not isinstance(block, dict) else block.get("name")
            bid    = getattr(block, "id",    None) if not isinstance(block, dict) else block.get("id")
            binput = getattr(block, "input", {})   if not isinstance(block, dict) else block.get("input", {})

            if btype == "tool_use" and bname == "get_stock_quote":
                sym = (binput or {}).get("symbol", "")
                client_results.append({
                    "type":        "tool_result",
                    "tool_use_id": bid,
                    "content":     _fetch_quote_sync(sym),
                })

        if client_results:
            messages.append({"role": "user", "content": client_results})

        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_blocks,
            messages=messages,
            tools=tools,
        )

    return response


# ── MISSION 1: Pre-output validation gate ────────────────────────────────────

def _apply_validation_gate(
    raw_result: str,
    client: Any,
    model: str,
    system_blocks: List[Dict],
    tools: List[Dict],
    aggression_level: int,
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Parse CIPHER output, validate each trade, regenerate failing cards.
    Returns (final_text, parsed_trades).
    Regeneration is capped at 1 attempt per card to keep latency reasonable.
    """
    # Only run on trade-formatted output
    if "TRADE " not in raw_result.upper():
        return raw_result, []

    trades = parse_cipher_output(raw_result)
    if not trades:
        return raw_result, []

    preamble, trade_blocks, postamble = _split_response_into_sections(raw_result)

    corrected_blocks: List[str] = []
    all_trades: List[Dict[str, Any]] = []

    for i, trade in enumerate(trades):
        errors = validate_cipher_trade(trade)
        raw_block = trade.get("_raw_block", trade_blocks[i] if i < len(trade_blocks) else "")

        if not errors:
            corrected_blocks.append(raw_block)
            all_trades.append(trade)
            continue

        logger.info(
            "CIPHER validation: trade %d (%s) has %d errors, regenerating...",
            trade.get("trade_num", i + 1), trade.get("ticker", "?"), len(errors),
        )

        # One regeneration attempt
        fix_prompt = (
            "The following CIPHER trade card has these validation errors that MUST be fixed:\n\n"
            + "\n".join(f"  {j+1}. {e}" for j, e in enumerate(errors))
            + "\n\nRegenerate the entire trade card below with every error fixed. "
            "Return ONLY the corrected trade card in the exact same format. Nothing else.\n\n"
            + raw_block
        )
        try:
            fix_msgs = [{"role": "user", "content": fix_prompt}]
            fix_resp = _run_tool_loop(
                client, model, system_blocks, fix_msgs, tools, max_tokens=800, max_iter=4,
            )
            fixed_text = _extract_text(fix_resp).strip()

            if fixed_text and "TRADE " in fixed_text.upper():
                # Re-parse and re-validate the fixed card
                fixed_trades = parse_cipher_output(fixed_text)
                if fixed_trades:
                    re_errors = validate_cipher_trade(fixed_trades[0])
                    if not re_errors:
                        corrected_blocks.append(fixed_text)
                        all_trades.append(fixed_trades[0])
                        logger.info("Validation: trade %d corrected successfully.", trade.get("trade_num", i + 1))
                        continue
                    else:
                        # Still failing — flag it
                        logger.warning("Validation: trade %d still failing after regen, flagging.", trade.get("trade_num", i + 1))
                        corrected_blocks.append(_inject_validation_warnings(fixed_text, re_errors))
                        ft = fixed_trades[0]
                        ft["validation_warnings"] = re_errors
                        all_trades.append(ft)
                        continue
        except Exception as fix_err:
            logger.warning("Validation regen failed: %s", fix_err)

        # Regen failed or returned bad text — flag original
        corrected_blocks.append(_inject_validation_warnings(raw_block, errors))
        trade["validation_warnings"] = errors
        all_trades.append(trade)

    parts = []
    if preamble:
        parts.append(preamble)
    parts.extend(corrected_blocks)
    if postamble:
        parts.append(postamble)

    return "\n\n".join(parts), all_trades


# ── MISSION 3.3: Two-step chain ───────────────────────────────────────────────

def _is_trade_question(question: str) -> bool:
    return bool(_TRADE_KEYWORDS.search(question))


async def _scan_candidates(
    client: Any,
    model: str,
    compact_ctx: str,
    aggression_level: int,
) -> List[Dict[str, str]]:
    """
    Step 1: Ultra-cheap scan call (~400 tokens total).
    Returns up to 5 ticker candidates as list of dicts.
    """
    cfg = AGGRESSION_CONFIGS.get(aggression_level, AGGRESSION_CONFIGS[3])
    scan_prompt = (
        f"Market context:\n{compact_ctx}\n\n"
        f"Aggression level: {aggression_level} ({cfg['name']})\n\n"
        f"List 3-5 high-probability trade candidates for this session. "
        f"JSON array only: [{{'ticker':'STR','type':'EARNINGS_PRE_PRINT','one_line':'STR'}}]"
    )
    try:
        resp = client.messages.create(
            model=model,
            max_tokens=160,
            messages=[{"role": "user", "content": scan_prompt}],
        )
        raw = _extract_text(resp).strip()
        # Extract JSON array
        m = re.search(r'\[.*\]', raw, re.DOTALL)
        if m:
            return json.loads(m.group(0))
    except Exception as e:
        logger.debug("Scan step failed (non-fatal): %s", e)
    return []


# ── Main answer function ──────────────────────────────────────────────────────

async def answer_question(
    question: str,
    preferences: Dict[str, Any],
    signals: List[Dict[str, Any]],
    regime: Dict[str, Any],
    history: List[Dict[str, str]],
    aggression_level: int = 3,
    user_id: str = "",
    supabase_url: str = "",
    supabase_key: str = "",
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Answer a CIPHER question.
    Returns (reply_text, parsed_trades).
    parsed_trades is non-empty only when CIPHER generated trade cards.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return "_CIPHER offline — ANTHROPIC_API_KEY not configured._", []

    client = anthropic.Anthropic(api_key=api_key)
    model  = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    # Build compact context (replaces verbose prose — Mission 3.1)
    watchlist     = preferences.get("watchlist", [])
    compact_ctx   = build_cipher_context(watchlist[:5] if watchlist else None)
    perf_ctx      = await build_performance_context(user_id, supabase_url, supabase_key)

    system_prompt = _build_master_prompt(aggression_level, compact_ctx, perf_ctx)
    system_blocks = [{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}]

    tools = [
        {"type": "web_search_20250305", "name": "web_search", "max_uses": 3},
        {
            "name": "get_stock_quote",
            "description": (
                "Fetch current real-time price, daily change %, and volume for a ticker. "
                "ALWAYS call this before stating any entry price — article prices are stale."
            ),
            "input_schema": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Ticker, e.g. 'NVDA'"}},
                "required": ["symbol"],
            },
        },
    ]

    now_utc  = datetime.now(timezone.utc)
    et_off   = -4 if (3 <= now_utc.month <= 11) else -5
    now_et   = now_utc + timedelta(hours=et_off)
    mkt_open = (now_et.hour == 9 and now_et.minute >= 30) or (10 <= now_et.hour < 16)
    now_str  = now_et.strftime("%A %B %d, %Y — %I:%M %p ET")

    compact_signals = [_compact_signal(s) for s in signals]

    try:
        # Mission 3.3: Two-step chain for trade questions
        scan_hint = ""
        if _is_trade_question(question) and not history:
            candidates = await _scan_candidates(client, model, compact_ctx, aggression_level)
            if candidates:
                scan_hint = (
                    "\n\n[SCAN CANDIDATES — evaluate these first: "
                    + json.dumps(candidates, separators=(",", ":"))
                    + "]"
                )

        user_msg = (
            f"{question}{scan_hint}\n\n"
            f"[Time: {now_str} | Market: {'OPEN' if mkt_open else 'CLOSED/EXTENDED'} | "
            f"Regime: {regime.get('regime', 'NEUTRAL')} | "
            f"VIX: {regime.get('vix_level', 'NORMAL')} | "
            f"Quant signals: {json.dumps(compact_signals, separators=(',', ':'))}]"
        )

        messages: List[Dict[str, Any]] = list(history[-8:])
        messages.append({"role": "user", "content": user_msg})

        response = _run_tool_loop(client, model, system_blocks, messages, tools, 3000, 8)
        raw_result = _extract_text(response) or "_CIPHER: no analysis generated._"

        # Mission 1: Pre-output validation gate
        final_text, parsed_trades = _apply_validation_gate(
            raw_result, client, model, system_blocks, tools, aggression_level,
        )

        return final_text, parsed_trades

    except anthropic.RateLimitError:
        logger.warning("Rate limit hit on CIPHER answer_question")
        return (
            "**Rate limit reached** — too many tokens in the last minute.\n\n"
            "Wait 60 seconds and try again, or switch to a lighter query.\n\n"
            "*This is intelligence, not advice. Trade responsibly.*"
        ), []
    except anthropic.BadRequestError as e:
        logger.warning("Tool unavailable (%s), falling back to no-search mode", e)
        result, trades = await _answer_no_search(
            question, compact_ctx, compact_signals, regime, history,
            client, model, aggression_level,
        )
        return result, trades
    except Exception as e:
        logger.exception("CIPHER answer failed: %s", e)
        raise


async def _answer_no_search(
    question: str,
    compact_ctx: str,
    compact_signals: List[Dict[str, Any]],
    regime: Dict[str, Any],
    history: List[Dict[str, str]],
    client: Any,
    model: str,
    aggression_level: int = 3,
) -> Tuple[str, List[Dict[str, Any]]]:
    """Fallback: answer without web search."""
    perf_ctx      = ""
    system_prompt = _build_master_prompt(aggression_level, compact_ctx, perf_ctx)
    ctx = (
        f"Market context:\n{compact_ctx}\n"
        f"Regime: {regime.get('regime', 'NEUTRAL')} | "
        f"VIX: {regime.get('vix_level', 'NORMAL')}\n"
        f"Quant signals: {json.dumps(compact_signals, separators=(',', ':'))}"
    )
    messages: List[Dict[str, Any]] = list(history[-8:])
    messages.append({"role": "user", "content": f"{question}\n\n[{ctx}]"})
    response = client.messages.create(
        model=model,
        max_tokens=2000,
        system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
    )
    raw = _extract_text(response) or "_CIPHER: no analysis generated._"
    return raw, []
