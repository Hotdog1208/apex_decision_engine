"""
CIPHER — Apex Decision Engine's personal AI market intelligence agent.

Delivers on-demand briefs and trade analysis with a distinct Jarvis-like personality:
confident, precise, occasionally dry. Never generic. Always personalized.
"""

import json
import logging
import os
from datetime import date, datetime, timezone
from typing import Any, Dict, List
import anthropic  # type: ignore

logger = logging.getLogger(__name__)

# ── Aggression level system ───────────────────────────────────────────────────
AGGRESSION_CONFIGS: Dict[int, Dict[str, str]] = {
    1: {
        "name": "CONSERVATIVE",
        "instructions": (
            "Only recommend setups with 80%+ confidence on large-cap names (>$10B market cap). "
            "No options. Prefer equities and ETFs with clearly defined risk. "
            "Position sizing: 1–2% of portfolio per trade. Protect capital first."
        ),
    },
    2: {
        "name": "MODERATE",
        "instructions": (
            "Target 70%+ confidence. Established mid- and large-caps. "
            "Options OK with 30+ DTE; prefer defined-risk spreads over naked positions. "
            "Position sizing: 2–3% per trade."
        ),
    },
    3: {
        "name": "BALANCED",
        "instructions": (
            "60%+ confidence threshold. Any market cap. Near-term options OK (7+ DTE). "
            "Balance conviction with opportunity. "
            "Position sizing: 2–4% per trade. Your default operating mode."
        ),
    },
    4: {
        "name": "AGGRESSIVE",
        "instructions": (
            "50%+ confidence. All instruments including 0DTE with a defined hedge. "
            "Momentum plays and catalyst trades are valid setups. "
            "Position sizing: 3–5% per trade."
        ),
    },
    5: {
        "name": "APEX",
        "instructions": (
            "No confidence floor. All instruments — 0DTE, leveraged ETFs, futures. "
            "Pure edge-seeking. CIPHER's maximum conviction output. "
            "The user manages their own risk — no hand-holding on sizing."
        ),
    },
}

# ── CIPHER brief prompt — daily briefings (structured markdown format) ─────────
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


# ── CIPHER master Q&A prompt — aggression level injected at call time ──────────
CIPHER_MASTER_SYSTEM_PROMPT = """You are CIPHER — the personal market intelligence agent for Apex Decision Engine.

## Identity
Not "an AI assistant" — you are CIPHER, the user's dedicated desk analyst. You have direct access to quantitative signals, options flow anomalies, and macro regime data. Sharp, specific, and without filler.

## Personality
- Confident and measured. Commit to views. No "it depends" trailing off.
- Occasionally dry — the market earns it.
- When data is murky, say so once: "The tape on X is noisy — but the structure says..."
- NOT a financial advisor. Always end with: *This is intelligence, not advice. Trade responsibly.*

## Tools
- **web_search**: real-time news and catalysts. Use 2–4 targeted searches. Search specifically ("OGN Sun Pharma acquisition April 2026") not generically ("markets today").
- **get_stock_quote**: live price, change %, and volume. ALWAYS call this before stating any entry price — article prices may be hours or days stale.

## Workflow for trade questions
1. Search for today's catalysts, earnings, premarket movers (2–4 targeted searches).
2. Call get_stock_quote for EVERY ticker you plan to recommend.
3. Build the trade around the live price. Acknowledge where it has already moved: "OGN is at $13.18 live — the easy gap is behind us. Here's what's left."

## Aggression Level: {AGGRESSION_NAME} (Level {AGGRESSION_LEVEL}/5)
{AGGRESSION_INSTRUCTIONS}

## For trade questions — use this EXACT output format for each trade:

═══════════════════════════════════════
TRADE [N]: [SYMBOL] — [STRATEGY TYPE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ INSTRUMENT: [exact ticker, or full option contract: SYMBOL $STRIKE EXPIRY CALL/PUT]
▸ CURRENT PRICE: $[live price from get_stock_quote]
▸ ENTRY ZONE: $[X] – $[Y] [(one-line rationale)]
▸ TARGET: $[price] [(why this level)]
▸ STOP-LOSS: $[price] [(what breaks the thesis)]
▸ TIME HORIZON: [exact deadline — e.g. "Close by Friday April 30, 4PM ET"]
▸ RISK/REWARD: [X:1]
▸ AGGRESSION NOTE: [one sentence on sizing at this aggression level]

THESIS: [3–4 sentences. Lead with the catalyst. Include specific numbers.]

WHAT KILLS THIS TRADE: [one specific scenario that invalidates the thesis]
WHAT CONFIRMS THIS WORKING: [one signal to watch that says the thesis is intact]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use the trade format for: stock picks, options trades, catalyst plays, merger arb, momentum setups.

## For non-trade questions
Natural prose. Direct and specific. Commit to views. No rigid format needed."""


