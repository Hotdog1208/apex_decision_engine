# APEX Decision Engine - Full Checklist

## ✅ Completed

### Backend
- [x] All API endpoints wired and returning data
- [x] Price Alerts: accepts `target_price` from frontend
- [x] Market snapshot endpoint for Charts
- [x] CORS for ports 3000 and 5173
- [x] Chat demo mode: smart canned responses when OPENAI_API_KEY not set (run ADE analysis, quotes, options 101, risk tips)
- [x] Expanded mock data: 11 stocks in market_snapshot, 7 news items, 8 calendar events

### Frontend
- [x] Screener: runs on load, fetches real data, loading/error states
- [x] News: fetches from API, formatted timestamps
- [x] Calendar: fetches from API, impact colors
- [x] Charts: fetches price_history from /market-snapshot
- [x] Chat: demo mode works without API key, better error messages
- [x] Price Alerts: fixed target_price/price display
- [x] All pages: PageWrapper, design consistency
- [x] api.getMarketSnapshot() added

### Run Setup
- [x] Venv + run-backend.ps1 / run-backend.bat
- [x] run-fullstack.ps1 launches both
- [x] README updated with setup instructions

---

## 🔲 Optional Enhancements

### Data
- [ ] Add real news API (NewsAPI, Finnhub, etc.)
- [ ] Add real economic calendar API
- [ ] E*TRADE or other live market data integration

### Chat
- [ ] Set OPENAI_API_KEY for full AI responses
- [ ] Markdown rendering for chat replies
- [ ] Streaming responses

### UI
- [ ] Connection status banner when backend offline
- [ ] Toast notifications for actions
- [ ] Dark/light theme refinements

### Performance
- [ ] React.lazy for route code-splitting
- [ ] Virtualize long tables (react-window)

---

## Run Instructions

1. **Backend:** `.\run-backend.ps1` (or `.\venv\Scripts\python.exe -m uvicorn web.backend.app:app --reload --port 8000`)
2. **Frontend:** `cd web\frontend && npm run dev`
3. Open http://localhost:3000

Both must be running for Screener, News, Calendar, Charts, Chat, Alerts, Heatmap to work.
