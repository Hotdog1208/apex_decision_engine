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
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={equityData}>
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FF88" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#00FF88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="period" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
            <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
            <Area type="monotone" dataKey="value" stroke="#00FF88" fill="url(#profitGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Sharpe Ratio</div>
          <div className="font-data text-xl font-semibold text-white">{(analytics?.sharpe_ratio ?? 0).toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Max Drawdown</div>
          <div className="font-data text-xl font-semibold text-apex-loss">{(analytics?.max_drawdown ?? 0).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}
