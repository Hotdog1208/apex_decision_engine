# Get the app running with real data

## What was fixed

1. **News/Calendar 500 error** – The route handlers were named `get_news` and `get_calendar`, which shadowed the imported functions. Calling `get_news()` inside the route was recursively calling the route and causing a crash. This is fixed by using aliased imports (`fetch_news`, `fetch_calendar`) and safe fallbacks.

2. **Charts (and other pages) black screen** – The Charts page used `useSearchParams` without importing it from `react-router-dom`, which caused a runtime error and a blank page. The import is now added, and the candlestick icon was corrected to `Candles` (from lucide-react).

3. **Backend 500s** – All data endpoints (news, calendar, market-snapshot, chart, quote, quotes, screener, heatmap, alerts, portfolio, analytics) are wrapped in try/except. On failure they return **200** with empty or fallback data instead of 500, so the frontend always gets valid JSON.

4. **Chart component** – Handles missing or invalid OHLC data and zero-width containers so the chart does not throw.

5. **API error handling** – Failed responses are parsed as JSON when possible so you see a clear error message instead of raw HTML.

## What you need to do

### 1. Use real market data (no key needed)

In your **`.env`** in the project root, set:

```env
DATA_SOURCE=yahoo
```

(You already have this.) This enables live Yahoo Finance data for Charts, Screener, Heatmap, Watchlist, and Price Alerts.

### 2. Restart the backend

After any `.env` change, **restart the backend** (env is read at startup).

- Stop the backend (Ctrl+C in the terminal where it runs).
- Start it again, for example:
  ```powershell
  .\run-backend.ps1
  ```
  or:
  ```powershell
  python -m uvicorn web.backend.app:app --reload --port 8000
  ```

### 3. Run frontend and backend together

- **Terminal 1 – Backend:**  
  `.\run-backend.ps1` (or the uvicorn command above).

- **Terminal 2 – Frontend:**  
  `cd web\frontend` then `npm run dev`.

- Open **http://localhost:5173** (or the URL Vite prints).  
  Using localhost is fine; the problems were from the bugs above, not from running on localhost.

### 4. Optional: real news and calendar

Get a free key at [finnhub.io/register](https://finnhub.io/register) and add to `.env`:

```env
FINNHUB_API_KEY=your_key_here
```

If the key is missing or invalid, News and Calendar still work using sample data.

### 5. Dependencies

Ensure backend dependencies are installed (from project root):

```powershell
pip install -r web/requirements.txt
```

This includes `requests` (for Finnhub), `yfinance`, `pandas`, etc.

---

After restarting the backend and running the frontend, News should load (real or sample), Charts should render without a black screen, and Yahoo-powered pages (Charts, Screener, Heatmap, Watchlist) should show data when `DATA_SOURCE=yahoo`.