# ── Self-validation prompt — catches timing/logic errors ──────────────────────
CIPHER_VALIDATOR_SYSTEM = """You are CIPHER's self-check module. Review a trade brief for critical errors only.

Check ONLY these three things:
1. TIMING: Is the exit deadline consistent with the strategy? (A 30-90 day merger arb with "exit by tomorrow" is wrong.)
2. PRICING: Does the entry zone align with the stated current price?
3. LOGIC: Any internal contradiction? (Stop-loss above entry on a long, target below entry, etc.)

If no critical errors: respond with exactly: [VALID]
If there is a critical error: respond with [FIX] followed by a corrected note in 40 words or fewer.

Nothing else. Be extremely brief."""


def _build_master_prompt(aggression_level: int = 3) -> str:
    cfg = AGGRESSION_CONFIGS.get(aggression_level, AGGRESSION_CONFIGS[3])
    return CIPHER_MASTER_SYSTEM_PROMPT.format(
        AGGRESSION_NAME=cfg["name"],
        AGGRESSION_LEVEL=aggression_level,
        AGGRESSION_INSTRUCTIONS=cfg["instructions"],
    )


def build_macro_context() -> str:
    """Fetch a live macro snapshot via yfinance. Synchronous."""
    try:
        import yfinance as yf  # type: ignore
        symbols = {
            "SPY": "SPY", "QQQ": "QQQ", "VIX": "^VIX",
            "GLD": "GLD", "TLT": "TLT",
            "XLK": "XLK", "XLF": "XLF", "XLE": "XLE", "XLV": "XLV",
        }
        parts: List[str] = []
        for label, sym in symbols.items():
            try:
                info = yf.Ticker(sym).fast_info
                price = round(float(info.last_price), 2)
                prev  = float(getattr(info, "previous_close", 0) or 0)
                chg   = round((price - prev) / prev * 100, 2) if prev else 0.0
                parts.append(f"{label} ${price} ({chg:+.1f}%)")
            except Exception:
                parts.append(f"{label} N/A")
        return " | ".join(parts)
    except Exception as e:
        logger.warning("Macro context fetch failed: %s", e)
        return "Macro snapshot unavailable"


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


def _fetch_quote_sync(symbol: str) -> str:
    """Fetch a live quote. Called from inside the tool-use loop."""
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
    text_parts = [
        block.text for block in response.content
        if hasattr(block, "type") and block.type == "text" and getattr(block, "text", "")
    ]
    return "\n".join(text_parts)


def _run_tool_loop(
    client: Any,
    model: str,
    system_blocks: List[Dict],
    messages: List[Dict],
    tools: List[Dict],
    max_tokens: int = 3000,
    max_iter: int = 8,
) -> Any:
    """
    Synchronous tool-use loop.
    - web_search (server-side): results embedded in response.content automatically.
    - get_stock_quote (client-side): we execute and inject tool_result blocks.
    Returns the final response object.
    """
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_blocks,
        messages=messages,
        tools=tools,
    )

    iterations = 0
    while response.stop_reason == "tool_use" and iterations < max_iter:
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


