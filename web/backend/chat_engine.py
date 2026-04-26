"""
PRISM — Apex Decision Engine's multi-spectrum market analysis chat engine.

PRISM covers the full trading spectrum: scalp → day → swing → long-term.
Uses Anthropic prompt caching and per-session history (last 10 messages).
"""

import json
import logging
import os
from typing import Any, Callable, Dict, List, Optional
import anthropic  # type: ignore
from engine.ml_models.uoa_xgboost import UOAModelPipeline  # type: ignore

logger = logging.getLogger(__name__)

# Per-session conversation history (in-memory, keyed by session_id)
# Each value is a list of {"role": "user"/"assistant", "content": str}
_sessions: Dict[str, List[Dict[str, str]]] = {}
_MAX_HISTORY = 20  # 10 pairs

PRISM_SYSTEM_PROMPT = """You are PRISM — the market analysis intelligence for Apex Decision Engine.

Identity:
PRISM stands for Predictive Range & Intelligence for Signal Mapping. You analyze markets across every timeframe — from intraday scalps to multi-year investments. You are NOT generic. Every response is grounded in the mathematical data provided to you.

Timeframe coverage:
- SCALP (0-4hr): RSI extremes (<25/>75), volume spikes >2.5×, momentum divergence
- DAY TRADE (same session): MACD crossovers, level breaks, UOA same-day expiry
- SWING (3-10 days): EMA alignment, trend structure, sector rotation, UOA 14-30 DTE
- LONG-TERM (weeks/months): 200MA position, fundamentals (P/E vs sector, revenue growth), macro regime

Personality:
- Analytical but not robotic. You have a measured confidence.
- You distinguish between short-term noise and structural signals.
- You call out when timeframes conflict: "The day trade looks clean, but the weekly is broken."
- You never give generic advice. If there's no data, say so.

Response format (use these sections as headers when relevant):
### Signal Overview
(Core verdict + timeframe most relevant to the user's question)

### The Data
(Specific numbers from the context: UOA, XGBoost score, RSI, volume, etc.)

### Entry & Risk
(Specific entry zone, stop loss, and take profit — grounded in the data provided. For long-term: valuation entry range.)

### Timeframe Cross-check
(Brief note on how this signal reads on OTHER timeframes — when relevant)

Rules:
- ONLY base your analysis on the concrete data provided in the context.
- Cite specific numbers: "RSI at 34.2", "volume 1.84× average", "P/E at 22 vs sector 28"
- Never hedge with "monitor closely" or "it depends." Commit and explain your reasoning.
- For long-term questions: reference fundamentals if provided (P/E, P/B, revenue growth, debt/equity)
- End every response with a single italicized line: *Analysis based on mathematical data — not financial advice.*"""


def extract_ticker(message: str) -> str:
    known = {"AAPL", "MSFT", "NVDA", "JPM", "XOM", "GOOGL", "META", "TSLA", "AMZN", "SPY",
             "QQQ", "AMD", "NFLX", "BABA", "CRM", "PYPL", "UBER", "COIN", "GME", "AMC"}
    words = message.upper().replace('?', '').replace('.', '').replace(',', '').split()
    for w in words:
        if w in known:
            return w
    for w in words:
        if 2 <= len(w) <= 5 and w.isalpha():
            return w
    return ""


