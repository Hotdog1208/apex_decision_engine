"""Mock data services for alerts, news, calendar, screener. Replace with real APIs later."""

from datetime import datetime, timedelta
from typing import Any, Dict, List


def get_mock_alerts(engine_output: Any = None) -> List[Dict[str, Any]]:
    """Generate mock alerts from engine output or static samples."""
    alerts = []
    if engine_output and hasattr(engine_output, "trade_outputs"):
        for i, t in enumerate(engine_output.trade_outputs[:5]):
            alerts.append({
                "id": f"alert-{i}-{t.get('symbol', '')}",
                "type": "opportunity",
                "symbol": t.get("symbol"),
                "asset_class": t.get("asset_class"),
                "title": f"{t.get('strategy', '')} setup: {t.get('symbol')}",
                "message": f"Confidence {t.get('confidence_score', 0):.0f}/100. {t.get('direction', '')}.",
                "confidence": t.get("confidence_score", 0),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "read": False,
                "action_url": f"/trading",
            })
    if not alerts:
        alerts = [
            {"id": "alert-1", "type": "breakout", "symbol": "AAPL", "asset_class": "stock", "title": "Breakout alert: AAPL", "message": "Price above 20-day resistance. Confidence 78/100.", "confidence": 78, "timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat() + "Z", "read": False, "action_url": "/charts?symbol=AAPL"},
            {"id": "alert-2", "type": "opportunity", "symbol": "NVDA", "asset_class": "stock", "title": "Momentum: NVDA", "message": "Trend up, momentum 100. Confidence 86/100.", "confidence": 86, "timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat() + "Z", "read": False, "action_url": "/trading"},
        ]
    return alerts


def get_mock_news() -> List[Dict[str, Any]]:
    """Mock news feed with sentiment."""
    return [
        {"id": "n1", "headline": "Fed signals rate path unchanged; markets edge higher", "source": "Reuters", "timestamp": datetime.utcnow().isoformat() + "Z", "sentiment": 72, "category": "market", "symbols": ["SPY", "QQQ"], "summary": "Federal Reserve officials indicated policy remains data-dependent. Major indices up slightly."},
        {"id": "n2", "headline": "Tech earnings beat expectations; sector leads", "source": "CNBC", "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z", "sentiment": 85, "category": "earnings", "symbols": ["AAPL", "MSFT", "NVDA"], "summary": "Major tech companies report strong results. Sector up 1.2%."},
        {"id": "n3", "headline": "Oil prices drop on demand concerns", "source": "Bloomberg", "timestamp": (datetime.utcnow() - timedelta(hours=2)).isoformat() + "Z", "sentiment": 28, "category": "sector", "symbols": ["XOM", "CL"], "summary": "Crude falls below key level. Energy sector under pressure."},
    ]


def get_mock_calendar() -> List[Dict[str, Any]]:
    """Mock economic calendar."""
    base = datetime.utcnow().date()
    return [
        {"id": "ec1", "date": (base + timedelta(days=1)).isoformat(), "time": "14:00", "event": "FOMC Meeting Minutes", "impact": "high", "forecast": "Hawkish tone expected"},
        {"id": "ec2", "date": (base + timedelta(days=3)).isoformat(), "time": "08:30", "event": "Non-Farm Payrolls", "impact": "high", "forecast": "+180K"},
        {"id": "ec3", "date": (base + timedelta(days=5)).isoformat(), "time": "10:00", "event": "Consumer Sentiment", "impact": "medium", "forecast": "72.5"},
    ]


def get_screener_results(filters: Dict[str, Any], snapshot: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Filter stocks from snapshot by screener criteria."""
    stocks = snapshot.get("stocks", [])
    results = []
    min_price = filters.get("min_price", 0)
    max_price = filters.get("max_price", 10000)
    min_volume = filters.get("min_volume", 0)
    sectors = filters.get("sectors", [])
    min_rsi = filters.get("min_rsi", 0)
    max_rsi = filters.get("max_rsi", 100)
    for s in stocks:
        price = s.get("price", 0)
        if price < min_price or price > max_price:
            continue
        if s.get("volume", 0) < min_volume:
            continue
        if sectors and s.get("sector") not in sectors:
            continue
        ret = s.get("returns_20d", 0) or 0
        vol = s.get("volatility_20d", 0.2) or 0.2
        rsi_approx = 50 + (ret / 0.02) * 25 if vol else 50
        rsi_approx = max(0, min(100, rsi_approx))
        if rsi_approx < min_rsi or rsi_approx > max_rsi:
            continue
        results.append({
            **s,
            "rsi_approx": round(rsi_approx, 1),
            "score": min(100, 50 + (ret or 0) * 200),
        })
    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    return results


def get_heatmap_data(snapshot: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Sector/symbol heatmap from snapshot."""
    stocks = snapshot.get("stocks", [])
    return [
        {"symbol": s["symbol"], "sector": s.get("sector", "Unknown"), "change_pct": (s.get("returns_20d") or 0) * 100, "price": s.get("price"), "volume": s.get("volume")}
        for s in stocks
    ]
