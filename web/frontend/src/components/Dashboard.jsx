import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Eye, ChevronDown, ChevronUp, Activity, Cpu, BarChart3, Shield, Zap } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import PageWrapper from './PageWrapper'
import GlitchText from './GlitchText'
import SkeletonLoader from './SkeletonLoader'
import TradingViewChart from './TradingViewChart'

const easing = [0.16, 1, 0.3, 1]

const VERDICT_STYLES = {
  buy: {
    bg: 'bg-apex-profit/10',
    border: 'border-apex-profit/40',
    text: 'text-apex-profit',
    badge: 'bg-apex-profit text-black',
    glow: 'shadow-[0_0_20px_rgba(0,255,136,0.15)]',
    icon: TrendingUp,
  },
  watch: {
    bg: 'bg-apex-warning/10',
    border: 'border-apex-warning/40',
    text: 'text-apex-warning',
    badge: 'bg-apex-warning text-black',
    glow: 'shadow-[0_0_20px_rgba(255,200,0,0.15)]',
    icon: Eye,
  },
  avoid: {
    bg: 'bg-apex-loss/10',
    border: 'border-apex-loss/40',
    text: 'text-apex-loss',
    badge: 'bg-apex-loss text-white',
    glow: 'shadow-[0_0_20px_rgba(255,0,85,0.15)]',
    icon: TrendingDown,
  },
}

