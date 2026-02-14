import { useState, useEffect } from 'react'
import { api } from '../api'
import PerformanceCharts from '../components/PerformanceCharts'

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    api.getAnalytics()
      .then(setAnalytics)
      .catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Performance Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
          <div className="text-slate-400 text-sm">Total PnL</div>
          <div className={`text-2xl font-bold ${(analytics?.total_pnl ?? 0) >= 0 ? 'text-apex-profit' : 'text-apex-loss'}`}>
            ${(analytics?.total_pnl ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
          <div className="text-slate-400 text-sm">Win Rate</div>
          <div className="text-2xl font-bold text-white">{(analytics?.win_rate ?? 0).toFixed(1)}%</div>
        </div>
        <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
          <div className="text-slate-400 text-sm">Sharpe Ratio</div>
          <div className="text-2xl font-bold text-white">{(analytics?.sharpe_ratio ?? 0).toFixed(2)}</div>
        </div>
        <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
          <div className="text-slate-400 text-sm">Profit Factor</div>
          <div className="text-2xl font-bold text-white">{(analytics?.profit_factor ?? 0).toFixed(2)}</div>
        </div>
      </div>

      <PerformanceCharts analytics={analytics} />
    </div>
  )
}
