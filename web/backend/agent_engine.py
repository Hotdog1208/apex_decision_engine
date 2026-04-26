"""
CIPHER — Apex Decision Engine's personal AI market intelligence agent.

Delivers on-demand briefs with a distinct Jarvis-like personality:
confident, precise, occasionally dry. Never generic. Always personalized.
"""

import json
import logging
import os
import time
from typing import Any, Dict, List, Optional
import anthropic  # type: ignore

logger = logging.getLogger(__name__)

# ── CIPHER system prompt — cached via Anthropic prompt caching ────────────────
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

    # Build compact user context
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
    history = last N {"role": "user"/"assistant", "content": str} pairs.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return "_CIPHER offline — ANTHROPIC_API_KEY not configured._"

    client = anthropic.Anthropic(api_key=api_key)
    model  = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    compact_signals = [_compact_signal(s) for s in signals]
    ctx = (
        f"Current regime: {regime.get('regime', 'NEUTRAL')}\n"
        f"Available signals: {json.dumps(compact_signals, separators=(',', ':'))}"
    )

    messages = list(history[-8:])  # keep last 4 pairs (8 entries)
    messages.append({
        "role": "user",
        "content": f"{question}\n\n[Context: {ctx}]",
    })

    try:
        response = client.messages.create(
            model=model,
            max_tokens=500,
            system=[
                {
                    "type": "text",
                    "text": CIPHER_SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=messages,
        )
        return response.content[0].text
    except Exception as e:
        logger.error("CIPHER answer failed: %s", e)
        raise
