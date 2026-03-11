import asyncio
import os
import sys
from pathlib import Path

# Add project root to path BEFORE importing local modules
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from config.system_config import get_default_system_config  # type: ignore
from engine.core.decision_engine import DecisionEngine  # type: ignore
from engine.api.market_data_adapter import MockMarketDataAdapter  # type: ignore
from web.backend.chat_engine import chat_completion  # type: ignore
from dotenv import load_dotenv  # type: ignore

load_dotenv()

async def test_chat():
    print("Testing RAG Chatbot with Gemini...")
    print(f"GEMINI_API_KEY set: {bool(os.environ.get('GEMINI_API_KEY'))}")
    
    # Mock connector
    class MockConnector:
        def __init__(self):
            self.market_data = MockMarketDataAdapter()
            self.data_dir = project_root / "data"
    
    connector = MockConnector()
    
    def get_engine():
        return DecisionEngine(portfolio_value=1_000_000, data_dir=project_root / "data")
        
    messages = [{"role": "user", "content": "Why did ADE just alert me on TSLA? What is the predictive score?"}]
    
    try:
        reply = await chat_completion(messages, get_engine, connector)
        print("\n--- CHATBOT REPLY ---")
        print(reply)
        print("---------------------")
        
        reply_str = str(reply)
        # Check if the markdown sections are present
        assert "The Smart Money Data" in reply_str, "Missing 'The Smart Money Data' section"
        assert "The Predictive Score" in reply_str, "Missing 'The Predictive Score' section"
        assert "Risk Management" in reply_str, "Missing 'Risk Management' section"
        
        print("\nSUCCESS: RAG Chatbot formatted output correctly!")
    except Exception as e:
        print(f"\nFAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_chat())
