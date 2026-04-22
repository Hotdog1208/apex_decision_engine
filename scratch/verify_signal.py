import asyncio
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load env mockup
project_root = Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")

import sys
sys.path.insert(0, str(project_root))

from web.backend.app import _generate_claude_signal, connector, paper_trader

async def test_signal():
    print("Generating signal for AAPL...")
    try:
        signal = await _generate_claude_signal("AAPL", connector)
        print("Signal generated successfully!")
        print(json.dumps(signal, indent=2))
        
        # Check paper log
        log_file = project_root / "data" / "paper_trade_log.json"
        if log_file.exists():
            with open(log_file, "r") as f:
                logs = json.load(f)
                print(f"Log entries: {len(logs)}")
                if len(logs) > 0:
                    print("Latest log entry found!")
        else:
            print("Log file NOT found!")
            
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_signal())
