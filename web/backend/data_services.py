"""Data services for alerts, news, calendar, screener. Uses Finnhub when FINNHUB_API_KEY is set."""

import os
from datetime import datetime, timedelta
from typing import Any, Dict, List

FINNHUB_BASE = "https://finnhub.io/api/v1"


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


def _direction_from_sentiment(s: int) -> int:
    """Map sentiment 0-100 to sector direction: 0=falling, 50=same, 100=up."""
    if s <= 35:
        return 0
    if s >= 65:
        return 100
    return 50


def get_mock_news() -> List[Dict[str, Any]]:
    """Mock news feed with sentiment, direction (0/50/100), url, image."""
    base = [
        {"headline": "Fed signals rate path unchanged; markets edge higher", "source": "Reuters", "sentiment": 72, "category": "market", "symbols": ["SPY", "QQQ"], "summary": "Federal Reserve officials indicated policy remains data-dependent. Major indices up slightly.", "url": "https://www.reuters.com/markets/", "image": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800"},
        {"headline": "Tech earnings beat expectations; sector leads", "source": "CNBC", "sentiment": 85, "category": "earnings", "symbols": ["AAPL", "MSFT", "NVDA"], "summary": "Major tech companies report strong results. Sector up 1.2%.", "url": "https://www.cnbc.com/technology/", "image": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800"},
        {"headline": "Oil prices drop on demand concerns", "source": "Bloomberg", "sentiment": 28, "category": "sector", "symbols": ["XOM", "CL"], "summary": "Crude falls below key level. Energy sector under pressure.", "url": "https://www.bloomberg.com/energy", "image": "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800"},
        {"headline": "NVDA hits record high on AI demand outlook", "source": "Reuters", "sentiment": 88, "category": "earnings", "symbols": ["NVDA"], "summary": "Chipmaker rises 4% as data center revenue forecasts exceed estimates.", "url": "https://www.reuters.com/technology/", "image": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800"},
        {"headline": "Bank stocks rally on strong loan growth", "source": "CNBC", "sentiment": 65, "category": "sector", "symbols": ["JPM", "BAC"], "summary": "Financials gain as Q4 results show resilient consumer spending.", "url": "https://www.cnbc.com/banking/", "image": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800"},
        {"headline": "Consumer confidence surprises to upside", "source": "Bloomberg", "sentiment": 75, "category": "market", "symbols": ["SPY"], "summary": "Survey beats expectations, supporting soft-landing narrative.", "url": "https://www.bloomberg.com/economics", "image": "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800"},
        {"headline": "META announces new AI initiatives", "source": "Reuters", "sentiment": 78, "category": "earnings", "symbols": ["META"], "summary": "Social giant unveils LLM projects; ad revenue guidance raised.", "url": "https://www.reuters.com/social-media/", "image": "https://images.unsplash.com/photo-1676299080923-2b37547b1d3e?w=800"},
    ]
    out = []
    for i, n in enumerate(base):
        ts = datetime.utcnow() - timedelta(hours=i)
        direction = _direction_from_sentiment(n["sentiment"])
        out.append({
            "id": f"n{i+1}",
            "headline": n["headline"],
            "source": n["source"],
            "timestamp": ts.isoformat() + "Z",
            "sentiment": n["sentiment"],
            "direction": direction,
            "category": n["category"],
            "symbols": n["symbols"],
            "summary": n["summary"],
            "url": n.get("url", ""),
            "image": n.get("image", ""),
        })
    return out


def get_news() -> List[Dict[str, Any]]:
    """Return market news from Finnhub if FINNHUB_API_KEY is set, else mock."""
    api_key = (os.environ.get("FINNHUB_API_KEY") or "").strip()
    if not api_key:
        return get_mock_news()
    try:
        import requests
        r = requests.get(
            f"{FINNHUB_BASE}/news",
            params={"category": "general", "token": api_key},
            timeout=10,
        )
        r.raise_for_status()
        raw = r.json()
        if not isinstance(raw, list):
            raw = []
        out = []
        for i, item in enumerate(raw[:30]):
            ts = item.get("datetime") or 0
            dt = datetime.utcfromtimestamp(ts) if ts else datetime.utcnow()
            headline = item.get("headline") or ""
            summary = item.get("summary") or headline[:200]
            source = item.get("source") or "Finnhub"
            related = item.get("related") or ""
            symbols = [s.strip() for s in related.split(",") if s.strip()][:5] if related else []
            url = item.get("url") or item.get("link") or ""
            image = item.get("image") or item.get("thumbnail") or ""
            raw_sentiment = item.get("sentiment", 50)
            sentiment = min(100, max(0, int(raw_sentiment * 100) if isinstance(raw_sentiment, (int, float)) else 50))
            direction = _direction_from_sentiment(sentiment)
            out.append({
                "id": f"fh-{item.get('id', i)}",
                "headline": headline,
                "source": source,
                "timestamp": dt.isoformat() + "Z",
                "sentiment": sentiment,
                "direction": direction,
                "category": (item.get("category") or "market").lower().replace(" ", "_"),
                "symbols": symbols,
                "summary": summary,
                "url": url,
                "image": image,
            })
        return out if out else get_mock_news()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Finnhub news failed: %s", e)
        return get_mock_news()


def _calendar_direction(impact: str, event: str) -> int:
    """Direction 0=falling, 50=same, 100=up for calendar event (market impact expectation)."""
    impact = (impact or "").lower()
    if "fomc" in event.lower() or "fed" in event.lower() or "cpi" in event.lower():
        return 50  # neutral until data
    if impact == "high":
        return 100  # high impact often moves market (direction from context)
    if impact == "medium":
        return 50
    return 50


def get_mock_calendar() -> List[Dict[str, Any]]:
    """Mock economic calendar with direction, url, image."""
    base = datetime.utcnow().date()
    econ_cal_url = "https://www.investing.com/economic-calendar/"
    default_img = "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600"
    events = [
        {"event": "FOMC Meeting Minutes", "impact": "high", "forecast": "Hawkish tone expected", "image": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600"},
        {"event": "Initial Jobless Claims", "impact": "medium", "forecast": "215K", "image": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600"},
        {"event": "Consumer Sentiment", "impact": "medium", "forecast": "72.5", "image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600"},
        {"event": "Non-Farm Payrolls", "impact": "high", "forecast": "+180K", "image": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600"},
        {"event": "ISM Manufacturing PMI", "impact": "high", "forecast": "49.2", "image": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600"},
        {"event": "Fed Chair Speech", "impact": "high", "forecast": "Policy outlook", "image": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600"},
        {"event": "CPI (MoM)", "impact": "high", "forecast": "+0.2%", "image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600"},
        {"event": "Retail Sales", "impact": "medium", "forecast": "+0.3%", "image": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600"},
    ]
    out = []
    for i, ev in enumerate(events):
        day = base + timedelta(days=min(i, 10))
        out.append({
            "id": f"ec{i+1}",
            "date": day.isoformat(),
            "time": "14:00" if "FOMC" in ev["event"] or "Fed" in ev["event"] else "08:30",
            "event": ev["event"],
            "impact": ev["impact"],
            "forecast": ev["forecast"],
            "direction": _calendar_direction(ev["impact"], ev["event"]),
            "url": econ_cal_url,
            "image": ev.get("image", default_img),
        })
    return out


def get_calendar() -> List[Dict[str, Any]]:
    """Return economic calendar from Finnhub if FINNHUB_API_KEY is set, else mock."""
    api_key = (os.environ.get("FINNHUB_API_KEY") or "").strip()
    if not api_key:
        return get_mock_calendar()
    try:
        import requests
        today = datetime.utcnow().date()
        from_str = today.isoformat()
        to_str = (today + timedelta(days=31)).isoformat()
        r = requests.get(
            f"{FINNHUB_BASE}/calendar/economic",
            params={"from": from_str, "to": to_str, "token": api_key},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json() or {}
        events = data.get("economicCalendar") or data.get("economic") or []
        if not isinstance(events, list):
            events = []
        econ_cal_url = "https://www.investing.com/economic-calendar/"
        default_img = "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600"
        out = []
        for i, ev in enumerate(events[:50]):
            date_str = ev.get("date") or ev.get("time") or from_str
            if isinstance(date_str, (int, float)):
                date_str = datetime.utcfromtimestamp(date_str).date().isoformat()
            time_str = ev.get("time", "") if isinstance(ev.get("time"), str) else ""
            event_name = ev.get("event") or ev.get("name") or "Event"
            impact = (ev.get("impact") or "medium").lower()
            out.append({
                "id": f"ec-{ev.get('id', i)}",
                "date": date_str[:10] if len(date_str) >= 10 else date_str,
                "time": time_str or "00:00",
                "event": event_name,
                "impact": impact,
                "forecast": ev.get("estimate") or ev.get("forecast") or "",
                "direction": _calendar_direction(impact, event_name),
                "url": ev.get("url") or econ_cal_url,
                "image": ev.get("image") or default_img,
            })
        return out if out else get_mock_calendar()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Finnhub calendar failed: %s", e)
        return get_mock_calendar()


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
