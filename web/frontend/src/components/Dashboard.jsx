import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Wallet, AlertTriangle } from 'lucide-react'
import { api } from '../api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import AnimatedNumber from './AnimatedNumber'
import PageWrapper from './PageWrapper'
import SkeletonLoader from './SkeletonLoader'

const easing = [0.16, 1, 0.3, 1]
const stagger = 0.05

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getPortfolio(), api.getAnalytics()])
      .then(([p, a]) => {
        setPortfolio(p)
        setAnalytics(a)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-8">
          <SkeletonLoader height={40} width={200} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} height={100} className="rounded-xl" />
            ))}
          </div>
          <SkeletonLoader height={280} className="rounded-xl" />
        </div>
      </PageWrapper>
    )
  }

  const pnl = analytics?.total_pnl ?? 0
  const pnlPct = portfolio?.portfolio_value ? (pnl / portfolio.portfolio_value * 100) : 0
  const pv = portfolio?.portfolio_value ?? 0

  const equityData = Array.from({ length: 30 }, (_, i) => ({
    day: 30 - i,
    value: pv + (pnl * (i / 30)),
  })).reverse()

  const stats = [
    { label: 'Portfolio Value', value: pv, icon: Wallet, color: 'text-white', format: 'currency', prefix: '$', decimals: 0 },
    { label: "Today's PnL", value: pnl, icon: TrendingUp, color: pnl >= 0 ? 'text-apex-profit' : 'text-apex-loss', format: 'currency', prefix: '$', suffix: ` (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)` },
    { label: 'Active Positions', value: portfolio?.positions_count ?? 0, icon: BarChart3, color: 'text-white', format: 'number', decimals: 0 },
    { label: 'Win Rate', value: analytics?.win_rate ?? 0, icon: AlertTriangle, color: 'text-white', format: 'number', suffix: '%', decimals: 1 },
  ]

  return (
    <PageWrapper>
      <div className="space-y-12">
        {/* Hero - Asymmetric Portfolio Value */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
          className="relative"
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <p className="text-white/50 text-sm uppercase tracking-widest font-display mb-2">Portfolio Value</p>
              <div className="border-l-2 border-apex-accent pl-4">
                <AnimatedNumber
                  value={pv}
                  prefix="$"
                  decimals={0}
                  format="currency"
                  className="text-[clamp(2.5rem,6vw,5rem)] font-display font-bold tracking-tight leading-none text-white"
                />
                <p className="text-white/50 text-sm mt-1 font-data">All time high reached 2h ago</p>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="lg:w-56 rounded-xl p-4 border border-white/10 bg-white/5"
            >
              <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Today</p>
              <AnimatedNumber
                value={Math.abs(pnl)}
                prefix={pnl >= 0 ? '+$' : '-$'}
                format="currency"
                className={`text-2xl font-data font-semibold ${pnl >= 0 ? 'text-apex-profit' : 'text-apex-loss'}`}
              />
              <p className={`text-sm font-data mt-0.5 ${pnlPct >= 0 ? 'text-apex-profit' : 'text-apex-loss'}`}>
                {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * stagger, duration: 0.4, ease: easing }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider mb-2">
                  <Icon size={14} />
                  {s.label}
                </div>
                <AnimatedNumber
                  value={s.value}
                  prefix={s.prefix || ''}
                  suffix={s.suffix || ''}
                  format={s.format}
                  decimals={s.decimals}
                  className={`text-xl font-data font-semibold ${s.color}`}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Equity Curve - Full Width */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="rounded-xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="text-lg font-display font-semibold text-white mb-4">Equity Curve</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CCFF00" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#CCFF00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(2)}M`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}
                  formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Value']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#CCFF00"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  fill="url(#equityGrad)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Exposure + Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-white/10 bg-white/5 p-6"
          >
            <h2 className="text-lg font-display font-semibold text-white mb-4">Exposure by Asset Class</h2>
            <div className="space-y-3">
              {Object.entries(portfolio?.asset_class_exposure ?? {}).map(([ac, val]) => (
                <div key={ac} className="flex justify-between items-center">
                  <span className="text-white/70 capitalize text-sm">{ac}</span>
                  <span className="font-data text-white">
                    ${val.toLocaleString()} ({((val / (pv || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
              {(!portfolio?.asset_class_exposure || Object.keys(portfolio.asset_class_exposure).length === 0) && (
                <p className="text-white/40 text-sm">No exposure</p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-xl border border-white/10 bg-white/5 p-6"
          >
            <h2 className="text-lg font-display font-semibold text-white mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Sharpe</p>
                <p className="font-data text-white font-semibold">{(analytics?.sharpe_ratio ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Max Drawdown</p>
                <p className="font-data text-apex-loss font-semibold">{(analytics?.max_drawdown ?? 0).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Profit Factor</p>
                <p className="font-data text-white font-semibold">{(analytics?.profit_factor ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Expectancy</p>
                <p className="font-data text-white font-semibold">${(analytics?.expectancy ?? 0).toFixed(2)}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  )
}
