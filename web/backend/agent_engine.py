"""
CIPHER — Apex Decision Engine's personal AI market intelligence agent.

Delivers on-demand briefs with a distinct Jarvis-like personality:
confident, precise, occasionally dry. Never generic. Always personalized.
"""

import json
import logging
import os
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
import anthropic  # type: ignore

logger = logging.getLogger(__name__)

# ── CIPHER brief prompt — used for daily briefings (structured format is appropriate here) ──
CIPHER_SYSTEM_PROMPT = """You are CIPHER — the personal market intelligence agent for Apex Decision Engine.

Identity:
You are not "an AI assistant." You are CIPHER. You are the user's dedicated analyst, strategist, and trading partner. You have direct access to quantitative signals, options flow anomalies, and macro regime data. You deliver intelligence the way a seasoned desk analyst would brief a trader before the open: sharp, specific, and without filler.

Personality:
- Confident and measured. You commit to views. You don't trail off into "it depends."
- Occasionally dry — the market earns it. ("SPY is doing its best impression of a broken elevator.")
- Warm toward the user without being sycophantic. You treat their watchlist like your own.
- When data is genuinely murky, say so once and cleanly: "The tape on X is noisy here — but the structure says..."
- You are NOT a financial advisor. You acknowledge this once, at the end, in italics.
- You address the user directly: "Your NVDA setup looks interesting today." Not "The user should consider..."

Brief structure (follow this order, use markdown headers):
## Market Pulse
One sharp sentence on macro regime. What is the market actually doing right now — not what it did last week.

## Your Watchlist
For each symbol the user tracks: verdict (STRONG_BUY/BUY/WATCH/AVOID/STRONG_AVOID), one conviction sentence, and the single most important number. Keep each entry to 2-3 lines max.

## The Edge
The single highest-conviction idea from today's data. Lead with the number that matters. One short paragraph.

## Heads Up
One specific tail risk or upcoming catalyst. Not "watch macro" — give the actual thing. Earnings date, Fed event, technical level to watch.

## —
One sentence in CIPHER's voice to close. Optional dry wit. Then on a new line:
*This is intelligence, not advice. Trade responsibly.*

Formatting rules:
- Clean markdown. Concise. Each section punchy, not padded.
- Specific numbers over vague adjectives. "RSI at 28" beats "oversold."
- If a symbol has no meaningful signal, say "No edge today on [SYM] — standing by." Don't invent conviction you don't have."""


# ── CIPHER Q&A prompt — used for interactive questions. No template. Web search + live quotes. ──
CIPHER_QA_SYSTEM_PROMPT = """You are CIPHER — the personal market intelligence agent for Apex Decision Engine.

You have two tools: web_search (real-time news/catalysts) and get_stock_quote (live price from market feed).

## Critical workflow for trade questions

1. **Search first** — use web_search to find today's catalysts, earnings, premarket movers, news. Search specifically ("OGN acquisition Sun Pharma April 2026") not generically ("markets today"). 2–5 targeted searches.

2. **Get live prices** — for EVERY ticker you plan to recommend, call get_stock_quote BEFORE writing an entry price. News articles quote prices from when they were published, which may be hours or days ago. The stock may have already moved. get_stock_quote gives the current real-time price.

3. **Then write the trade** — using the live price as your anchor, not the price in the article.

## Trade plan requirements

Every trade must include:
- **Instrument**: exact ticker, or for options: full contract spec (symbol, strike, expiry, call/put)
- **Entry zone**: built from the live quote you fetched, e.g. "OGN is at $13.18 live — enter $13.00–$13.30"
- **Exit target**: specific price, e.g. "$13.85 (95% of the $14 deal price)"
- **Stop-loss**: specific level where thesis is broken, e.g. "below $12.50 — deal arb spread too wide"
- **Timing**: exact deadline, e.g. "close by Tuesday 3:45 PM CT — do not hold overnight"
- **Thesis**: 2–3 sentences on the actual catalyst with real numbers

## Quality standards

- Always acknowledge how far the stock has already moved vs the article's reported price. "OGN is already at $13.18 — the easy 16% gap is behind us. Here's what's left."
- For options: state whether IV is elevated vs historical, and size the trade accordingly
- For futures: include contract value ($1,000/point CL, $20/point NQ) and exact expiry
- Two uncorrelated trades are better than two on the same macro thesis

## Style

Write like a seasoned desk analyst. Natural prose, not bullet-point templates. Commit to views — no "monitor closely" or "it depends."

Do NOT use the daily brief format (Market Pulse / Watchlist / The Edge / Heads Up). Answer what was asked.

End every response with: *This is intelligence, not advice. Trade responsibly.*"""


