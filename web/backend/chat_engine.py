"""
AI Trading Chatbot for Apex Decision Engine.
Uses Anthropic Claude API with RAG (Retrieval-Augmented Generation) pipeline.
"""

import json
import os
import logging
from typing import Any, Callable, Dict, List, Optional
import anthropic  # type: ignore
from engine.ml_models.uoa_xgboost import UOAModelPipeline  # type: ignore

logger = logging.getLogger(__name__)

CHAT_SYSTEM_PROMPT = """You are a professional Institutional Risk Manager and trading analyst for the Apex Decision Engine (ADE).

Your Role:
Provide data-driven trading intelligence, focusing specifically on Unusual Options Activity (UOA), predictive ML models (XGBoost), and live market data.

Formatting Rules - YOU MUST FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
### The Smart Money Data
(Explain the latest UOA anomaly data provided in the context. Discuss volume vs open interest, moneyness, and how smart money is positioned).

### The Predictive Score
(Discuss the XGBoost probability score provided in the context. Is it a high-conviction breakout signal? Do the technicals align with the flow?)

### Risk Management (Stop Loss / Take Profit)
(Provide actionable risk management advice based on the provided price action. Where is the logical stop loss? What is the logical take profit? Consider support/resistance and volatility).

Critical Rules:
- NEVER give generic financial advice.
- ONLY base your analysis on the concrete mathematical data provided in the System Prompt Context.
- Do NOT generate generic responses. If no context is provided, state that you need data to run analysis.
- End your analysis with: "*This is analysis based on mathematical probabilities, not financial advice.*"
"""

def extract_ticker(message: str) -> str:
    """Attempt to extract a ticker symbol from the user's message."""
    known = ("AAPL", "MSFT", "NVDA", "JPM", "XOM", "GOOGL", "META", "TSLA", "AMZN", "SPY")
    for w in message.upper().replace('?','').replace('.','').replace(',','').split():
        if w in known or (len(w) <= 4 and w.isalpha()):
            if w in known:
                return w
    
    for w in message.upper().split():
        if len(w) <= 4 and w.isalpha():
            return w
    return ""

def build_rag_context(user_message: str, connector: Any) -> str:
    """Build the RAG context string by querying local data and the ML model."""
    ticker = extract_ticker(user_message)
    context_blocks = []
    
    uoa_file = connector.data_dir / "uoa_anomalies.json"
    anomalies = []
    try:
        if uoa_file.exists() and uoa_file.stat().st_size > 0:
            with open(uoa_file, "r") as f:
                data: List[Dict[str, Any]] = json.load(f)
                if ticker:
                    anomalies = [a for a in data if a.get("ticker") == ticker]
                if not anomalies and data:
                    anomalies = list(data)[-5:]
    except Exception as e:
        logger.error(f"Failed to load UOA data: {e}")
            
    if not anomalies:
        context_blocks.append("No recent UOA anomalies found in the local database.")
    else:
        context_blocks.append("Recent UOA Anomalies:")
        for a in anomalies[-3:]:
            context_blocks.append(json.dumps(a))
            
    if anomalies:
        try:
            ml_pipeline = UOAModelPipeline(data_source=os.environ.get("DATA_SOURCE", "mock"))
            ml_pipeline.load_model()
            
            latest_anomaly = anomalies[-1]
            target_ticker = latest_anomaly.get("ticker", ticker)
            
            hist = connector.market_data.fetch_ohlc(target_ticker, period="3mo", interval="1d")
            series = hist.get("series", [])
            
            if series:
                prob = ml_pipeline.predict(latest_anomaly, series)
                context_blocks.append(f"XGBoost Predictive Score for {target_ticker}: {prob*100:.2f}% probability of 3%+ directional breakout.")
            else:
                context_blocks.append(f"Could not fetch history for {target_ticker} to calculate ML score.")
        except Exception as e:
            logger.error(f"Failed to run ML prediction: {e}")
            context_blocks.append("ML Pipeline temporarily unavailable.")
            
    if ticker:
        try:
            quote = connector.market_data.fetch_quote(ticker)
            context_blocks.append(f"Live Market Data for {ticker}: {json.dumps(quote)}")
        except Exception as e:
            logger.error(f"Failed to fetch market data: {e}")
            
    full_context = "\n".join(context_blocks)
    return full_context

def _demo_reply(user_message: str, get_engine: Callable, connector: Any) -> str:
    """Smart demo responses when Claude is not configured."""
    msg = (user_message or "").lower().strip()
    return "I am the ADE Institutional Risk Manager. Please set the ANTHROPIC_API_KEY in the .env file to enable the RAG Chatbot."

async def chat(
    session_id: str,
    message: str,
    signal_context: Optional[Dict[str, Any]] = None,
) -> str:
    """Entry point for AI chat, supports signal context forwarding."""
    # Note: In a real app, we'd load session history from a DB. 
    # For this MVP upgrade, we'll focus on the RAG and context integration.
    
    # Importing dependencies locally to avoid circular imports / late binding
    from web.backend.app import connector, get_engine 

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return _demo_reply(message, get_engine, connector)

    try:
        client = anthropic.Anthropic(api_key=api_key)
        model_name = os.environ.get("ANTHROPIC_CHAT_MODEL", "claude-sonnet-4-20250514")
        
        # Build RAG Context
        rag_context = build_rag_context(message, connector)
        
        # Build System Prompt with optional Signal Context
        system_prompt = CHAT_SYSTEM_PROMPT
        if signal_context:
            system_prompt += f"\n\n--- TARGET SIGNAL CONTEXT ---\n{json.dumps(signal_context, indent=2)}\n"
            system_prompt += "\nThe user is asking about the specific signal above. Use the provided levels, rationales, and indicators in your analysis.\n"

        # Create message with Anthropic
        response = client.messages.create(
            model=model_name,
            max_tokens=1500,
            system=system_prompt,
            messages=[
                {"role": "user", "content": f"{message}\n\n[Context: {rag_context}]"}
            ]
        )
        return response.content[0].text
    except Exception as e:
        logger.exception(f"Claude chat error: {e}")
        return f"Uplink unstable. Error: {str(e)}"
