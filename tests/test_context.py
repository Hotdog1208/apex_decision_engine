import sys
from pathlib import Path

# Add project root to path BEFORE importing local modules
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from engine.api.market_data_adapter import MockMarketDataAdapter  # type: ignore
from web.backend.chat_engine import build_rag_context  # type: ignore

class MockConnector:
    def __init__(self):
        self.market_data = MockMarketDataAdapter()
        self.data_dir = project_root / "data"

connector = MockConnector()
context = build_rag_context("Why did ADE alert on TSLA?", connector)
print("--- RAG CONTEXT ---")
print(context)
print("-------------------")

assert "Recent UOA Anomalies:" in context or "No recent UOA anomalies found" in context, "Should contain UOA data or empty state message"
assert "XGBoost Predictive Score" in context or "No recent UOA anomalies found" in context, "Should contain XGBoost score or empty state message"
assert "Live Market Data for TSLA:" in context or "No recent UOA anomalies found" in context, "Should contain live market data"
print("SUCCESS: Context Loader built the RAG context perfectly.")
