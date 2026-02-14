import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function PerformanceCharts({ analytics }) {
  const equityData = [
    { period: '1M', value: 0 },
    { period: '2M', value: (analytics?.total_pnl ?? 0) * 0.3 },
    { period: '3M', value: (analytics?.total_pnl ?? 0) * 0.6 },
    { period: '4M', value: analytics?.total_pnl ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Cumulative Return</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="period" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
              <Area type="monotone" dataKey="value" stroke="#22c55e" fill="url(#profitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
          <div className="text-slate-400 text-sm">Sharpe Ratio</div>
          <div className="text-2xl font-bold text-white">{(analytics?.sharpe_ratio ?? 0).toFixed(2)}</div>
        </div>
        <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
          <div className="text-slate-400 text-sm">Max Drawdown</div>
          <div className="text-2xl font-bold text-apex-loss">{(analytics?.max_drawdown ?? 0).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}
