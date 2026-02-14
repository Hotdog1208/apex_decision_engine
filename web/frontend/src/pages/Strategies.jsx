import { useState, useEffect } from 'react'
import { api } from '../api'

const STRATEGY_LIST = [
  { id: 'equity_momentum', name: 'Equity Momentum', enabled: true },
  { id: 'equity_mean_reversion', name: 'Equity Mean Reversion', enabled: false },
  { id: 'option_directional', name: 'Option Directional', enabled: true },
  { id: 'option_spread', name: 'Option Spread', enabled: false },
  { id: 'future_trend', name: 'Future Trend', enabled: true },
]

export default function Strategies() {
  const [strategies, setStrategies] = useState(STRATEGY_LIST)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Strategy Management</h1>
      <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
        <p className="text-slate-400 text-sm mb-4">
          Enable or disable strategies. Strategy parameters are configured in system_config.py.
        </p>
        <div className="space-y-2">
          {strategies.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0"
            >
              <span className="text-white">{s.name}</span>
              <span
                className={`px-2 py-0.5 rounded text-xs ${
                  s.enabled ? 'bg-apex-profit/20 text-apex-profit' : 'bg-slate-600/20 text-slate-500'
                }`}
              >
                {s.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
