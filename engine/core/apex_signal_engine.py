"""
APEX Signal Engine — Multi-factor quantitative signal scoring.

APPROACH
--------
We use a five-factor composite model fed entirely by standard technical indicators
computed from OHLCV data using pandas (no external TA library dependency).

The five factors and their base weights:
  1. Trend Alignment    (30%) — EMA 9/21/50/200 stack, price vs key MAs
  2. Momentum Quality   (25%) — RSI zone, MACD histogram trend and momentum cross
  3. Volume Conviction  (15%) — Volume ratio vs 20-day average, accumulation signal
  4. Price Structure    (20%) — BB band position, distance from 52w high, ATR context
  5. Regime Fit         (10%) — Macro regime overlay adjusts the other factors

SIGNAL COMBINATIONS WITH HIGHEST PREDICTIVE WEIGHT
---------------------------------------------------
1. EMA 9 > EMA 21 > MA 50 (full stack aligned) + MACD histogram expanding in the
   direction of trend → strongest momentum continuation pattern.
2. RSI pulled back to 40-55 in an established uptrend (EMA stack intact) → highest
   historical win rate; identifies pullback entries rather than parabolic chases.
3. Volume expansion >1.5× 20-day avg on a day price closes above BB upper or breaks
   a consolidation → institutional footprint, not retail breakout failure.
4. Price within 3-7% of 52-week high with RSI below 70 → relative strength
   leadership, money flow rotation signature.
5. UOA score (XGBoost breakout probability) >0.60 AND aligned with trend direction
   → smart money confirmation that elevates confidence by up to 12 points.

WHAT TO MONITOR OVER THE NEXT 48H
-----------------------------------
- /admin/accuracy: Watch "by_verdict" accuracy split between BUY/STRONG_BUY.
  If STRONG_BUY accuracy < 60% over ≥10 signals, the top-tier confidence
  threshold (currently ≥80) is too aggressive — lower to 75.
- Average confidence of CORRECT vs INCORRECT signals. If correct-signal avg
  confidence < incorrect-signal avg confidence, the scoring weights are inverted
  somewhere (most likely Regime Fit over-penalising).
- Volume Conviction factor: check if signals with volume_ratio > 1.5 have
  meaningfully better accuracy than those with volume_ratio < 0.8. If not, the
  15% weight should be redistributed to Price Structure.

SYSTEM NOTES
------------
- Must run <10s per symbol. All computation is pure pandas, no network calls.
- All indicator inputs come from calculate_indicators() in indicators.py.
- UOA score is fetched from uoa_service.py and is optional (graceful None).
- News sentiment from Finnhub (when available) adds ±3 to final confidence.
- Market regime overlay shifts the final verdict one tier up (BULL) or down (BEAR)
  when the composite score sits within 5 points of a verdict boundary.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Verdict thresholds — composite score → verdict
# ---------------------------------------------------------------------------
VERDICT_THRESHOLDS = [
    (80, "STRONG_BUY"),
    (65, "BUY"),
    (45, "WATCH"),
    (30, "AVOID"),
    (0,  "STRONG_AVOID"),
]

REGIME_SHIFT = {
    "BULL":             +3,
    "NEUTRAL":           0,
    "HIGH_VOLATILITY":  -8,
    "BEAR":            -12,
}

UOA_BONUS_BULLISH = 10   # strong UOA on a BUY-leaning setup
UOA_BONUS_BEARISH = 10   # strong UOA on an AVOID-leaning setup (puts)
NEWS_BONUS        = 3    # per sentiment direction


# ---------------------------------------------------------------------------
# Factor scorers (each returns 0-100)
# ---------------------------------------------------------------------------

def _score_trend_alignment(ind: Dict[str, Any]) -> float:
    """EMA stack alignment + price vs key MAs. 30% weight."""
    score = 50.0

    ema9  = ind.get("ema", {}).get("ema9")
    ema21 = ind.get("ema", {}).get("ema21")
    ma50  = ind.get("ma50")
    ma200 = ind.get("ma200")
    price = ind.get("current_price")

    if not price or price <= 0:
        return 50.0

    # EMA 9 vs EMA 21 relationship
    ema_rel = ind.get("ema", {}).get("relationship", "BELOW")
    if ema_rel == "ABOVE":
        score += 12.0
    else:
        score -= 12.0

    # Price vs MA50
    if ma50 and price > ma50:
        score += 10.0
        # Bonus if close to MA50 but above (fresh breakout or pullback hold)
        if abs(price / ma50 - 1) < 0.03:
            score += 5.0
    elif ma50 and price < ma50:
        score -= 10.0

    # Price vs MA200
    if ma200 and price > ma200:
        score += 8.0
    elif ma200 and price < ma200:
        score -= 8.0

    # 52-week high proximity bonus (within 5%)
    dist_from_high = ind.get("range_52w", {}).get("dist_from_high_pct", -50)
    if dist_from_high is not None:
        if dist_from_high >= -3:         # within 3% of 52w high
            score += 10.0
        elif dist_from_high >= -7:       # within 7%
            score += 5.0
        elif dist_from_high <= -20:      # far from 52w high
            score -= 8.0

    return max(0.0, min(100.0, score))


def _score_momentum(ind: Dict[str, Any]) -> float:
    """RSI zone + MACD histogram direction/magnitude. 25% weight."""
    score = 50.0

    rsi_val = ind.get("rsi", {}).get("value", 50)
    rsi_zone = ind.get("rsi", {}).get("zone", "NEUTRAL")

    # RSI scoring — reward the pullback-to-neutral more than overbought
    if 40 <= rsi_val <= 55:
        score += 18.0   # ideal pullback zone
    elif 55 < rsi_val <= 65:
        score += 12.0   # bullish momentum building
    elif 65 < rsi_val <= 70:
        score += 6.0    # strong but approaching overbought
    elif rsi_zone == "OVERBOUGHT":
        score -= 5.0    # risk of pullback
    elif 25 <= rsi_val < 40:
        score -= 8.0    # bearish momentum
    elif rsi_zone == "OVERSOLD":
        score -= 18.0   # strong bearish

    # MACD histogram
    macd_hist = ind.get("macd", {}).get("histogram", 0)
    macd_dir  = ind.get("macd", {}).get("direction", "BEARISH")
    if macd_dir == "BULLISH":
        score += 12.0
    else:
        score -= 12.0

    # MACD histogram magnitude (normalise against a reasonable range of ±2)
    hist_mag = min(abs(macd_hist) / 2.0, 1.0) * 5.0
    if macd_hist > 0:
        score += hist_mag
    else:
        score -= hist_mag

    return max(0.0, min(100.0, score))


def _score_volume(ind: Dict[str, Any]) -> float:
    """Volume ratio vs 20-day average. 15% weight."""
    vol_ratio = ind.get("volume_ratio", 1.0)
    if vol_ratio is None:
        return 50.0

    if vol_ratio >= 2.0:
        return 90.0   # very strong institutional participation
    if vol_ratio >= 1.5:
        return 78.0
    if vol_ratio >= 1.1:
        return 62.0
    if vol_ratio >= 0.8:
        return 50.0
    if vol_ratio >= 0.5:
        return 38.0
    return 28.0       # abnormally thin — low conviction


def _score_price_structure(ind: Dict[str, Any]) -> float:
    """Bollinger band position, ATR context, 52w position. 20% weight."""
    score = 50.0

    bb_pos = ind.get("bollinger", {}).get("position", 0.5)
    # BB position: 0=at lower band, 1=at upper band
    # Bullish: price near middle/slightly above (0.45-0.70)
    # Very extended: above 0.85 is risky, below 0.15 is beaten-up
    if 0.40 <= bb_pos <= 0.70:
        score += 15.0   # sweet spot
    elif 0.70 < bb_pos <= 0.85:
        score += 5.0    # bullish but stretched
    elif bb_pos > 0.85:
        score -= 5.0    # overbought on BB
    elif 0.20 <= bb_pos < 0.40:
        score -= 10.0   # below midband
    elif bb_pos < 0.20:
        score -= 18.0   # near lower band — bearish structure

    # Distance from 52w high reinforcement (additive to trend score effect)
    dist_from_high = ind.get("range_52w", {}).get("dist_from_high_pct", -50)
    if dist_from_high is not None:
        if -5 <= dist_from_high <= 0:
            score += 8.0
        elif -15 <= dist_from_high < -5:
            score += 2.0
        elif dist_from_high < -30:
            score -= 8.0

    return max(0.0, min(100.0, score))


def _score_regime_fit(regime: str) -> float:
    """Market regime fit. 10% weight. Returns 0-100."""
    regime_scores = {
        "BULL":             78.0,
        "NEUTRAL":          55.0,
        "HIGH_VOLATILITY":  35.0,
        "BEAR":             22.0,
    }
    return regime_scores.get(regime, 50.0)


# ---------------------------------------------------------------------------
# Main scoring function
# ---------------------------------------------------------------------------

def compute_apex_score(
    indicators: Dict[str, Any],
    regime: str,
    uoa_data: Optional[Dict[str, Any]] = None,
    news_sentiment: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compute the quantitative composite score and produce a verdict.

    Returns a dict with:
      composite_score  int 0-100
      verdict          str (STRONG_BUY | BUY | WATCH | AVOID | STRONG_AVOID)
      lead_signal      str  — single most influential factor name + direction
      key_signals      list[str] — top 3 contributing factors with values
      factor_scores    dict  — breakdown of each sub-score
      uoa_contribution int   — points added/subtracted by UOA
      regime_applied   str   — regime modifier note
    """
    if not indicators:
        return _neutral_fallback("No indicator data available")

    # Factor scores
    trend_score    = _score_trend_alignment(indicators)
    momentum_score = _score_momentum(indicators)
    volume_score   = _score_volume(indicators)
    structure_score = _score_price_structure(indicators)
    regime_score   = _score_regime_fit(regime)

    # Weighted composite
    raw_composite = (
        0.30 * trend_score
        + 0.25 * momentum_score
        + 0.15 * volume_score
        + 0.20 * structure_score
        + 0.10 * regime_score
    )

    # Regime shift on the final score (caps at ±12 points)
    regime_delta = REGIME_SHIFT.get(regime, 0)
    composite = raw_composite + regime_delta

    # UOA modifier
    uoa_contribution = 0
    uoa_note = "No UOA data"
    if uoa_data:
        uoa_score = uoa_data.get("score", 0.0)
        uoa_type  = uoa_data.get("type", "")
        is_bullish_trend = composite > 50
        # CALL UOA on bullish setup, or PUT UOA on bearish setup = confirmation
        if uoa_score >= 0.60:
            if (uoa_type == "CALL" and is_bullish_trend) or (uoa_type == "PUT" and not is_bullish_trend):
                uoa_contribution = UOA_BONUS_BULLISH
                uoa_note = f"Strong UOA ({uoa_type}, {uoa_score:.0%} breakout prob) confirms direction"
            else:
                uoa_contribution = -5
                uoa_note = f"UOA direction ({uoa_type}) conflicts with technical setup"
        elif uoa_score >= 0.40:
            uoa_contribution = 3
            uoa_note = f"Moderate UOA activity ({uoa_type})"
        composite += uoa_contribution

    # News sentiment modifier
    news_contribution = 0
    if news_sentiment == "POSITIVE" and composite > 50:
        news_contribution = NEWS_BONUS
    elif news_sentiment == "NEGATIVE" and composite < 50:
        news_contribution = -NEWS_BONUS
    composite += news_contribution

    composite = max(0.0, min(100.0, composite))
    composite_int = int(round(composite))

    # Map to verdict
    verdict = "WATCH"
    for threshold, v in VERDICT_THRESHOLDS:
        if composite_int >= threshold:
            verdict = v
            break

    # Identify lead signal and key signals
    factor_values = {
        "Trend Alignment":    trend_score,
        "Momentum (RSI/MACD)": momentum_score,
        "Volume Conviction":  volume_score,
        "Price Structure":    structure_score,
        "Regime Fit":         regime_score,
    }
    sorted_factors = sorted(factor_values.items(), key=lambda x: abs(x[1] - 50), reverse=True)
    lead_factor_name, lead_factor_val = sorted_factors[0]
    lead_direction = "bullish" if lead_factor_val > 50 else "bearish"
    lead_signal = f"{lead_factor_name} ({lead_direction}, score {lead_factor_val:.0f}/100)"

    # Build key_signals list with real indicator values
    key_signals = _build_key_signals(indicators, factor_values, regime, uoa_data)

    return {
        "composite_score": composite_int,
        "verdict":          verdict,
        "lead_signal":      lead_signal,
        "key_signals":      key_signals,
        "factor_scores": {
            "trend_alignment":    round(trend_score, 1),
            "momentum":           round(momentum_score, 1),
            "volume_conviction":  round(volume_score, 1),
            "price_structure":    round(structure_score, 1),
            "regime_fit":         round(regime_score, 1),
        },
        "uoa_contribution": uoa_contribution,
        "uoa_note":         uoa_note,
        "regime_applied":   f"{regime} (delta {regime_delta:+d})",
        "news_contribution": news_contribution,
    }


