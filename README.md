# Apex Decision Engine (ADE)
![CI](https://github.com/Hotdog1208/apex_decision_engine/actions/workflows/ci.yml/badge.svg)

Institutional-grade multi-asset trading intelligence framework. Production-ready architecture with E*TRADE API preparation.

## Features

- **Multi-asset support**: Stocks, options, futures
- **Signal engine**: Regime detection, momentum/mean reversion, volatility
- **Strategy layer**: Equity momentum, option directional, future trend
- **Scoring**: Structure, volatility, liquidity, risk/reward, strategy fit (configurable weights)
- **Capital allocation**: Ranked by confidence, risk-budget aware, 5% max per position
- **Risk engine**: Position and portfolio limits (2% risk/trade, 30% sector, 20% asset class)
- **Lifecycle management**: Stop, target, trailing logic
- **Performance analytics**: PnL, win rate, Sharpe, drawdown, expectancy
- **API layer**: Mock adapters ready; swap to E*TRADE via `DATA_SOURCE=etrade`
- **Web interface**: FastAPI backend + React frontend (dark mode)

## Structure

```
apex_decision_engine/
├── engine/
│   ├── core/           - decision_engine, signal_engine, scoring_engine, etc.
│   ├── strategies/     - equity_momentum, option_directional, future_trend
│   ├── assets/         - base_asset, stock_asset, option_asset, future_asset
│   ├── analytics/      - pnl, drawdown, sharpe, expectancy, winrate
│   ├── api/            - market_data_adapter, order_adapter, etrade_connector
│   └── ade_logging/    - trade_logger, performance_logger
├── config/             - system_config, risk_config
├── data/               - market_snapshot.json, option_chain.json, futures_chain.json
├── web/
│   ├── backend/        - FastAPI app
│   └── frontend/       - React + Vite + Tailwind
├── scripts/            - run_engine.py, live_monitor.py
└── tests/              - Unit tests
```

## Run

### CLI (Backtest)
```bash
cd apex_decision_engine
python scripts/run_engine.py
```

### Web Interface

**First-time setup:**
```powershell
cd apex_decision_engine
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r web/requirements.txt
cd web\frontend
npm install
```

**Run (2 terminals):**

Terminal 1 - Backend:
```powershell
.\run-backend.ps1
```

Terminal 2 - Frontend:
```powershell
cd web\frontend
npm run dev
```

Or run both: `.\run-fullstack.ps1`

Open **http://localhost:3000**. The frontend proxies `/api` to the backend on port 8000—both must be running.

### API keys and secrets

Put secrets in a **`.env`** file in the project root (copy from `.env.example`). The backend loads `.env` on startup; `.env` is gitignored.

| Variable | Required | How to get it |
|----------|----------|----------------|
| **OPENAI_API_KEY** | For full AI chat | [OpenAI API keys](https://platform.openai.com/api-keys). Without it, Chat uses canned responses. |
| **DATA_SOURCE** | No | `yahoo` = live quotes/charts/screener/heatmap (no key). `mock` = JSON only. Set in `.env`. |
| **FINNHUB_API_KEY** | For real news + calendar | Free at [finnhub.io/register](https://finnhub.io/register). Without it, News and Calendar use sample data. |
| **OPENAI_CHAT_MODEL** | No | Default `gpt-4o-mini`. |
| **ADE_SECRET_KEY** | For production auth | Any long random string. |
| E*TRADE (OAuth) | For live broker | Only if you set `DATA_SOURCE=etrade`; see E*TRADE Integration below. |

**What uses real data:** With `DATA_SOURCE=yahoo` and `FINNHUB_API_KEY` set: **Charts**, **Screener**, **Heat map**, **Watchlist**, **Price alerts** (and market snapshot) use live Yahoo data; **News** and **Calendar** use Finnhub. **Alerts** come from the decision engine run. **Risk tools** are client-side math (no API). **Chat** uses OpenAI when `OPENAI_API_KEY` is set.

### Getting real data (turn off mock)

1. **Copy env and edit**
   ```powershell
   copy .env.example .env
   notepad .env
   ```

2. **Real market data (Charts, Screener, Heatmap, Watchlist, Price alerts)**  
   No API key needed. In `.env` set:
   ```env
   DATA_SOURCE=yahoo
   ```
   Leave as `mock` to use only the JSON files in `data/`.

3. **Real news and economic calendar**  
   Free key at [finnhub.io/register](https://finnhub.io/register). In `.env` set:
   ```env
   FINNHUB_API_KEY=your_key_here
   ```
   Without it, News and Calendar use sample data.

4. **Full AI chat (optional)**  
   Key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). In `.env` set:
   ```env
   OPENAI_API_KEY=sk-your_key_here
   ```
   Without it, Chat still works with canned responses and basic ADE analysis.

5. **Restart the backend** after changing `.env` (env is read at startup).

The **GET /config** response includes `live_services`: `market_data`, `news_calendar`, and `chat_ai` booleans so you can confirm what is live.

### Live Monitor
```bash
python scripts/live_monitor.py
```

## API Endpoints

**Core & trading**
| Method | Path | Description |
|--------|------|-------------|
| GET | /portfolio | Portfolio state (value, positions, exposure) |
| GET | /trades | Trade list (`?active_only=true` optional) |
| POST | /trades/run | Run decision engine; returns signals & trade ideas |
| POST | /trades/approve | Approve trade (body: `trade_id`) |
| DELETE | /trades/{id} | Close position (`?exit_reason=`) |
| GET | /analytics | PnL, win rate, Sharpe, max drawdown, profit factor, expectancy |
| GET | /signals | Current engine signals |
| GET/PUT | /config | System config (data_source, scoring_weights) |
| WebSocket | /ws | Live trade updates (trades_updated, trade_approved, trade_closed) |

**Market data & charts**
| Method | Path | Description |
|--------|------|-------------|
| GET | /market-snapshot | Full snapshot (stocks, price_history). Source: connector (mock/Yahoo). |
| GET | /chart/{symbol} | OHLCV for charting. Query: `period` (1d,5d,1mo,3mo,6mo,1y), `interval` (1m,1d,1wk). |
| GET | /quote | Single symbol quote. Query: `symbol`. |
| GET | /quotes | Batch quotes. Query: `symbols` (comma-separated). |
| GET | /screener | Stock screener. Query: min_price, max_price, min_volume, sectors (comma), min_rsi, max_rsi. |
| GET | /heatmap | Sector/symbol heatmap (change_pct, price, volume). |

**News, calendar, alerts**
| Method | Path | Description |
|--------|------|-------------|
| GET | /news | Market news (Finnhub if key set, else mock). |
| GET | /calendar | Economic calendar (Finnhub if key set, else mock). |
| GET | /alerts | Alert center list (from engine + mock). |

**Watchlists & price alerts**
| Method | Path | Description |
|--------|------|-------------|
| GET | /watchlists | List watchlists. |
| POST | /watchlists/{name} | Add symbol. Query: `symbol`. |
| DELETE | /watchlists/{name}/{symbol} | Remove symbol. |
| GET/POST | /price-alerts | List or create price alerts (symbol, condition, target_price). |
| DELETE | /price-alerts/{id} | Remove price alert. |

**Auth & chat**
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/signup | Register (email, password). Returns access_token, user. |
| POST | /auth/login | Login. Returns access_token, user. |
| POST | /chat | Send message (session_id, message). Uses OpenAI if OPENAI_API_KEY set. |
| GET | /chat/history | Messages for session. Query: session_id. |

**Other**
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check. |
| GET | /export/trades | Download trades JSON. |

## Trade Output Format

Each trade includes: `trade_id`, `timestamp`, `asset_class`, `symbol`, `strategy`, `direction`, `position_details` (shares/contracts, entry_price, stop_loss, take_profit), `confidence_score`, `confidence_breakdown`, `capital_allocated`, `risk_per_trade`, `risk_percentage`, `expected_return`, `max_loss`, `reasoning`, `lifecycle_state`, `entry_time`, `exit_time`, `exit_reason`, `realized_pnl`.

## E*TRADE Integration

1. Set `DATA_SOURCE=etrade` in config
2. Add E*TRADE credentials (OAuth 1.0a) via env or secure config
3. Implement `ETradeConnectorImpl` in `engine/api/etrade_connector.py`
4. Market/order adapters will use real API

## Tests

```bash
pip install pytest
pytest tests/ -v
```

## Requirements

Python 3.9+
