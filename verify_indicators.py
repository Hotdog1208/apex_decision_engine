import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.core.indicators import calculate_indicators, detect_market_regime

# Mock data
mock_series = [
    {"time": i, "open": 100+i, "high": 105+i, "low": 95+i, "close": 101+i, "volume": 1000}
    for i in range(250)
]

try:
    print("Testing calculate_indicators...")
    indicators = calculate_indicators(mock_series)
    print(f"RSI: {indicators.get('rsi')}")
    print(f"MACD Line: {indicators.get('macd', {}).get('line')}")
    print(f"ATR: {indicators.get('atr')}")
    
    print("\nTesting detect_market_regime...")
    regime = detect_market_regime(mock_series)
    print(f"Regime: {regime.get('regime')}")
    print(f"Note: {regime.get('regime_note')}")
    
    print("\nSUCCESS: All indicators calculated correctly.")
except Exception as e:
    print(f"\nFAILURE: {e}")
    sys.exit(1)
