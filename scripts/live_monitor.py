#!/usr/bin/env python3
"""Real-time monitoring script for Apex Decision Engine."""

import sys
import time
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from engine.core.decision_engine import DecisionEngine


def main() -> int:
    """Run engine in a loop, printing status."""
    engine = DecisionEngine(portfolio_value=1_000_000.0, data_dir=project_root / "data")
    print("Apex Decision Engine - Live Monitor")
    print("Press Ctrl+C to stop\n")

    try:
        while True:
            output = engine.run()
            allocated = [a for a in output.allocated_trades if not a.rejected]
            print(f"[{time.strftime('%H:%M:%S')}] Signals: {len(output.signals)} | "
                  f"Candidates: {len(output.trade_candidates)} | "
                  f"Allocated: {len(allocated)}")
            for a in allocated[:3]:
                t = a.scored_trade.candidate
                print(f"  - {t.symbol} ({t.strategy}) conf={a.scored_trade.confidence_score:.1f}")
            print()
            time.sleep(60)
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
