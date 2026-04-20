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
from web.backend.chat_engine import chat  # type: ignore
from dotenv import load_dotenv  # type: ignore

load_dotenv()

async def _test_chat():
    print("Testing RAG Chatbot with Claude...")
    
    # Mock connector
    class MockConnector:
        def __init__(self):
            self.market_data = MockMarketDataAdapter()
            self.data_dir = project_root / "data"
    
    connector = MockConnector()
    
    try:
        reply = await chat("test_sess", "Why did ADE just alert me on TSLA? What is the predictive score?")
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

def test_chat_sync():
    asyncio.run(_test_chat())

if __name__ == "__main__":
    test_chat_sync()