def _compact_signal(sig: Dict[str, Any]) -> Dict[str, Any]:
    """Strip signal to minimum tokens needed for CIPHER (~60% reduction)."""
    return {
        "sym":    sig.get("symbol"),
        "v":      sig.get("verdict"),
        "c":      sig.get("confidence"),
        "p":      sig.get("price"),
        "tf":     sig.get("timeframe_label") or sig.get("timeframe"),
        "lead":   sig.get("lead_signal"),
        "bull":   sig.get("bull_case"),
        "bear":   sig.get("bear_case"),
        "regime": sig.get("market_regime"),
        "uoa":    sig.get("uoa_note"),
        "scalp":  sig.get("scalp_note"),
        "long":   sig.get("long_note"),
    }


async def generate_brief(
    user_email: str,
    user_id: str,
    preferences: Dict[str, Any],
    signals: List[Dict[str, Any]],
    regime: Dict[str, Any],
) -> str:
    """
    Generate a personalized CIPHER brief for the user.
    Returns the brief text. Raises on API failure (caller handles caching/storage).
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return "_CIPHER offline — ANTHROPIC_API_KEY not configured._"

    client = anthropic.Anthropic(api_key=api_key)
    model  = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    watchlist   = preferences.get("watchlist", [])
    alert_types = preferences.get("alert_types", [])

    compact_signals = [_compact_signal(s) for s in signals]

    user_ctx_parts = [
        f"Watchlist: {', '.join(watchlist) if watchlist else 'not configured — give a general market brief'}",
        f"Alert focus: {', '.join(alert_types) if alert_types else 'general'}",
        f"Macro regime: {regime.get('regime', 'NEUTRAL')} | SPY vs 200MA: {regime.get('spy_vs_200ma', 0):+.1f}% | VIX: {regime.get('vix_level', 'NORMAL')}",
        f"Signals: {json.dumps(compact_signals, separators=(',', ':'))}",
    ]
    user_context = "\n".join(user_ctx_parts)

    try:
        response = client.messages.create(
            model=model,
            max_tokens=900,
            system=[
                {
                    "type": "text",
                    "text": CIPHER_SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": f"Generate my brief.\n\n{user_context}",
                }
            ],
        )
        return response.content[0].text
    except Exception as e:
        logger.error("CIPHER brief generation failed: %s", e)
        raise


async def answer_question(
    question: str,
    preferences: Dict[str, Any],
    signals: List[Dict[str, Any]],
    regime: Dict[str, Any],
    history: List[Dict[str, str]],
) -> str:
    """
    Answer a follow-up question in the CIPHER voice.
    Uses web_search to get current market data before answering.
    history = last N {"role": "user"/"assistant", "content": str} pairs.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return "_CIPHER offline — ANTHROPIC_API_KEY not configured._"

    client = anthropic.Anthropic(api_key=api_key)
    model  = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    compact_signals = [_compact_signal(s) for s in signals]
    now_utc = datetime.now(timezone.utc)
    now_str = now_utc.strftime("%A %B %d, %Y — %I:%M %p UTC")
    market_open = 13 <= now_utc.hour < 20  # 9:30 AM–4:00 PM ET in UTC
    ctx = (
        f"Current time: {now_str} (subtract 5h for EDT, 6h for CDT)\n"
        f"Market session: {'OPEN' if market_open else 'PRE/AFTER-HOURS or CLOSED'}\n"
        f"Market regime: {regime.get('regime', 'NEUTRAL')} | "
        f"SPY vs 200MA: {regime.get('spy_vs_200ma', 0):+.1f}% | "
        f"VIX: {regime.get('vix_level', 'NORMAL')}\n"
        f"Watchlist quant signals (supplementary — use get_stock_quote for live prices): "
        f"{json.dumps(compact_signals, separators=(',', ':'))}"
    )

    messages: List[Dict[str, Any]] = list(history[-8:])
    messages.append({
        "role": "user",
        "content": f"{question}\n\n[Context: {ctx}]",
    })

    system_blocks = [
        {
            "type": "text",
            "text": CIPHER_QA_SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    tools = [
        {"type": "web_search_20250305", "name": "web_search", "max_uses": 3},
        {
            "name": "get_stock_quote",
            "description": (
                "Fetch the current real-time price, daily change %, and volume for a ticker. "
                "ALWAYS call this before stating any entry price for a trade. "
                "Web search article prices may be hours or days stale — this returns the live market price."
            ),
            "input_schema": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Ticker symbol, e.g. 'OGN', 'SNDK', 'SPY'",
                    }
                },
                "required": ["symbol"],
            },
        },
    ]

    def _fetch_quote(symbol: str) -> str:
        try:
            from web.backend.app import connector as _conn  # type: ignore
            q = _conn.market_data.fetch_quote(symbol.upper().strip())
            return json.dumps(q)
        except Exception:
            try:
                import yfinance as yf  # type: ignore
                info = yf.Ticker(symbol.upper().strip()).fast_info
                return json.dumps({
                    "symbol": symbol.upper(),
                    "price": round(float(info.last_price), 2),
                    "volume": int(getattr(info, "three_month_average_volume", 0) or 0),
                })
            except Exception as exc2:
                return json.dumps({"error": str(exc2), "symbol": symbol})

    try:
        response = client.messages.create(
            model=model,
            max_tokens=3000,
            system=system_blocks,
            messages=messages,
            tools=tools,
        )

        # Tool-use loop:
        # - web_search_20250305 (server-side): results already embedded in response.content,
        #   just pass the full assistant content back and continue.
        # - get_stock_quote (client-side): we execute it and add tool_result blocks.
        iterations = 0
        while response.stop_reason == "tool_use" and iterations < 8:
            iterations += 1

            assistant_content = []
            for block in response.content:
                if hasattr(block, "model_dump"):
                    assistant_content.append(block.model_dump())
                elif isinstance(block, dict):
                    assistant_content.append(block)
                else:
                    assistant_content.append({"type": "text", "text": str(block)})
            messages.append({"role": "assistant", "content": assistant_content})

            # Handle client-side get_stock_quote calls
            client_results = []
            for block in response.content:
                btype  = getattr(block, "type",  None) if not isinstance(block, dict) else block.get("type")
                bname  = getattr(block, "name",  None) if not isinstance(block, dict) else block.get("name")
                bid    = getattr(block, "id",    None) if not isinstance(block, dict) else block.get("id")
                binput = getattr(block, "input", {})   if not isinstance(block, dict) else block.get("input", {})

                if btype == "tool_use" and bname == "get_stock_quote":
                    sym = (binput or {}).get("symbol", "")
                    client_results.append({
                        "type": "tool_result",
                        "tool_use_id": bid,
                        "content": _fetch_quote(sym),
                    })

            if client_results:
                messages.append({"role": "user", "content": client_results})

            response = client.messages.create(
                model=model,
                max_tokens=3000,
                system=system_blocks,
                messages=messages,
                tools=tools,
            )

        text_parts = [
            block.text for block in response.content
            if hasattr(block, "type") and block.type == "text" and getattr(block, "text", "")
        ]
        return "\n".join(text_parts) if text_parts else "_CIPHER: no analysis generated._"

    except anthropic.RateLimitError:
        logger.warning("Anthropic rate limit hit on /admin/panel/ask")
        return (
            "**Rate limit reached** — too many tokens were sent in the last minute "
            "(Anthropic free tier: 30k input tokens/min on Sonnet).\n\n"
            "Wait 60 seconds and try again. To raise the limit, either:\n"
            "- Switch to `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` on Render "
            "(4× cheaper, higher rate limit), or\n"
            "- Upgrade your Anthropic usage tier at console.anthropic.com.\n\n"
            "*This is intelligence, not advice. Trade responsibly.*"
        )
    except anthropic.BadRequestError as e:
        logger.warning("Tool unavailable (%s), falling back to no-search mode", e)
        return await _answer_no_search(question, compact_signals, regime, history, client, model)
    except Exception as e:
        logger.exception("CIPHER answer failed: %s", e)
        raise


async def _answer_no_search(
    question: str,
    compact_signals: List[Dict[str, Any]],
    regime: Dict[str, Any],
    history: List[Dict[str, str]],
    client: Any,
    model: str,
) -> str:
    """Fallback: answer without web search if the tool is unavailable."""
    today_str = date.today().strftime("%B %d, %Y")
    ctx = (
        f"Today: {today_str}\n"
        f"Market regime: {regime.get('regime', 'NEUTRAL')} | "
        f"SPY vs 200MA: {regime.get('spy_vs_200ma', 0):+.1f}%\n"
        f"Watchlist signals: {json.dumps(compact_signals, separators=(',', ':'))}"
    )
    messages: List[Dict[str, Any]] = list(history[-8:])
    messages.append({
        "role": "user",
        "content": f"{question}\n\n[Context: {ctx}]",
    })
    response = client.messages.create(
        model=model,
        max_tokens=2000,
        system=[{"type": "text", "text": CIPHER_QA_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
    )
    text_parts = [b.text for b in response.content if hasattr(b, "type") and b.type == "text" and b.text]
    return "\n".join(text_parts) if text_parts else "_CIPHER: no analysis generated._"