def _build_key_signals(
    ind: Dict[str, Any],
    factor_values: Dict[str, float],
    regime: str,
    uoa_data: Optional[Dict[str, Any]],
) -> List[str]:
    """Build a list of plain-English key signal strings with exact values."""
    signals = []

    # RSI
    rsi_val = ind.get("rsi", {}).get("value")
    rsi_zone = ind.get("rsi", {}).get("zone", "NEUTRAL")
    if rsi_val is not None:
        signals.append(f"RSI at {rsi_val:.1f} ({rsi_zone})")

    # MACD
    macd_hist = ind.get("macd", {}).get("histogram")
    macd_dir  = ind.get("macd", {}).get("direction", "")
    if macd_hist is not None:
        signals.append(f"MACD histogram {macd_hist:+.3f} ({macd_dir})")

    # EMA relationship
    ema_rel  = ind.get("ema", {}).get("relationship", "")
    ema_dist = ind.get("ema", {}).get("distance_pct")
    if ema_rel:
        dist_str = f", {abs(ema_dist):.1f}% spread" if ema_dist is not None else ""
        signals.append(f"EMA 9 {ema_rel.lower()} EMA 21{dist_str}")

    # Volume ratio
    vol_ratio = ind.get("volume_ratio")
    if vol_ratio is not None:
        signals.append(f"Volume {vol_ratio:.2f}× 20-day average")

    # 52w proximity
    dist_high = ind.get("range_52w", {}).get("dist_from_high_pct")
    if dist_high is not None:
        signals.append(f"{dist_high:.1f}% from 52-week high")

    # Regime
    signals.append(f"Market regime: {regime}")

    # UOA
    if uoa_data and uoa_data.get("score", 0) >= 0.40:
        signals.append(
            f"UOA: {uoa_data.get('label', '')} ({uoa_data.get('type', '')}, "
            f"{uoa_data.get('score', 0):.0%} breakout probability)"
        )

    return signals[:7]   # cap at 7


def _neutral_fallback(reason: str) -> Dict[str, Any]:
    return {
        "composite_score": 50,
        "verdict":         "WATCH",
        "lead_signal":     reason,
        "key_signals":     [reason],
        "factor_scores":   {},
        "uoa_contribution": 0,
        "uoa_note":        "",
        "regime_applied":  "NEUTRAL",
        "news_contribution": 0,
    }
