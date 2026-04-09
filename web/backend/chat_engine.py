"""
AI Trading Chatbot for Apex Decision Engine.
Uses Google Gemini API with RAG (Retrieval-Augmented Generation) pipeline.
"""

import json
import os
import logging
from typing import Any, Callable, Dict, List
import google.generativeai as genai  # type: ignore
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
            # We just return the first uppercase looking ticker, favoring known if possible
            if w in known:
                return w
    
    # Fallback to TSLA or whatever is in the message
    for w in message.upper().split():
        if len(w) <= 4 and w.isalpha():
            return w
    return ""

def build_rag_context(user_message: str, connector: Any) -> str:
    """Build the RAG context string by querying local data and the ML model."""
    ticker = extract_ticker(user_message)
    context_blocks = []
    
    # 1. Read UOA Anomalies
    uoa_file = connector.data_dir / "uoa_anomalies.json"
    anomalies = []
    try:
        if uoa_file.exists() and uoa_file.stat().st_size > 0:
            with open(uoa_file, "r") as f:
                data: List[Dict[str, Any]] = json.load(f)  # type: ignore
                if ticker:
                    anomalies = [a for a in data if a.get("ticker") == ticker]
                if not anomalies and data:
                    anomalies = list(data)[-5:]  # Get the last 5 if no ticker match  # type: ignore
    except Exception as e:
        logger.error(f"Failed to load UOA data: {e}")
            
    if not anomalies:
        context_blocks.append("No recent UOA anomalies found in the local database.")
    else:
        context_blocks.append("Recent UOA Anomalies:")
        for a in anomalies[-3:]:  # type: ignore
            context_blocks.append(json.dumps(a))
            
    # 2. ML Probability Score
    if anomalies:
        try:
            ml_pipeline = UOAModelPipeline(data_source=os.environ.get("DATA_SOURCE", "mock"))
            ml_pipeline.load_model()
            
            # Predict the most recent anomaly
            latest_anomaly = anomalies[-1]
            target_ticker = latest_anomaly.get("ticker", ticker)
            
            # We need recent history to engineer features
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
            
    # 3. Live Market Data
    if ticker:
        try:
            quote = connector.market_data.fetch_quote(ticker)
            context_blocks.append(f"Live Market Data for {ticker}: {json.dumps(quote)}")
        except Exception as e:
            logger.error(f"Failed to fetch market data: {e}")
            
    full_context = "\\n".join(context_blocks)
    return full_context

def _demo_reply(user_message: str, get_engine: Callable, connector: Any) -> str:
    """Smart demo responses when Gemini is not configured."""
    msg = (user_message or "").lower().strip()
    return "I am the ADE Institutional Risk Manager. Please set the GEMINI_API_KEY in the .env file to enable the RAG Chatbot."

async def chat_completion(
    messages: List[Dict[str, str]],
    get_engine: Callable,
    connector: Any,
) -> str:
    """Call Google Gemini API with RAG context."""
    uoa_file = connector.data_dir / "uoa_anomalies.json"
    has_valid_data = False
    try:
        if uoa_file.exists() and uoa_file.stat().st_size > 0:
            with open(uoa_file, "r") as f:
                if json.load(f):
                    has_valid_data = True
    except Exception:
        pass
        
    if not has_valid_data:
        return "System is actively scanning E-Trade Sandbox for unusual options activity. No anomalies detected yet."

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        last_msg = (messages[-1].get("content", "") or "").strip() if messages else ""
        return _demo_reply(last_msg, get_engine, connector)

    try:
        genai.configure(api_key=api_key)  # type: ignore
        model_name = os.environ.get("GEMINI_CHAT_MODEL", "gemini-1.5-pro")
        model = genai.GenerativeModel(model_name)  # type: ignore
    except Exception as e:
        return f"[Error configuring Gemini API: {e}]"

    # Extract user message
    user_message = next((m.get("content", "") for m in reversed(messages) if m.get("role") == "user"), "")
    
    # Build RAG Context
    rag_context = build_rag_context(user_message, connector)
    
    # Inject context into system prompt instruction
    system_instruction = CHAT_SYSTEM_PROMPT + "\\n\\n--- CURRENT RAG CONTEXT DATA ---\\n" + rag_context
    
    # Format messages for Gemini
    # Gemini uses 'user' and 'model' as roles. And 'developer' or 'system' logic is often passed as a system instruction (available in v1.5 API) or prepended.
    # We will prepend it to the user's context for max compatibility.
    
    # If the model strongly supports system_instruction, we could pass it in GenerativeModel, but prepending to the first user prompt is robust.
    gemini_messages = []
    
    # Start with the system prompt injected into the FIRST user message
    first_user_found = False
    
    for msg in messages:
        role = "user" if msg.get("role") == "user" else "model"
        content = msg.get("content", "")
        
        if role == "user" and not first_user_found:
            content = f"SYSTEM INSTRUCTIONS:\\n{system_instruction}\\n\\nUSER QUERY:\\n{content}"
            first_user_found = True
            
        gemini_messages.append({"role": role, "parts": [content]})

    try:
        response = model.generate_content(gemini_messages)
        return response.text
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        return f"Error communicating with Gemini: {e}"
