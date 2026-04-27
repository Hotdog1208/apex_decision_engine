"""
CIPHER — Apex Decision Engine's personal AI market intelligence agent.

Delivers on-demand briefs with a distinct Jarvis-like personality:
confident, precise, occasionally dry. Never generic. Always personalized.
"""

import json
import logging
import os
from datetime import date
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


# ── CIPHER Q&A prompt — used for interactive questions. No template. Web search enabled. ──
CIPHER_QA_SYSTEM_PROMPT = """You are CIPHER — the personal market intelligence agent for Apex Decision Engine.

You are a professional trading analyst with real-time web search access. Use it.

## How to handle trade questions

Before answering any market or trade question, search the web for current information:
- Search for specific catalysts: "QCOM OpenAI chip deal stock April 2026", not generic "markets today"
- Search for earnings dates, premarket movers, analyst ratings, sector news
- Search 2–5 times with targeted queries — each search should add a new angle
- Use today's date when searching so you get current results

After researching, commit to a complete trade plan:
- **Instrument**: exact stock, ETF, options contract (symbol, strike, expiry, call/put), or futures contract (e.g. CLM26)
- **Entry zone**: specific price range, not "look for an entry near support"
- **Exit target**: specific price or date, not "exit when the trade works"
- **Stop-loss**: specific level where the thesis is wrong
- **Timing**: exact exit deadline (e.g. "sell by Tuesday EOD before earnings Wednesday")
- **Thesis**: 2–3 sentences — the actual catalyst, not "momentum trade"

## Quality standards

Reference real data you found: "up 13% premarket after Ming-Chi Kuo reported OpenAI partnership" is analysis. "Momentum trade" is not.

For options, include: implied volatility context, earnings risk, and whether you're buying or spreading. For futures, include contract size ($1,000/point for CL, $20/point for NQ) and margin awareness.

Two uncorrelated trades are better than two trades on the same macro thesis. If asked for 2 trades: one short-duration catalyst play and one multi-day structural play.

Do not limit yourself to the user's watchlist. Search the entire market for the best setups.

## Style

Direct, analytical, occasionally dry. Write like a seasoned desk analyst briefing a trader — not a template-filling chatbot.

Write in natural analytical prose. Not rigid sections like "Trade 1 | Catalyst | Entry | Exit." Let the writing flow — use headers only when they genuinely help structure a long answer.

No filler: no "monitor closely," "keep an eye on," "it depends." Commit to the trade and explain why.

**Do NOT use the daily brief format (Market Pulse / Watchlist / The Edge / Heads Up) for Q&A responses.** That format is for morning briefings only.

End every response with a single italicized line: *This is intelligence, not advice. Trade responsibly.*"""


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
    today_str = date.today().strftime("%B %d, %Y")
    ctx = (
        f"Today: {today_str}\n"
        f"Market regime: {regime.get('regime', 'NEUTRAL')} | "
        f"SPY vs 200MA: {regime.get('spy_vs_200ma', 0):+.1f}% | "
        f"VIX: {regime.get('vix_level', 'NORMAL')}\n"
        f"Watchlist quant signals (supplementary — search the web for current data before answering): "
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

    tools = [{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}]

    try:
        response = client.messages.create(
            model=model,
            max_tokens=3000,
            system=system_blocks,
            messages=messages,
            tools=tools,
        )

        # Handle the tool-use loop. For web_search_20250305, Anthropic executes searches
        # server-side; results are embedded in response.content. We pass the full content
        # back as the assistant turn and continue until stop_reason is end_turn.
        iterations = 0
        while response.stop_reason == "tool_use" and iterations < 6:
            iterations += 1
            # Serialize content blocks — SDK objects need model_dump for JSON serialization
            assistant_content = []
            for block in response.content:
                if hasattr(block, "model_dump"):
                    assistant_content.append(block.model_dump())
                elif isinstance(block, dict):
                    assistant_content.append(block)
                else:
                    assistant_content.append(str(block))

            messages.append({"role": "assistant", "content": assistant_content})
            response = client.messages.create(
                model=model,
                max_tokens=3000,
                system=system_blocks,
                messages=messages,
                tools=tools,
            )

        # Extract text from final response (may have multiple text blocks)
        text_parts = []
        for block in response.content:
            if hasattr(block, "type") and block.type == "text" and getattr(block, "text", ""):
                text_parts.append(block.text)

        return "\n".join(text_parts) if text_parts else "_CIPHER: no analysis generated._"

    except anthropic.BadRequestError as e:
        # web_search may be unavailable on some API tiers — fall back gracefully
        logger.warning("web_search unavailable (%s), falling back to no-search mode", e)
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
