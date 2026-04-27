"""
Utility service to fetch and score Unusual Options Activity (UOA) using the XGBoost pipeline.
"""
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from engine.ml_models.uoa_xgboost import UOAModelPipeline

logger = logging.getLogger(__name__)

# Project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
UOA_DATA_FILE = PROJECT_ROOT / "data" / "uoa_anomalies.json"

def get_uoa_score(symbol: str, history: list) -> Optional[Dict[str, Any]]:
    """
    Find the latest anomaly for a symbol and return its XGBoost breakout probability.
    """
    if not UOA_DATA_FILE.exists():
        return None
    
    try:
        with open(UOA_DATA_FILE, "r", encoding="utf-8-sig") as f:
            content = f.read().strip()
            if not content:
                return None
            anomalies = json.loads(content)
    except Exception as e:
        logger.error(f"Failed to load UOA data: {e}")
        return None
    
    # Find the most recent anomaly for this symbol
    symbol_anomalies = [a for a in anomalies if a.get("ticker") == symbol or a.get("symbol") == symbol]
    if not symbol_anomalies:
        return None
    
    # Sort by timestamp descending
    symbol_anomalies.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    latest_anomaly = symbol_anomalies[0]
    
    pipeline = UOAModelPipeline()
    try:
        prob = pipeline.predict(latest_anomaly, history)
        
        # Plain-English label
        if prob < 0.3:
            label = "No unusual options activity"
        elif prob < 0.6:
            label = "Moderate unusual activity"
        else:
            label = "Strong unusual options activity detected"
            
        return {
            "score": round(prob, 2),
            "label": label,
            "type": latest_anomaly.get("type"),
            "strike": latest_anomaly.get("strike"),
            "expiry": latest_anomaly.get("expiry")
        }
    except Exception as e:
        logger.error(f"XGBoost prediction failed for {symbol}: {e}")
        return None
