"""
AI Trading Chatbot for Apex Decision Engine.
Uses OpenAI API (GPT-4o) with function calling. Claude can be added via ANTHROPIC_API_KEY.
"""

import json
import os
from typing import Any, Callable, Dict, List

CHAT_SYSTEM_PROMPT = """You are a professional trading analyst and market intelligence assistant for Apex Decision Engine (ADE).

Your core competencies:
- Technical analysis (support/resistance, indicators, chart patterns)
- Options analysis (Greeks, IV analysis, strategy selection)
- Risk management (position sizing, stop placement, R:R ratios)
- Market structure (internals, breadth, sector rotation)
- Sentiment analysis (news, flow)

Your personality:
- Professional but conversational (not robotic)
- Honest about uncertainty (give confidence scores 0-100 when relevant)
- Educational (explain WHY, not just WHAT)
- Risk-aware (always mention downside)
- Proactive (ask clarifying questions when needed)

Critical rules:
- NEVER give definitive predictions ("will go up" → "could test resistance")
- Use confidence scores (0-100) when assessing trades or setups
- ALWAYS mention key risks
- NEVER guarantee profits
- End analysis with: "This is analysis, not financial advice."

You have access to real-time market data via tools. Use them when the user asks about prices, options, or trade ideas."""

OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_quote",
            "description": "Get real-time price, bid, ask, and volume for a stock symbol.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "Stock ticker e.g. AAPL"}},
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_option_chain",
            "description": "Get option chain with strikes and Greeks for a symbol.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Underlying ticker e.g. AAPL"},
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_snapshot",
            "description": "Get current market snapshot: multiple stocks with prices and volume.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_ade_analysis",
            "description": "Run full ADE decision engine: signals, scoring, and trade ideas.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


def run_tool(
    name: str,
    arguments: Dict[str, Any],
    get_engine: Callable,
    connector: Any,
) -> str:
    """Execute a tool and return JSON string result."""
    try:
        if name == "get_stock_quote":
            symbol = arguments.get("symbol", "").upper()
            data = connector.market_data.fetch_quote(symbol)
            return json.dumps(data)

        if name == "get_option_chain":
            symbol = arguments.get("symbol", "").upper()
            data = connector.market_data.fetch_option_chain(symbol)
            out = {
                "underlying": data.get("underlying"),
                "underlying_price": data.get("underlying_price"),
                "calls_count": len(data.get("calls", [])),
                "puts_count": len(data.get("puts", [])),
                "sample_calls": data.get("calls", [])[:5],
                "sample_puts": data.get("puts", [])[:5],
            }
            return json.dumps(out)

        if name == "get_market_snapshot":
            data = connector.market_data.fetch_market_snapshot()
            stocks = data.get("stocks", [])[:10]
            return json.dumps({"stocks": stocks, "timestamp": data.get("timestamp")})

        if name == "run_ade_analysis":
            eng = get_engine()
            output = eng.run()
            trades = output.trade_outputs[:10]
            summary = {
                "signals_count": len(output.signals),
                "allocated_trades_count": len(trades),
                "trades": [
                    {
                        "symbol": t.get("symbol"),
                        "strategy": t.get("strategy"),
                        "direction": t.get("direction"),
                        "confidence_score": t.get("confidence_score"),
                        "capital_allocated": t.get("capital_allocated"),
                    }
                    for t in trades
                ],
            }
            return json.dumps(summary)

        return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


async def chat_completion(
    messages: List[Dict[str, str]],
    get_engine: Callable,
    connector: Any,
) -> str:
    """Call OpenAI API with tool use. Returns full assistant reply."""
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return "[Configure OPENAI_API_KEY in Settings to enable the trading assistant.]"

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
    except ImportError:
        return "[Install openai: pip install openai]"

    all_messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}] + messages
    max_iterations = 5
    iteration = 0

    while iteration < max_iterations:
        iteration += 1
        response = await client.chat.completions.create(
            model=os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
            messages=all_messages,
            tools=OPENAI_TOOLS,
            tool_choice="auto",
        )
        choice = response.choices[0]
        msg = choice.message
        if msg.tool_calls:
            all_messages.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in msg.tool_calls
                ],
            })
            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = run_tool(tc.function.name, args, get_engine, connector)
                all_messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})
            continue
        return (msg.content or "").strip()
    return ""
