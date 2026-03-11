import asyncio
import websockets  # type: ignore
import json
import requests  # type: ignore
import threading
import time

def trigger_alert():
    time.sleep(2)
    print("Triggering alert via POST...")
    anomaly = {
        "ticker": "SPY",
        "strike": 500.0,
        "type": "CALL",
        "volume": 25000,
        "open_interest": 100,
        "iv": 0.9,
        "timestamp": "2026-03-11T12:00:00Z",
        "expiry": "2026-03-20"
    }
    try:
        res = requests.post("http://localhost:8000/internal/uoa_alert", json=anomaly)
        print("Response:", res.json())
    except Exception as e:
        print("POST failed:", e)

async def listen():
    uri = "ws://localhost:8000/ws"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WS")
            # Start trigger in background
            threading.Thread(target=trigger_alert, daemon=True).start()
            
            # Wait for message
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(message)
                print("Received WS Event:", data.get("event"))
                if data.get("event") == "high_conviction_uoa":
                    print("SUCCESS! Received high conviction UOA alert over WS:", json.dumps(data, indent=2))
                    return True
            except asyncio.TimeoutError:
                print("Timeout waiting for WS message")
                return False
    except Exception as e:
        print("WS Connection failed:", e)
        return False

if __name__ == "__main__":
    success = asyncio.run(listen())
    if success:
        print("VERIFICATION_PASSED")
    else:
        print("VERIFICATION_FAILED")
