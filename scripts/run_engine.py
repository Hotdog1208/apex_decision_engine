#!/usr/bin/env python3
"""
Run script for Apex Decision Engine.
End-to-end execution: ingest → signal → strategy → score → allocate → output.
"""

import json
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from engine.core.decision_engine import DecisionEngine


def main() -> int:
    """Run decision engine and print trade outputs."""
    data_dir = project_root / "data"
    engine = DecisionEngine(portfolio_value=1_000_000.0, data_dir=data_dir)

    output = engine.run()

    print("=== APEX DECISION ENGINE - TRADE OUTPUTS ===\n")
    print(f"Signals processed: {len(output.signals)}")
    print(f"Trade candidates: {len(output.trade_candidates)}")
    print(f"Scored trades: {len(output.scored_trades)}")
    print(f"Allocated (non-rejected): {sum(1 for a in output.allocated_trades if not a.rejected)}\n")

    for i, trade in enumerate(output.trade_outputs, 1):
        print(f"--- Trade {i} ---")
        print(json.dumps(trade, indent=2, default=str))
        print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