def _validate_output_sync(client: Any, model: str, trade_text: str) -> str:
    """Lightweight post-generation check. Non-fatal — returns original on any error."""
    try:
        response = client.messages.create(
            model=model,
            max_tokens=80,
            system=CIPHER_VALIDATOR_SYSTEM,
            messages=[{"role": "user", "content": trade_text[:4000]}],
        )
        verdict = _extract_text(response).strip()
        if verdict.startswith("[FIX]"):
            correction = verdict[5:].strip()
            return trade_text + f"\n\n*⚠ Auto-correction: {correction}*"
    except Exception as e:
        logger.debug("Validation step skipped (non-fatal): %s", e)
    return trade_text


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

    try:
        response = client.messages.create(
            model=model,
            max_tokens=900,
            system=[{"type": "text", "text": CIPHER_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": f"Generate my brief.\n\n{chr(10).join(user_ctx_parts)}"}],
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
    aggression_level: int = 3,
) -> str:
    """
    Answer a follow-up question in the CIPHER voice.
    aggression_level: 1 (conservative) – 5 (apex).
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return "_CIPHER offline — ANTHROPIC_API_KEY not configured._"

    client = anthropic.Anthropic(api_key=api_key)
    model  = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    system_prompt = _build_master_prompt(aggression_level)
    macro_ctx     = build_macro_context()
    compact_signals = [_compact_signal(s) for s in signals]

    now_utc = datetime.now(timezone.utc)
    now_str = now_utc.strftime("%A %B %d, %Y — %I:%M %p UTC")
    market_open = 13 <= now_utc.hour < 20  # 9:30 AM–4:00 PM ET in UTC

    ctx = (
        f"Current time: {now_str} (subtract 5h for EDT)\n"
        f"Market session: {'OPEN' if market_open else 'PRE/AFTER-HOURS or CLOSED'}\n"
        f"Macro snapshot (live): {macro_ctx}\n"
        f"Market regime: {regime.get('regime', 'NEUTRAL')} | "
        f"SPY vs 200MA: {regime.get('spy_vs_200ma', 0):+.1f}% | "
        f"VIX: {regime.get('vix_level', 'NORMAL')}\n"
        f"Watchlist quant signals (supplement only — use get_stock_quote for live prices): "
        f"{json.dumps(compact_signals, separators=(',', ':'))}"
    )

    system_blocks = [{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}]
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
                    "symbol": {"type": "string", "description": "Ticker symbol, e.g. 'OGN', 'SNDK', 'SPY'"}
                },
                "required": ["symbol"],
            },
        },
    ]

    messages: List[Dict[str, Any]] = list(history[-8:])
    messages.append({"role": "user", "content": f"{question}\n\n[Context: {ctx}]"})

    try:
        response = _run_tool_loop(client, model, system_blocks, messages, tools, 3000, 8)
        result = _extract_text(response) or "_CIPHER: no analysis generated._"

        # Self-validation for structured trade output (lightweight, 80-token call)
        if "═══" in result or "▸ ENTRY ZONE:" in result:
            result = _validate_output_sync(client, model, result)

        return result

    except anthropic.RateLimitError:
        logger.warning("Anthropic rate limit hit on /admin/panel/ask")
        return (
            "**Rate limit reached** — too many tokens were sent in the last minute "
            "(Anthropic free tier: 30k input tokens/min on Sonnet).\n\n"
            "Wait 60 seconds and try again. To raise the limit:\n"
            "- Switch to `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` on Render (4× cheaper, higher limit), or\n"
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
    messages.append({"role": "user", "content": f"{question}\n\n[Context: {ctx}]"})
    fallback_prompt = CIPHER_MASTER_SYSTEM_PROMPT.format(
        AGGRESSION_NAME=AGGRESSION_CONFIGS[3]["name"],
        AGGRESSION_LEVEL=3,
        AGGRESSION_INSTRUCTIONS=AGGRESSION_CONFIGS[3]["instructions"],
    )
    response = client.messages.create(
        model=model,
        max_tokens=2000,
        system=[{"type": "text", "text": fallback_prompt, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
    )
    return _extract_text(response) or "_CIPHER: no analysis generated._"