function SignalCard({ signal, isSelected, onSelect, onExpandReasoning }) {
  const [expanded, setExpanded] = useState(false)
  const style = VERDICT_STYLES[signal.verdict] || VERDICT_STYLES.watch
  const Icon = style.icon

  const handleExpand = (e) => {
    e.stopPropagation()
    setExpanded(!expanded)
    if (!expanded) {
      onExpandReasoning(signal.symbol)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easing }}
      onClick={() => onSelect(signal.symbol)}
      className={`relative cyber-panel p-5 cursor-pointer transition-all duration-300 group overflow-hidden ${
        isSelected
          ? `${style.border} border-2 ${style.glow} ${style.bg}`
          : 'border border-white/10 hover:border-white/20 bg-black/40'
      }`}
    >
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-display font-black text-white tracking-tight">{signal.symbol}</span>
          <span className={`px-2.5 py-0.5 text-[10px] font-data font-bold uppercase tracking-widest ${style.badge}`}>
            {signal.verdict}
          </span>
        </div>
        <Icon size={18} className={style.text} />
      </div>

      {/* Price + Change */}
      <div className="flex items-baseline gap-3 mb-3">
        {signal.price > 0 && (
          <span className="text-white font-data text-sm">
            ${signal.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
        <span className={`text-xs font-data font-bold ${signal.change_percent >= 0 ? 'text-apex-profit' : 'text-apex-loss'}`}>
          {signal.change_percent >= 0 ? '+' : ''}{signal.change_percent.toFixed(2)}%
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-white/40 text-[10px] font-data uppercase tracking-widest">Confidence</span>
          <span className={`text-xs font-data font-bold ${style.text}`}>{(signal.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1 bg-white/10 w-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${signal.confidence * 100}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full ${style.badge.split(' ')[0]}`}
          />
        </div>
      </div>

      {/* Reasoning */}
      <p className="text-white/50 text-xs font-body leading-relaxed line-clamp-2 mb-3">
        {signal.reasoning}
      </p>

      {/* Expandable "Why does ADE say this?" */}
      <button
        onClick={handleExpand}
        className={`flex items-center gap-2 text-[11px] font-data uppercase tracking-widest transition-colors w-full justify-between py-2 border-t border-white/5 mt-2 ${
          expanded ? style.text : 'text-white/40 hover:text-white/60'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Shield size={12} />
          Why does ADE say this?
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2 border-t border-white/5">
              {Object.entries(signal.confidence_breakdown || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-white/50 text-[10px] font-data uppercase tracking-wider">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1 bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${style.badge.split(' ')[0]}`}
                        style={{ width: `${value * 100}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-data font-bold ${style.text}`}>
                      {(value * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [signals, setSignals] = useState([])
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getMvpSignals()
      .then((res) => {
        setSignals(res.signals || [])
        // Log view_signal for the default selected symbol
        if (user?.email) {
          api.logEvent(user.email, 'AAPL', 'view_signal').catch(() => {})
        }
      })
      .catch((e) => {
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = useCallback((symbol) => {
    setSelectedSymbol(symbol)
    if (user?.email) {
      api.logEvent(user.email, symbol, 'view_signal').catch(() => {})
    }
  }, [user])

  const handleExpandReasoning = useCallback((symbol) => {
    if (user?.email) {
      api.logEvent(user.email, symbol, 'view_reasoning').catch(() => {})
    }
  }, [user])

  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-8">
          <div className="h-16 w-1/3 skeleton rounded-none border border-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonLoader key={i} height={220} className="rounded-none border border-white/10" />
            ))}
          </div>
        </div>
      </PageWrapper>
    )
  }

  const selectedSignal = signals.find((s) => s.symbol === selectedSymbol) || signals[0]

  const verdictCounts = signals.reduce((acc, s) => {
    acc[s.verdict] = (acc[s.verdict] || 0) + 1
    return acc
  }, {})

  return (
    <PageWrapper className="relative min-h-screen">
      <div className="space-y-10 relative z-10 mt-4 mb-24">

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: easing }}
          className="relative cyber-panel border-l-[6px] border-l-apex-accent p-8 md:p-10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-apex-accent/5 via-transparent to-apex-pink/5 opacity-50 pointer-events-none" />
          <div className="absolute -right-16 -top-16 text-[16rem] text-apex-accent/5 font-black font-display rotate-12 pointer-events-none">
            AI
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Cpu size={18} className="text-apex-accent animate-pulse" />
                <p className="text-apex-cyan text-xs uppercase font-data tracking-[0.3em] font-bold">Signal Hub // MVP</p>
              </div>
              <GlitchText as="h1" text="AI Signal Hub" className="text-4xl md:text-5xl font-display font-black tracking-tighter leading-[0.9] text-white" />
              <p className="text-white/40 text-xs font-data uppercase tracking-widest mt-4 border-l pl-3 border-white/20">
                AI-scored trade signals for 10 focus symbols. Updated daily.
              </p>
            </div>

            <div className="flex gap-4">
              {Object.entries(verdictCounts).map(([verdict, count]) => {
                const s = VERDICT_STYLES[verdict] || VERDICT_STYLES.watch
                return (
                  <div key={verdict} className={`px-4 py-3 border ${s.border} ${s.bg} min-w-[80px] text-center`}>
                    <p className={`text-2xl font-display font-black ${s.text}`}>{count}</p>
                    <p className="text-white/40 text-[10px] font-data uppercase tracking-widest mt-1">{verdict}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="p-4 bg-apex-loss/15 border border-apex-loss/30 text-apex-loss text-sm font-data">
            {error}
          </div>
        )}

        {/* Main content: signals + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Signal cards column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-apex-accent" />
              <h2 className="text-xs font-data uppercase tracking-[0.2em] text-white/50">Watchlist Signals</h2>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              {signals.map((signal) => (
                <SignalCard
                  key={signal.symbol}
                  signal={signal}
                  isSelected={signal.symbol === selectedSymbol}
                  onSelect={handleSelect}
                  onExpandReasoning={handleExpandReasoning}
                />
              ))}
            </div>
          </div>

          {/* Chart + detailed view column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart */}
            <motion.div
              key={selectedSymbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="cyber-panel border border-white/10 bg-black/60 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <BarChart3 size={16} className="text-apex-cyan" />
                  <span className="text-white font-display font-bold text-lg">{selectedSymbol}</span>
                  {selectedSignal && (
                    <span className={`px-2 py-0.5 text-[10px] font-data font-bold uppercase tracking-widest ${VERDICT_STYLES[selectedSignal.verdict]?.badge}`}>
                      {selectedSignal.verdict}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 text-[10px] font-data text-white/30 uppercase tracking-widest">
                  <span className="px-2 py-1 bg-apex-cyan/10 border border-apex-cyan/20 text-apex-cyan">Live</span>
                </div>
              </div>
              <div className="h-[420px]">
                <TradingViewChart symbol={selectedSymbol} height={420} />
              </div>
            </motion.div>

            {/* Detailed Signal Info */}
            {selectedSignal && (
              <motion.div
                key={`detail-${selectedSymbol}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="cyber-panel border border-white/10 bg-black/60 p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-apex-accent" />
                  <h3 className="text-sm font-data uppercase tracking-[0.2em] text-white/60">Signal Analysis — {selectedSymbol}</h3>
                </div>
                <p className="text-white/70 font-body text-sm leading-relaxed border-l-2 border-apex-accent/30 pl-4 mb-6">
                  {selectedSignal.reasoning}
                </p>

                {/* Confidence breakdown grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.entries(selectedSignal.confidence_breakdown || {}).map(([key, value]) => {
                    const pct = (value * 100).toFixed(0)
                    const color = value > 0.7 ? 'text-apex-profit' : value > 0.4 ? 'text-apex-warning' : 'text-apex-loss'
                    return (
                      <div key={key} className="p-3 border border-white/5 bg-white/[0.02]">
                        <p className="text-white/40 text-[10px] font-data uppercase tracking-widest mb-2">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className={`text-xl font-display font-black ${color}`}>{pct}%</p>
                        <div className="h-0.5 bg-white/10 mt-2 overflow-hidden">
                          <div className={`h-full ${value > 0.7 ? 'bg-apex-profit' : value > 0.4 ? 'bg-apex-warning' : 'bg-apex-loss'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>

      </div>
    </PageWrapper>
  )
}
