"""
XGBoost ML Pipeline for Unusual Options Activity (UOA) Anomalies.
Trains a model on historical UOA data and E-Trade OHLCV to predict 3%+ directional breakouts.
Provides inference function for live scoring.
"""
import os
import json
import logging
from pathlib import Path
import pandas as pd  # type: ignore
import numpy as np  # type: ignore
from typing import Optional, Dict, List, Any

try:
    import xgboost as base_xgb  # type: ignore
    from sklearn.model_selection import train_test_split as base_tts  # type: ignore
    from sklearn.metrics import accuracy_score as base_acc, classification_report as base_cr  # type: ignore
    xgb: Any = base_xgb
    train_test_split: Any = base_tts
    accuracy_score: Any = base_acc
    classification_report: Any = base_cr
except ImportError:
    xgb: Any = None
    train_test_split: Any = None
    accuracy_score: Any = None
    classification_report: Any = None

# Using the unified adapter instead of etrade_real_connector directly
from engine.api.market_data_adapter import MockMarketDataAdapter, YahooMarketDataAdapter  # type: ignore

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).resolve().parent / "uoa_model.json"
DATA_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "uoa_anomalies.json"

class UOAModelPipeline:
    def __init__(self, data_source="yahoo"):
        # Determine which adapter to use for OHLCV fetches. Use Yahoo by default for better free history.
        if data_source == "mock":
            self.market_adapter = MockMarketDataAdapter()
        else:
            self.market_adapter = YahooMarketDataAdapter()
        
        self.model: Any = None

    def _calculate_macd_rsi(self, history: pd.DataFrame) -> pd.DataFrame:
        """Calculate basic MACD and RSI for trend alignment."""
        df = history.copy()
        
        # MACD
        df['ema12'] = df['close'].ewm(span=12, adjust=False).mean()
        df['ema26'] = df['close'].ewm(span=26, adjust=False).mean()
        df['macd'] = df['ema12'] - df['ema26']
        df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
        df['macd_hist'] = df['macd'] - df['macd_signal']
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        return df

    def engineer_features(self, anomaly: dict, history: list) -> Optional[dict]:
        """
        Merge an anomaly with daily OHLCV history to create model features.
        Calculates UOA Magnitude, DTE, Moneyness, and Trend Alignment.
        """
        if not history or len(history) < 30:
            return None # Not enough history
            
        df = pd.DataFrame(history)
        if 'time' in df.columns:
            df['time'] = pd.to_datetime(df['time'], unit='s')
            df.set_index('time', inplace=True)
            
        df = self._calculate_macd_rsi(df)
        
        current_data = df.iloc[-1]
        underlying_price = current_data['close']
        
        features = {}
        
        # 1. UOA Magnitude (Vol / OI)
        vol = anomaly.get('volume', 0)
        oi = anomaly.get('open_interest', 0)
        features['vol_oi_ratio'] = (vol / oi) if oi > 0 else 0
        features['iv'] = anomaly.get('iv', 0)
        
        # 2. Days to Expiration (DTE)
        # Handle 'Unknown Expiry' nicely
        expiry = anomaly.get('expiry', '')
        try:
            # Assuming format provided or parseable
            # For simplicity in mock/sandbox, we mock DTE or parse from standard YYYY-MM-DD
            anomaly_date = pd.to_datetime(anomaly.get('timestamp', pd.Timestamp.utcnow())).tz_localize(None)
            expiry_date = pd.to_datetime(expiry).tz_localize(None)
            features['dte'] = (expiry_date - anomaly_date).days
        except Exception:
            features['dte'] = 14 # Default fallback
            
        # 3. Moneyness (Strike / Price - 1)
        strike = anomaly.get('strike', underlying_price)
        if anomaly.get('type') == 'CALL':
            features['moneyness'] = (strike / underlying_price) - 1
        else:
            features['moneyness'] = (underlying_price / strike) - 1
            
        # 4. Trend Alignment (MACD/RSI)
        macd = current_data['macd_hist']
        rsi = current_data['rsi']
        
        # If call and MACD > 0 and RSI < 70 (bullish alignment)
        # If put and MACD < 0 and RSI > 30 (bearish alignment)
        features['macd_hist'] = macd
        features['rsi'] = rsi
        
        if anomaly.get('type') == 'CALL':
            features['trend_alignment'] = 1 if (macd > 0 and rsi < 70) else 0
        else:
            features['trend_alignment'] = 1 if (macd < 0 and rsi > 30) else 0
            
        return features

    def prepare_training_data(self) -> pd.DataFrame:
        """
        Load historical UOA anomalies, fetch corresponding price history to engineer features,
        and calculate forward returns to create the Target variable (Y).
        """
        if not DATA_FILE.exists():
            logger.warning(f"No UOA anomalies found at {DATA_FILE}")
            return pd.DataFrame()
            
        with open(DATA_FILE, "r") as f:
            anomalies = json.load(f)
            
        data = []
        for anomaly in anomalies:
            ticker = anomaly.get('ticker')
            
            # Fetch 3 months of history for charting/indicators
            history_data = self.market_adapter.fetch_ohlc(ticker, period="3mo", interval="1d")
            series = history_data.get('series', [])
            
            features = self.engineer_features(anomaly, series)
            
            if features:
                # Add target variable Y: Stock +3% within 5 days?
                # For this to be accurate, we need future data after the anomaly.
                # Since we fetched current '3mo' history, if the anomaly is old, we can peek ahead.
                # If the anomaly is recent, we might not have 5 days of forward data.
                # Mock logic for the target:
                df = pd.DataFrame(series)
                anomaly_time = pd.to_datetime(anomaly.get('timestamp')).tz_localize(None)
                
                # Filter history to post-anomaly
                df['dt'] = pd.to_datetime(df['time'], unit='s').dt.tz_localize(None)
                post_df = df[df['dt'] >= anomaly_time].head(5)
                
                if len(post_df) > 0:
                    start_price = post_df.iloc[0]['close']
                    max_price = post_df['high'].max()
                    
                    if anomaly.get('type') == 'CALL':
                        target = 1 if (max_price / start_price - 1) >= 0.03 else 0
                    else:
                        min_price = post_df['low'].min()
                        target = 1 if (1 - min_price / start_price) >= 0.03 else 0
                        
                    features['target'] = target
                    data.append(features)
                    
        return pd.DataFrame(data)

    def train_model(self):
        """Train XGBoost model on the UOA dataset and save it."""
        if xgb is None or train_test_split is None or accuracy_score is None:
            logger.error("XGBoost or sklearn is not installed. Run `pip install xgboost scikit-learn`.")
            return False
            
        logger.info("Preparing training dataset...")
        df = self.prepare_training_data()
        
        if df.empty or 'target' not in df.columns or len(df) < 10:
            logger.warning("Not enough data to train model. Proceeding with dummy model.")
            # For demonstration purposes, if not enough data, we won't crash
            # We'll generate dummy data just to show the pipeline working
            df = self._generate_mock_training_data()
            
        X = df[['vol_oi_ratio', 'iv', 'dte', 'moneyness', 'macd_hist', 'rsi', 'trend_alignment']]
        y = df['target']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)  # type: ignore
        
        self.model = xgb.XGBClassifier(  # type: ignore
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            random_state=42,
            eval_metric='logloss'
        )
        
        logger.info("Training XGBoost Classifier...")
        self.model.fit(X_train, y_train)
        
        preds = self.model.predict(X_test)
        logger.info(f"Accuracy: {accuracy_score(y_test, preds):.2f}")  # type: ignore
        
        self.model.save_model(MODEL_PATH)
        logger.info(f"Model saved to {MODEL_PATH}")
        return True
        
    def _generate_mock_training_data(self) -> pd.DataFrame:
        """Inject synthetic data if real data is scarce for initial MVP."""
        np.random.seed(42)
        n = 100
        vol_oi = np.random.uniform(2, 10, n)
        iv = np.random.uniform(0.2, 1.0, n)
        dte = np.random.randint(1, 30, n)
        moneyness = np.random.uniform(-0.1, 0.1, n)
        macd = np.random.normal(0, 1, n)
        rsi = np.random.uniform(20, 80, n)
        trend = np.random.choice([0, 1], n)
        
        # Synthetic target logic
        prob = np.where(vol_oi > 5, 0.3, 0.0) + np.where(dte < 10, 0.2, 0.0) + np.where(trend == 1, 0.3, 0.0) + np.where(np.abs(moneyness) < 0.05, 0.2, 0.0)
        target = (np.random.uniform(0, 1, n) < prob).astype(int)
        
        return pd.DataFrame({
            'vol_oi_ratio': vol_oi,
            'iv': iv,
            'dte': dte,
            'moneyness': moneyness,
            'macd_hist': macd,
            'rsi': rsi,
            'trend_alignment': trend,
            'target': target
        })

    def load_model(self):
        """Load the trained model from disk."""
        if not MODEL_PATH.exists():
            # If it doesn't exist, try to train a quick one
            self.train_model()
            
        if self.model is None and xgb:
            self.model = xgb.XGBClassifier()
            try:
                self.model.load_model(MODEL_PATH)
            except Exception as e:
                logger.error(f"Failed to load XGBoost model: {e}")
                self.model = None

    def predict(self, anomaly: dict, history: list) -> float:
        """Predict probability (0-1) of breakout for a live anomaly."""
        if self.model is None:
            self.load_model()
            
        if self.model is None:
            return 0.0
            
        features = self.engineer_features(anomaly, history)
        if not features:
            return 0.0
            
        df = pd.DataFrame([features])[
            ['vol_oi_ratio', 'iv', 'dte', 'moneyness', 'macd_hist', 'rsi', 'trend_alignment']
        ]
        
        # model.predict_proba returns [[prob_0, prob_1]]
        prob = self.model.predict_proba(df)[0][1]
        return float(prob)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    pipeline = UOAModelPipeline()
    pipeline.train_model()
