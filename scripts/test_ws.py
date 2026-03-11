import asyncio
import json
import logging
import requests
import websockets

logging.basicConfig(level=logging.INFO)

async def test_websocket():
    uri = "ws://localhost:8000/ws"
    try:
        async with websockets.connect(uri) as ws:
            logging.info("Connected to WS. Firing anomaly...")
            
            # Fire anomaly via HTTP
            anomaly = {
                "timestamp": "2026-03-11T12:00:00Z",
                "ticker": "SPY",
                "strike": 500,
                "expiry": "2026-03-20",
                "type": "CALL",
                "volume": 20000,
                "open_interest": 100,
                "vol_oi_ratio": 200.0,
                "iv": 0.8
            }
            res = requests.post("http://localhost:8000/internal/uoa_alert", json=anomaly)
            logging.info(f"POST response: {res.json()}")
            
            # Wait for WS message
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                logging.info(f"Received WS message: {msg}")
            except asyncio.TimeoutError:
                logging.error("Did not receive WS message in time.")
    except Exception as e:
        logging.error(f"WS connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