def build_rag_context(user_message: str, connector: Any) -> str:
    ticker = extract_ticker(user_message)
    blocks = []

    uoa_file = connector.data_dir / "uoa_anomalies.json"
    anomalies = []
    try:
        if uoa_file.exists() and uoa_file.stat().st_size > 0:
            with open(uoa_file, "r") as f:
                data: List[Dict[str, Any]] = json.load(f)
                anomalies = [a for a in data if a.get("ticker") == ticker] if ticker else []
                if not anomalies and data:
                    anomalies = list(data)[-3:]
    except Exception as e:
        logger.error("UOA load failed: %s", e)

    if anomalies:
        blocks.append("UOA:")
        for a in anomalies[-3:]:
            # Compact UOA representation
            blocks.append(f"{a.get('ticker')} {a.get('type','?')} strike={a.get('strike')} exp={a.get('expiry')} vol={a.get('volume')} oi={a.get('open_interest')}")
    else:
        blocks.append("UOA: no recent anomalies")

    if anomalies:
        try:
            ml_pipeline = UOAModelPipeline(data_source=os.environ.get("DATA_SOURCE", "mock"))
            ml_pipeline.load_model()
            latest = anomalies[-1]
            target = latest.get("ticker", ticker)
            hist = connector.market_data.fetch_ohlc(target, period="3mo", interval="1d")
            series = hist.get("series", [])
            if series:
                prob = ml_pipeline.predict(latest, series)
                blocks.append(f"XGBoost {target}: {prob*100:.1f}% prob of 3%+ breakout")
        except Exception as e:
            logger.debug("ML prediction unavailable: %s", e)

    if ticker:
        try:
            quote = connector.market_data.fetch_quote(ticker)
            p = quote.get("price", "?")
            chg = quote.get("change_percent", "?")
            vol = quote.get("volume", "?")
            blocks.append(f"{ticker}: ${p} ({chg:+.2f}%) vol={vol}")
        except Exception as e:
            logger.debug("Quote fetch failed for %s: %s", ticker, e)

    # Fundamentals for long-term context
    if ticker:
        try:
            import yfinance as yf  # type: ignore
            info = yf.Ticker(ticker).info
            pe   = info.get("trailingPE") or info.get("forwardPE")
            pb   = info.get("priceToBook")
            de   = info.get("debtToEquity")
            rev  = info.get("revenueGrowth")
            mcap = info.get("marketCap")
            parts = []
            if pe:  parts.append(f"P/E={pe:.1f}")
            if pb:  parts.append(f"P/B={pb:.1f}")
            if de:  parts.append(f"D/E={de:.1f}")
            if rev: parts.append(f"rev_growth={rev*100:.1f}%")
            if mcap: parts.append(f"mcap=${mcap/1e9:.0f}B")
            if parts:
                blocks.append(f"Fundamentals: {' | '.join(parts)}")
        except Exception:
            pass

    return " | ".join(blocks)


def _add_to_history(session_id: str, role: str, content: str) -> None:
    if session_id not in _sessions:
        _sessions[session_id] = []
    _sessions[session_id].append({"role": role, "content": content})
    # Prune oldest beyond limit
    if len(_sessions[session_id]) > _MAX_HISTORY:
        _sessions[session_id] = _sessions[session_id][-_MAX_HISTORY:]


async def chat(
    session_id: str,
    message: str,
    signal_context: Optional[Dict[str, Any]] = None,
) -> str:
    from web.backend.app import connector  # type: ignore

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return "PRISM offline — ANTHROPIC_API_KEY not configured."

    try:
        client = anthropic.Anthropic(api_key=api_key)
        model  = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

        rag = build_rag_context(message, connector)

        system_blocks: List[Dict[str, Any]] = [
            {
                "type": "text",
                "text": PRISM_SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ]
        if signal_context:
            system_blocks.append({
                "type": "text",
                "text": (
                    "--- SIGNAL CONTEXT ---\n"
                    + json.dumps(signal_context, separators=(',', ':'))
                    + "\nThe user is asking about this specific signal. Use its levels and indicators."
                ),
            })

        user_content = f"{message}\n\n[Data: {rag}]"

        history = list(_sessions.get(session_id, []))
        history.append({"role": "user", "content": user_content})

        response = client.messages.create(
            model=model,
            max_tokens=1200,
            system=system_blocks,
            messages=history,
        )

        reply = response.content[0].text

        # Persist history (store clean message, not the augmented one)
        _add_to_history(session_id, "user", message)
        _add_to_history(session_id, "assistant", reply)

        return reply

    except Exception as e:
        logger.exception("PRISM chat error: %s", e)
        return f"Analysis uplink error: {str(e)}"


def clear_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


def get_history(session_id: str) -> List[Dict[str, str]]:
    return list(_sessions.get(session_id, []))
