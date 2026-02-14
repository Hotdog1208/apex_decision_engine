import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function SignalChart({ signals }) {
  const data = (signals ?? []).map((s) => ({
    symbol: s.symbol,
    momentum: s.momentum_score ?? 0,
    meanReversion: s.mean_reversion_score ?? 0,
    composite: s.composite_score ?? 0,
    regime: s.regime,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="symbol" stroke="rgba(255,255,255,0.5)" fontSize={11} />
          <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}
            formatter={(v, name) => [v.toFixed(1), name === 'momentum' ? 'Momentum' : name === 'meanReversion' ? 'Mean Rev' : 'Composite']}
          />
          <Bar dataKey="composite" fill="#CCFF00" radius={[2, 2, 0, 0]} name="Composite" animationDuration={800} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
