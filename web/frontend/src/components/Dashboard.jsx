import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, TrendingUp, Wallet, Target, Play, Zap, Activity, Cpu, Hexagon } from 'lucide-react'
import { api } from '../api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import AnimatedNumber from './AnimatedNumber'
import PageWrapper from './PageWrapper'
import SkeletonLoader from './SkeletonLoader'
import StatCard from './StatCard'
import Card, { CardHeader, CardBody } from './Card'
import MarketStrip from './MarketStrip'
import MagneticButton from './MagneticButton'
import GlitchText from './GlitchText'
import { formatCurrency } from '../lib/format'

const easing = [0.16, 1, 0.3, 1]

// A chaotic, decorative background specifically for the Dashboard
function HudDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute top-[5%] left-[5%] w-[30vw] h-[30vw] border-[1px] border-apex-cyan/10 rounded-full animate-[spin_60s_linear_infinite]" />
      <div className="absolute top-[10%] left-[10%] w-[20vw] h-[20vw] border-[1px] border-apex-pink/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
      <div className="absolute bottom-[10%] right-[10%] w-px h-[60vh] bg-gradient-to-b from-transparent via-apex-accent/20 to-transparent" />
      <div className="absolute top-[20%] right-[5%] w-[40vw] h-[1px] bg-gradient-to-r from-transparent via-apex-pink/20 to-transparent rotate-45" />

      {/* Random HUD text elements */}
      <div className="absolute top-[100px] left-4 font-data text-[8px] text-apex-accent/40 uppercase tracking-[0.5em] writing-vertical-rl">
        SYS.REQ.009 // ACTIVE // MONITORING
      </div>
      <div className="absolute bottom-[50px] right-4 font-data text-[8px] text-apex-cyan/40 uppercase tracking-[0.5em] writing-vertical-rl rotate-180">
        DATA.STREAM.OVR // FEED
      </div>
    </div>
  )
}

function GridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] opacity-20" style={{
      backgroundImage: `linear-gradient(rgba(204, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(204, 255, 0, 0.1) 1px, transparent 1px)`,
      backgroundSize: '40px 40px',
      transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
      animation: 'grid-move 20s linear infinite'
    }}>
      <style>{`
        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }
      `}</style>
    </div>
  )
}

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
        <div className="space-y-8 relative z-10">
          <div className="h-16 w-1/3 skeleton rounded-none border border-white/10" />
          <MarketStrip />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} height={140} className="rounded-none border border-white/10" />
            ))}
          </div>
          <SkeletonLoader height={320} className="rounded-none border border-white/10" />
        </div>
      </PageWrapper>
    )
  }

  const pnl = analytics?.total_pnl ?? 0
  const pv = portfolio?.portfolio_value ?? 0
  const pnlPct = pv ? (pnl / pv) * 100 : 0

  // Generate chaotic equity data for the overwhelming feel
  const equityData = Array.from({ length: 60 }, (_, i) => {
    const volatility = Math.random() * 0.1 - 0.05
    const baseValue = pv + pnl * (i / 60)
    return {
      day: 60 - i,
      value: baseValue * (1 + volatility),
      volume: Math.random() * 1000 + 500,
    }
  }).reverse()

  const sparklinePortfolio = equityData.map((d) => ({ value: d.value }))
  const sparklinePnl = equityData.map((d, i) => ({ value: (d.value - pv) * (i / (equityData.length - 1 || 1)) }))

  return (
    <PageWrapper className="relative min-h-screen">
      <GridBackground />
      <HudDecorations />

      <div className="space-y-12 relative z-10 mt-8 mb-24">

        {/* Extreme Hero Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: easing }}
          className="relative cyber-panel border-l-[6px] border-l-apex-accent p-8 md:p-12 overflow-hidden group shadow-[0_0_50px_rgba(204,255,0,0.1)] hover:shadow-[0_0_80px_rgba(204,255,0,0.2)]"
        >
          {/* Internal Glitch Overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-apex-accent/5 via-transparent to-apex-pink/5 opacity-50 pointer-events-none" />
          <div className="absolute inset-0 scanlines opacity-30 mix-blend-overlay pointer-events-none" />

          <div className="absolute -right-20 -top-20 text-[20rem] text-apex-accent/5 font-black font-display rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
            SYS
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Cpu size={20} className="text-apex-accent animate-pulse" />
                <p className="text-apex-cyan text-xs uppercase font-data tracking-[0.3em] font-bold">Total Assets // Value</p>
              </div>
              <div className="relative">
                <GlitchText as="h1" text={formatCurrency(pv, { decimals: 0 })} className="text-[clamp(4rem,10vw,8rem)] font-display font-black tracking-tighter leading-[0.85] text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
              </div>
              <p className="text-white/40 text-xs font-data uppercase tracking-widest mt-6 border-l pl-3 border-white/20">
                Command center for real-time risk modeling & execution.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative p-6 border border-white/10 bg-black/40 backdrop-blur-md min-w-[220px] cyber-panel group/pnl">
                <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full ${pnl >= 0 ? 'bg-apex-profit shadow-[0_0_10px_var(--color-profit)]' : 'bg-apex-loss shadow-[0_0_10px_var(--color-loss)]'} animate-pulse`} />
                </div>
                <p className="text-white/40 font-data text-[10px] uppercase tracking-[0.2em] mb-2">Delta (24H)</p>
                <div className={`text-3xl font-data font-black tracking-tight ${pnl >= 0 ? 'text-apex-profit drop-shadow-[0_0_15px_rgba(0,255,136,0.4)]' : 'text-apex-loss drop-shadow-[0_0_15px_rgba(255,0,85,0.4)]'}`}>
                  {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, { decimals: 0 })}
                </div>
                <div className={`text-sm font-data font-bold mt-1 ${pnlPct >= 0 ? 'text-apex-profit/70' : 'text-apex-loss/70'}`}>
                  {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                </div>
                {/* Micro tech decor */}
                <div className="absolute bottom-2 right-2 text-[8px] font-data text-white/20">RCV_OK</div>
              </div>

              <div className="flex flex-col gap-3 justify-end">
                <Link to="/trading" className="group/btn block">
                  <div className="px-6 py-4 bg-apex-accent text-black font-data font-bold uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white translate-y-[100%] group-hover/btn:translate-y-0 transition-transform duration-300 pointer-events-none" />
                    <Play size={14} className="relative z-10 group-hover/btn:animate-pulse" />
                    <span className="relative z-10">Run Engine</span>
                  </div>
                </Link>
                <Link to="/chat" className="group/btn block">
                  <div className="px-6 py-4 border border-apex-cyan text-apex-cyan font-data font-bold uppercase tracking-widest text-xs hover:bg-apex-cyan hover:text-black transition-all flex items-center justify-center gap-3 shadow-[inset_0_0_15px_rgba(0,240,255,0.1)]">
                    <Zap size={14} className="relative z-10" />
                    <span className="relative z-10">Ask AI</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Market strip - Overstyled */}
        <div className="relative cyber-panel p-1 border-y border-white/20 bg-black/50">
          <MarketStrip />
        </div>

        {/* Stats grid with Overengineered StatCard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Equity"
            value={pv}
            format="currency"
            decimals={0}
            icon={Hexagon}
            sparklineData={sparklinePortfolio}
            variant="accent"
            delay={0.05}
          />
          <StatCard
            label="Daily Delta"
            value={pnl}
            prefix={pnl >= 0 ? '+$' : '-$'}
            suffix={` (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`}
            format="currency"
            decimals={0}
            icon={TrendingUp}
            variant={pnl >= 0 ? 'profit' : 'loss'}
            sparklineData={sparklinePnl}
            delay={0.1}
          />
          <StatCard
            label="Active Nodes"
            value={portfolio?.positions_count ?? 0}
            format="number"
            decimals={0}
            icon={Activity}
            delay={0.15}
          />
          <StatCard
            label="System Win Rate"
            value={analytics?.win_rate ?? 0}
            format="percent"
            suffix="%"
            decimals={1}
            icon={Target}
            delay={0.2}
          />
        </div>

        {/* Massive Equity Curve HUD */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative cyber-panel p-6 border border-white/10 bg-black/60 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-apex-cyan" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-apex-cyan" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-apex-cyan" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-apex-cyan" />

          <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <Activity size={24} className="text-apex-cyan" />
                Trajectory Matrix
              </h2>
              <p className="text-apex-cyan/50 font-data text-xs uppercase tracking-[0.2em] mt-1">60-Day Forward Projection Sync</p>
            </div>
            <div className="hidden sm:flex gap-4">
              <div className="px-3 py-1 bg-apex-cyan/10 border border-apex-cyan/30 text-apex-cyan font-data text-[10px] uppercase">
                Live Feed
              </div>
              <div className="px-3 py-1 bg-apex-pink/10 border border-apex-pink/30 text-apex-pink font-data text-[10px] uppercase animate-pulse">
                Recording
              </div>
            </div>
          </div>

          <div className="h-[400px] -mt-4 w-full relative">
            {/* Background grid for chart */}
            <div className="absolute inset-x-0 bottom-0 h-full pointer-events-none border-b border-white/10"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: '100px 50px'
              }}
            />

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="var(--accent-cyan)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="volAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-pink)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--accent-pink)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="1 10" stroke="rgba(255,255,255,0)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-data)' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="value" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-data)' }} tickFormatter={(v) => `$${(v / 1e3).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <YAxis dataKey="volume" yAxisId="right" orientation="right" hide />

                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid var(--accent-cyan)', color: 'white', borderRadius: 0, backdropFilter: 'blur(10px)', fontFamily: 'var(--font-data)', fontSize: '12px', textTransform: 'uppercase' }}
                  itemStyle={{ color: 'var(--accent-cyan)' }}
                  formatter={(v, name) => [name === 'value' ? formatCurrency(Number(v)) : Math.floor(v), name === 'value' ? 'EQUITY' : 'VOL']}
                  labelStyle={{ color: 'var(--text-tertiary)' }}
                  cursor={{ stroke: 'var(--accent-cyan)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />

                {/* Secondary data layer - Volume representation */}
                <Area
                  type="stepAfter"
                  yAxisId="right"
                  dataKey="volume"
                  stroke="var(--accent-pink)"
                  strokeWidth={1}
                  fill="url(#volAreaGrad)"
                  opacity={0.5}
                  animationDuration={2000}
                />

                {/* Main Equity Line */}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--accent-cyan)"
                  strokeWidth={3}
                  activeDot={{ r: 6, fill: 'var(--bg-primary)', stroke: 'var(--accent-cyan)', strokeWidth: 2 }}
                  fill="url(#equityAreaGrad)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Exposure + Performance HUDs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="cyber-panel p-6 border-l-[4px] border-l-apex-pink bg-black/60"
          >
            <h3 className="text-xl font-display font-bold text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-apex-pink animate-pulse" />
              Sector Exposure Matrix
            </h3>
            <div className="space-y-4">
              {Object.entries(portfolio?.asset_class_exposure ?? {}).map(([ac, val]) => {
                const pct = ((val / (pv || 1)) * 100).toFixed(1)
                return (
                  <div key={ac} className="relative group">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-white/60 text-xs font-data uppercase tracking-wider">{ac}</span>
                      <span className="text-white font-data text-sm">
                        {formatCurrency(val)} <span className="text-apex-pink ml-2 font-bold">{pct}%</span>
                      </span>
                    </div>
                    {/* Chaotic progress bar */}
                    <div className="h-1 bg-white/5 w-full overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        className="h-full bg-apex-pink shadow-[0_0_10px_var(--accent-pink)]"
                      />
                    </div>
                  </div>
                )
              })}
              {(!portfolio?.asset_class_exposure || Object.keys(portfolio.asset_class_exposure).length === 0) && (
                <div className="py-8 text-center text-white/30 font-data border border-white/5 bg-white/5">
                  <div className="text-[10px] uppercase tracking-widest animate-pulse">Warning: No Allocation Data Detected</div>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="cyber-panel p-6 border-l-[4px] border-l-apex-accent bg-black/60 relative overflow-hidden"
          >
            <div className="absolute -right-10 -bottom-10 opacity-5">
              <Target size={200} />
            </div>

            <h3 className="text-xl font-display font-bold text-white uppercase tracking-tight mb-6 flex items-center gap-2 relative z-10">
              <span className="w-2 h-2 bg-apex-accent animate-pulse" />
              Risk adjusted metrics
            </h3>

            <div className="grid grid-cols-2 gap-x-6 gap-y-8 relative z-10">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-data mb-2 border-b border-white/10 pb-1">Sharpe Factor</p>
                <p className="text-3xl font-display font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{(analytics?.sharpe_ratio ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-data mb-2 border-b border-white/10 pb-1">Max Drawdown</p>
                <p className="text-3xl font-display font-black text-apex-loss drop-shadow-[0_0_10px_rgba(255,0,85,0.5)]">{(analytics?.max_drawdown ?? 0).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-data mb-2 border-b border-white/10 pb-1">Profit Multiplier</p>
                <p className="text-3xl font-display font-black text-white drop-shadow-[0_0_10px_rgba(204,255,0,0.3)]">{(analytics?.profit_factor ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-data mb-2 border-b border-white/10 pb-1">EV / Trade</p>
                <p className="text-3xl font-display font-black text-white">{formatCurrency(analytics?.expectancy ?? 0, { decimals: 2 })}</p>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </PageWrapper>
  )
}
