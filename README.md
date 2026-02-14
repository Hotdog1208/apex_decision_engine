# Apex Decision Engine (ADE)

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

**Terminal 1 - Backend:**
```bash
cd apex_decision_engine
pip install -r web/requirements.txt
uvicorn web.backend.app:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd apex_decision_engine/web/frontend
npm install
npm run dev
```

Open http://localhost:3000

### Live Monitor
```bash
python scripts/live_monitor.py
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /portfolio | Portfolio state |
| GET | /trades | Trade list |
| POST | /trades/run | Run decision engine |
| POST | /trades/approve | Approve trade |
| DELETE | /trades/{id} | Close position |
| GET | /analytics | Performance metrics |
| GET | /signals | Current signals |
| GET | /config | System config |
| WebSocket | /ws | Live updates |

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
