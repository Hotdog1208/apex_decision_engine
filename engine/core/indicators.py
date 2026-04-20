"""
Technical Indicators and Market Regime Detection for Apex Decision Engine.
Uses pure pandas for calculation to ensure Python 3.14+ compatibility.
"""

import pandas as pd
import numpy as np
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

def pandas_sma(series, length):
    return series.rolling(window=length).mean()

def pandas_rsi(series, length=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=length).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=length).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def pandas_macd(series, fast=12, slow=26, signal=9):
    fast_ema = series.ewm(span=fast, adjust=False).mean()
    slow_ema = series.ewm(span=slow, adjust=False).mean()
    macd_line = fast_ema - slow_ema
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram

def pandas_atr(high, low, close, length=14):
    tr1 = high - low
    tr2 = (high - close.shift()).abs()
    tr3 = (low - close.shift()).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return tr.rolling(window=length).mean()

def calculate_indicators(series: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate RSI, MACD, MAs, ATR, and Volume Ratio from OHLCV series.
    series: List of {time, open, high, low, close, volume}
    """
    if not series or len(series) < 20:
        return {}

    df = pd.DataFrame(series)
    # Don't set index as time might not be unique in all datasets, or just use integer index
    
    # Ensure numeric columns
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    try:
        # RSI (14)
        df['rsi'] = pandas_rsi(df['close'], length=14)
        
        # MACD (12, 26, 9)
        macd_line, signal_line, histogram = pandas_macd(df['close'], fast=12, slow=26, signal=9)
        df['MACD'] = macd_line
        df['MACDs'] = signal_line
        df['MACDh'] = histogram
        
        # Moving Averages
        df['ma20'] = pandas_sma(df['close'], length=20)
        df['ma50'] = pandas_sma(df['close'], length=50)
        df['ma200'] = pandas_sma(df['close'], length=200) if len(df) >= 200 else np.nan
        
        # ATR (14)
        df['atr'] = pandas_atr(df['high'], df['low'], df['close'], length=14)
        
        # Volume Ratio (Today / 20-day SMA Volume)
        vol_sma20 = pandas_sma(df['volume'], length=20)
        df['vol_sma20'] = vol_sma20
        
        latest = df.iloc[-1]
        
        return {
            "current_price": float(latest['close']),
            "rsi": float(latest['rsi']) if not pd.isna(latest['rsi']) else 50.0,
            "macd": {
                "line": float(latest['MACD']) if not pd.isna(latest['MACD']) else 0.0,
                "signal": float(latest['MACDs']) if not pd.isna(latest['MACDs']) else 0.0,
                "histogram": float(latest['MACDh']) if not pd.isna(latest['MACDh']) else 0.0
            },
            "ma20": float(latest['ma20']) if not pd.isna(latest['ma20']) else None,
            "ma50": float(latest['ma50']) if not pd.isna(latest['ma50']) else None,
            "ma200": float(latest['ma200']) if not pd.isna(latest['ma200']) else None,
            "atr": float(latest['atr']) if not pd.isna(latest['atr']) else 0.0,
            "volume_ratio": float(latest['volume'] / latest['vol_sma20']) if latest['vol_sma20'] > 0 else 1.0,
            "volume_today": int(latest['volume']),
            "volume_avg20": float(latest['vol_sma20']) if not pd.isna(latest['vol_sma20']) else 0.0
        }
    except Exception as e:
        logger.error(f"Error calculating indicators: {e}")
        return {}

def detect_market_regime(spy_series: List[Dict[str, Any]], vix_val: Optional[float] = None) -> Dict[str, Any]:
    """
    Detect market regime based on SPY data.
    Regime: BULL, BEAR, NEUTRAL, HIGH_VOLATILITY
    """
    if not spy_series or len(spy_series) < 200:
        return {
            "regime": "NEUTRAL",
            "spy_vs_200ma": 0.0,
            "spy_rsi": 50.0,
            "vix_level": "NORMAL",
            "regime_note": "Insufficient data to determine market regime."
        }

    df = pd.DataFrame(spy_series)
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    ma200_series = pandas_sma(df['close'], length=200)
    ma200 = ma200_series.iloc[-1]
    
    rsi_series = pandas_rsi(df['close'], length=14)
    rsi = rsi_series.iloc[-1]
    
    current_price = df['close'].iloc[-1]
    
    spy_vs_200ma = ((current_price / ma200) - 1) if not pd.isna(ma200) else 0.0
    
    # VIX Logic (using ATR-based proxy if VIX not provided)
    atr_series = pandas_atr(df['high'], df['low'], df['close'], length=14)
    atr = atr_series.iloc[-1]
    rel_atr = (atr / current_price) * 100 if current_price else 0.0
    
    if vix_val:
        if vix_val > 30: vix_level = "EXTREME"
        elif vix_val > 20: vix_level = "ELEVATED"
        elif vix_val > 12: vix_level = "NORMAL"
        else: vix_level = "LOW"
    else:
        # Proxy VIX from relative ATR
        if rel_atr > 3.0: vix_level = "EXTREME"
        elif rel_atr > 2.0: vix_level = "ELEVATED"
        elif rel_atr > 1.0: vix_level = "NORMAL"
        else: vix_level = "LOW"

    # Determine Regime
    if spy_vs_200ma > 0.02 and vix_level in ["LOW", "NORMAL"]:
        regime = "BULL"
        note = "Market is in a sustained uptrend with healthy volatility. Accumulation preferred."
    elif spy_vs_200ma < -0.02:
        regime = "BEAR"
        note = "Market is below major support. Risk-off regime active. Focus on capital preservation."
    elif vix_level in ["ELEVATED", "EXTREME"]:
        regime = "HIGH_VOLATILITY"
        note = "Elevated uncertainty detected. Wide price ranges and unpredictable swings likely."
    else:
        regime = "NEUTRAL"
        note = "Market is consolidating or in a low-conviction range. Patience is key."

    return {
        "regime": regime,
        "spy_vs_200ma": round(spy_vs_200ma * 100, 2),
        "spy_rsi": round(rsi, 1) if not pd.isna(rsi) else 50.0,
        "vix_level": vix_level,
        "regime_note": note
    }
