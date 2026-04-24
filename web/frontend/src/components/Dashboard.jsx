import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Eye, ChevronDown, ChevronUp,
  Activity, Cpu, BarChart3, Shield, Zap, X, Plus, RefreshCw, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import PageWrapper from './PageWrapper'
import GlitchText from './GlitchText'
import SkeletonLoader from './SkeletonLoader'
import TradingViewChart from './TradingViewChart'
import { Calculator, History } from 'lucide-react'

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
  strong_buy: {
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/50',
    text: 'text-emerald-300',
    badge: 'bg-emerald-400 text-black font-black uppercase tracking-widest',
    glow: 'shadow-[0_0_30px_rgba(52,211,153,0.3)]',
    icon: Zap,
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
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    badge: 'bg-orange-500 text-white',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    icon: TrendingDown,
  },
  strong_avoid: {
    bg: 'bg-apex-loss/20',
    border: 'border-apex-loss/60',
    text: 'text-apex-loss',
    badge: 'bg-apex-loss text-white font-black uppercase tracking-widest',
    glow: 'shadow-[0_0_30px_rgba(255,0,85,0.3)]',
    icon: Shield,
  },
}

function getConfidencePct(signal) {
  const c = signal.confidence
  if (c === undefined || c === null) return 0
  return c > 1 ? c : c * 100
}

function minutesAgo(isoStr) {
  if (!isoStr) return null
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000)
  if (diff < 1) return 'just now'
  return `${diff}m ago`
}

function SignalCardSkeleton() {
  return (
    <div className="cyber-panel p-5 border border-white/10 bg-black/40 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonLoader width={64} height={22} />
          <SkeletonLoader width={48} height={16} />
        </div>
        <SkeletonLoader width={20} height={20} />
      </div>
      <SkeletonLoader height={14} width="55%" />
      <div className="space-y-1">
        <SkeletonLoader height={8} />
        <SkeletonLoader height={4} />
      </div>
      <SkeletonLoader height={30} />
      <SkeletonLoader height={12} width="70%" />
    </div>
  )
}

function SignalCard({ signal, isSelected, onSelect, onExpandReasoning, onRemove, onRefresh, isRefreshing, inCooldown }) {
  const [expanded, setExpanded] = useState(false)
  const style = VERDICT_STYLES[signal.verdict?.toLowerCase()] || VERDICT_STYLES.watch
  const Icon = style.icon
  const confidencePct = getConfidencePct(signal)
  const updated = minutesAgo(signal.generated_at)

  const handleExpand = (e) => {
    e.stopPropagation()
    setExpanded(!expanded)
    if (!expanded) onExpandReasoning?.(signal.symbol)
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
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-display font-black text-white tracking-tight">{signal.symbol}</span>
          <span className={`px-2.5 py-0.5 text-[10px] font-data font-bold uppercase tracking-widest ${style.badge}`}>
            {signal.verdict}
          </span>
          <span className="text-[9px] text-white/30 font-data border border-white/10 px-1.5 py-0.5 uppercase">
            1-3d outlook
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Icon size={16} className={style.text} />
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(signal.symbol) }}
              className="text-white/20 hover:text-apex-loss transition-colors ml-1"
              title={`Remove ${signal.symbol}`}
              aria-label={`Remove ${signal.symbol}`}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-3 mb-3">
        {signal.price > 0 && (
          <span className="text-white font-data text-sm font-bold">
            ${signal.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
        <span className={`text-xs font-data font-bold ${signal.regime_conflict ? 'text-apex-warning' : 'text-apex-profit'}`}>
          {signal.regime_conflict ? 'Regime Conflict' : 'Trend Aligned'}
        </span>
      </div>

      {/* Confidence */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <div className="flex flex-col">
            <span className="text-white/40 text-[10px] font-data uppercase tracking-widest">Confidence</span>
            <span className="text-[8px] text-white/30 truncate max-w-[140px]">{signal.calibrated_label}</span>
          </div>
          <span className={`text-xs font-data font-bold ${style.text}`}>{confidencePct.toFixed(0)}%</span>
        </div>
        <div className="h-1 bg-white/10 w-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidencePct}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full ${style.badge.split(' ')[0]}`}
          />
        </div>
      </div>

      {/* Reasoning */}
      <p className="text-white/80 text-[11px] font-body leading-relaxed line-clamp-2 mb-2">
        {signal.reasoning}
      </p>

      {/* Key indicator pills — always visible */}
      {(signal.key_indicators || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {signal.key_indicators.slice(0, 3).map((ind, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/45 text-[9px] font-data truncate max-w-[160px]">
              {ind}
            </span>
          ))}
        </div>
      )}

      {/* Last updated + Refresh */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span className="text-[9px] text-white/25 font-data">
          {updated ? `Last updated: ${updated}` : ''}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRefresh?.(signal.symbol) }}
          disabled={inCooldown || isRefreshing}
          className="flex items-center gap-1 text-[9px] font-data uppercase tracking-widest text-white/30 hover:text-apex-accent disabled:text-white/15 disabled:cursor-not-allowed transition-colors"
          title="Force refresh (bypasses 15-min cache)"
        >
          <RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing' : inCooldown ? 'Wait 60s' : 'Refresh'}
        </button>
      </div>

      {/* Expandable details */}
      <button
        onClick={handleExpand}
        className={`flex items-center gap-2 text-[11px] font-data uppercase tracking-widest transition-colors w-full justify-between py-2 border-t border-white/5 mt-2 ${
          expanded ? style.text : 'text-white/40 hover:text-white/60'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Shield size={12} />
          Details & Indicators
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
            <div className="pt-3 space-y-4 border-t border-white/5">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-apex-profit/5 border border-apex-profit/10">
                  <span className="text-[8px] text-apex-profit uppercase font-data font-bold block mb-1">Bull Case</span>
                  <p className="text-[9px] text-white/60 leading-tight">{signal.bull_case}</p>
                </div>
                <div className="p-2 bg-apex-loss/5 border border-apex-loss/10">
                  <span className="text-[8px] text-apex-loss uppercase font-data font-bold block mb-1">Bear Case</span>
                  <p className="text-[9px] text-white/60 leading-tight">{signal.bear_case}</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-data">All Key Signals</span>
                <div className="flex flex-wrap gap-1.5">
                  {(signal.key_indicators || []).map((ind, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/50 text-[9px] font-data truncate max-w-[150px]">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>

              {signal.indicators_snapshot && (
                <div className="grid grid-cols-2 gap-2 text-[8px] font-data text-white/40 uppercase tracking-widest pt-2 border-t border-white/5">
                  <div className="flex justify-between">
                    <span>RSI</span>
                    <span className="text-white">{signal.indicators_snapshot.rsi?.value?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MACD</span>
                    <span className="text-white">{signal.indicators_snapshot.macd?.histogram?.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vol Ratio</span>
                    <span className="text-white">{signal.indicators_snapshot.volume_ratio?.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>52w High</span>
                    <span className="text-white">{(signal.indicators_snapshot.range_52w?.dist_from_high_pct)?.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function PositionCalculator({ price, stopLoss }) {
  const [accountSize, setAccountSize] = useState(100000)
  const [riskPct, setRiskPct] = useState(2)

  const stopPrice = parseFloat(stopLoss?.split(' ')[0]) || (price * 0.95)
  const riskAmount = accountSize * (riskPct / 100)
  const priceRisk = Math.abs(price - stopPrice)
  const shares = priceRisk > 0 ? Math.floor(riskAmount / priceRisk) : 0
  const totalCost = shares * price

  return (
    <div className="cyber-panel p-6 bg-apex-accent/5 border border-apex-accent/20">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={16} className="text-apex-accent" />
        <h4 className="text-[10px] font-data uppercase tracking-[0.3em] text-white/60">Position Sizing Calculator (2% Rule)</h4>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Account Size ($)</label>
            <input
              type="number"
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
              className="bg-black/40 border border-white/10 p-2 text-white font-data text-xs w-full focus:border-apex-accent outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Risk per Trade (%)</label>
            <input
              type="number"
              value={riskPct}
              onChange={(e) => setRiskPct(e.target.value)}
              className="bg-black/40 border border-white/10 p-2 text-white font-data text-xs w-full focus:border-apex-accent outline-none"
            />
          </div>
        </div>
        <div className="bg-black/60 p-4 border border-white/5 space-y-3">
          <div className="flex justify-between">
            <span className="text-[10px] text-white/40 uppercase tracking-tighter">Recommended Shares</span>
            <span className="text-apex-accent font-data font-bold text-sm tracking-widest">{shares.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-white/40 uppercase tracking-tighter">Position Notional</span>
            <span className="text-white font-data text-sm tracking-widest">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-white/40 uppercase tracking-tighter">Max Risk ($)</span>
            <span className="text-apex-loss font-data font-bold text-sm tracking-widest">${riskAmount.toLocaleString()}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-white/20 italic leading-snug">
            Calculated based on stop loss at ${stopPrice.toFixed(2)}. Always respect your stops.
          </div>
        </div>
      </div>
    </div>
  )
}

const MAX_WATCHLIST = 20

export default function Dashboard() {
  const { user } = useAuth()
  const [signals, setSignals] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addInput, setAddInput] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [refreshCooldowns, setRefreshCooldowns] = useState(new Set())
  const [refreshingSymbols, setRefreshingSymbols] = useState(new Set())
  const navigate = useNavigate()
  const addInputRef = useRef(null)

  const loadSignalsForSymbols = useCallback(async (symbols) => {
    if (!symbols || symbols.length === 0) return
    setLoading(true)
    try {
      const res = await api.getBatchSignals(symbols)
      setSignals(res.signals || [])
      if (user?.email) {
        api.logEvent(user.email, symbols[0], 'view_signal').catch(() => {})
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      // Authenticated: load from backend watchlist
      api.getWatchlists()
        .then((res) => {
          const wl = res.watchlists?.default || []
          setWatchlist(wl)
          const syms = wl.length > 0 ? wl : ['AAPL', 'MSFT', 'NVDA']
          setSelectedSymbol(syms[0])
          return loadSignalsForSymbols(syms)
        })
        .catch(() => {
          // Fallback to MVP if watchlist fetch fails
          api.getMvpSignals()
            .then((r) => setSignals(r.signals || []))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false))
        })
    } else {
      // Unauthenticated: load 10 MVP symbols
      api.getMvpSignals()
        .then((res) => {
          setSignals(res.signals || [])
          if (user?.email) {
            api.logEvent(user.email, 'AAPL', 'view_signal').catch(() => {})
          }
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleRefresh = useCallback(async (symbol) => {
    if (refreshCooldowns.has(symbol) || refreshingSymbols.has(symbol)) return
    setRefreshingSymbols((prev) => new Set([...prev, symbol]))
    try {
      const newSignal = await api.refreshSignal(symbol)
      setSignals((prev) => prev.map((s) => s.symbol === symbol ? newSignal : s))
      toast.success(`${symbol} signal refreshed`)
    } catch (e) {
      toast.error(`Refresh failed: ${e.message}`)
    } finally {
      setRefreshingSymbols((prev) => { const n = new Set(prev); n.delete(symbol); return n })
      setRefreshCooldowns((prev) => new Set([...prev, symbol]))
      setTimeout(() => {
        setRefreshCooldowns((prev) => { const n = new Set(prev); n.delete(symbol); return n })
      }, 60000)
    }
  }, [refreshCooldowns, refreshingSymbols])

  const handleAddSymbol = async () => {
    const sym = addInput.trim().toUpperCase()
    if (!sym) return
    if (watchlist.length >= MAX_WATCHLIST) {
      setAddError(`${MAX_WATCHLIST} symbol limit reached`)
      return
    }
    if (watchlist.includes(sym)) {
      setAddError(`${sym} is already in your watchlist`)
      return
    }
    setAddLoading(true)
    setAddError('')
    try {
      const quote = await api.getQuote(sym)
      if (!quote || !quote.price || quote.price === 0) {
        setAddError('Symbol not found — check the ticker and try again')
        setAddLoading(false)
        return
      }
      await api.addToWatchlist('default', sym)
      const newWl = [...watchlist, sym]
      setWatchlist(newWl)
      setAddInput('')
      // Load signal for new symbol
      const newSignal = await api.getSignal(sym)
      setSignals((prev) => [...prev, newSignal])
      setSelectedSymbol(sym)
      toast.success(`${sym} added to watchlist`)
    } catch (e) {
      setAddError('Symbol not found — check the ticker and try again')
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemoveSymbol = useCallback(async (symbol) => {
    try {
      await api.removeFromWatchlist('default', symbol)
      const newWl = watchlist.filter((s) => s !== symbol)
      setWatchlist(newWl)
      setSignals((prev) => prev.filter((s) => s.symbol !== symbol))
      if (selectedSymbol === symbol) {
        const remaining = signals.filter((s) => s.symbol !== symbol)
        setSelectedSymbol(remaining[0]?.symbol || '')
      }
    } catch (e) {
      toast.error(`Failed to remove ${symbol}`)
    }
  }, [watchlist, signals, selectedSymbol])

  const selectedSignal = signals.find((s) => s.symbol === selectedSymbol) || signals[0]
  const selectedConfidencePct = selectedSignal ? getConfidencePct(selectedSignal) : 0

  const verdictCounts = signals.reduce((acc, s) => {
    acc[s.verdict] = (acc[s.verdict] || 0) + 1
    return acc
  }, {})

  if (loading && signals.length === 0) {
    return (
      <PageWrapper>
        <div className="space-y-8">
          <div className="h-16 w-1/3 skeleton rounded-none border border-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SignalCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </PageWrapper>
    )
  }

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
                AI-scored trade signals. Updated daily. 1-3 day directional window.
              </p>
              <Link
                to="/track-record"
                className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-data text-apex-profit/70 hover:text-apex-profit transition-colors"
              >
                <ExternalLink size={11} />
                See how ADE has performed →
              </Link>
            </div>

            <div className="flex gap-4">
              {Object.entries(verdictCounts).map(([verdict, count]) => {
                const s = VERDICT_STYLES[verdict?.toLowerCase()] || VERDICT_STYLES.watch
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

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Signal cards column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-apex-accent" />
              <h2 className="text-xs font-data uppercase tracking-[0.2em] text-white/50">Watchlist Signals</h2>
              {user && watchlist.length > 0 && (
                <span className="text-[9px] text-white/25 font-data ml-auto">{watchlist.length}/{MAX_WATCHLIST}</span>
              )}
            </div>

            {/* Add symbol input — authenticated users only */}
            {user && (
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    ref={addInputRef}
                    type="text"
                    value={addInput}
                    onChange={(e) => { setAddInput(e.target.value.toUpperCase()); setAddError('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSymbol() }}
                    placeholder="Add symbol (e.g. AAPL)"
                    maxLength={10}
                    disabled={watchlist.length >= MAX_WATCHLIST || addLoading}
                    className="flex-1 bg-black/40 border border-white/10 focus:border-apex-accent/50 outline-none text-white font-data text-xs px-3 py-2 placeholder-white/20 disabled:opacity-40"
                  />
                  <button
                    onClick={handleAddSymbol}
                    disabled={!addInput.trim() || addLoading || watchlist.length >= MAX_WATCHLIST}
                    className="px-3 py-2 bg-apex-accent/10 hover:bg-apex-accent/20 border border-apex-accent/30 text-apex-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Add symbol"
                  >
                    <Plus size={14} className={addLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
                {watchlist.length >= MAX_WATCHLIST && (
                  <p className="text-[10px] text-apex-warning font-data">{MAX_WATCHLIST} symbol limit reached</p>
                )}
                {addError && (
                  <p className="text-[10px] text-apex-loss font-data">{addError}</p>
                )}
              </div>
            )}

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              {loading && signals.length === 0
                ? [1, 2, 3].map((i) => <SignalCardSkeleton key={i} />)
                : signals.map((signal) => (
                    <SignalCard
                      key={signal.symbol}
                      signal={signal}
                      isSelected={signal.symbol === selectedSymbol}
                      onSelect={handleSelect}
                      onExpandReasoning={handleExpandReasoning}
                      onRemove={user ? handleRemoveSymbol : null}
                      onRefresh={handleRefresh}
                      isRefreshing={refreshingSymbols.has(signal.symbol)}
                      inCooldown={refreshCooldowns.has(signal.symbol)}
                    />
                  ))}
            </div>
          </div>

          {/* Chart + detail column */}
          <div className="lg:col-span-2 space-y-6">
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
                    <span className={`px-2 py-0.5 text-[10px] font-data font-bold uppercase tracking-widest ${VERDICT_STYLES[selectedSignal.verdict?.toLowerCase()]?.badge || ''}`}>
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

            {selectedSignal && (
              <motion.div
                key={`detail-${selectedSymbol}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="cyber-panel border border-white/10 bg-black/60 p-6"
              >
                {/* Detail Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-apex-accent/10 border border-apex-accent/20">
                      <Cpu size={24} className="text-apex-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-data uppercase tracking-[0.2em] text-white/40">Market Reasoning — {selectedSymbol}</h3>
                        <span className="text-[8px] text-white/20 uppercase tracking-widest border border-white/5 px-1.5 py-0.5">{selectedSignal.calibrated_label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-2xl font-display font-black uppercase ${VERDICT_STYLES[selectedSignal.verdict?.toLowerCase()]?.text || 'text-white'}`}>
                          {selectedSignal.verdict}
                        </span>
                        <div className="h-6 w-[1px] bg-white/10" />
                        <div className="flex flex-col">
                          <span className="text-white font-data text-sm font-bold">
                            {selectedConfidencePct.toFixed(0)}%
                          </span>
                          <span className="text-[9px] text-white/30 uppercase tracking-widest leading-none mt-1">Confidence</span>
                        </div>
                        <div className="h-6 w-[1px] bg-white/10" />
                        <div className="flex flex-col">
                          <span className="text-white font-data text-xs uppercase">{selectedSignal.timeframe || '1-3 DAYS'}</span>
                          <span className="text-[9px] text-white/30 uppercase tracking-widest leading-none mt-1">Timeframe</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRefresh(selectedSymbol)}
                    disabled={refreshCooldowns.has(selectedSymbol) || refreshingSymbols.has(selectedSymbol)}
                    className="px-4 py-2 bg-white/5 hover:bg-apex-accent hover:text-black border border-white/10 hover:border-apex-accent font-data text-[10px] font-bold uppercase tracking-widest transition-all h-fit flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={14} className={refreshingSymbols.has(selectedSymbol) ? 'animate-spin' : ''} />
                    {refreshingSymbols.has(selectedSymbol) ? 'Refreshing...' : refreshCooldowns.has(selectedSymbol) ? 'Wait 60s' : 'Refetch Signal'}
                  </button>
                </div>

                {/* Synthesis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pt-8 border-t border-white/5">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-data uppercase tracking-[0.3em] text-apex-accent">AI Synthesis</h4>
                    <p className="text-white/90 font-body text-base leading-relaxed tracking-tight">
                      {selectedSignal.reasoning}
                    </p>
                    <div className="p-4 bg-apex-profit/5 border border-apex-profit/10 border-l-[3px]">
                      <p className="text-[9px] text-apex-profit uppercase font-data font-bold tracking-widest mb-2">Bullish Driver</p>
                      <p className="text-white/80 text-sm font-body">{selectedSignal.bull_case}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-data uppercase tracking-[0.3em] text-white/30">Key Supporting Indicators</h4>
                    <div className="space-y-2">
                      {(selectedSignal.key_indicators || []).map((tag, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5">
                          <Activity size={14} className="text-apex-cyan/50" />
                          <span className="text-xs text-white/70 font-data">{tag}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-apex-loss/5 border border-apex-loss/10 border-l-[3px]">
                      <p className="text-[9px] text-apex-loss uppercase font-data font-bold tracking-widest mb-2">Primary Risk</p>
                      <p className="text-white/80 text-sm font-body">{selectedSignal.bear_case}</p>
                    </div>
                  </div>
                </div>

                {/* Calculator + Contextual Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/5">
                  <div className="lg:col-span-2">
                    <PositionCalculator
                      price={selectedSignal.price}
                      stopLoss={selectedSignal.stop_loss || `${(selectedSignal.price * 0.95).toFixed(2)} (Managed Risk)`}
                    />
                  </div>
                  <div className="cyber-panel p-6 bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <History size={14} className="text-white/40" />
                        <span className="text-[10px] font-data uppercase tracking-widest text-white/40">Signal Persistence</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] text-white/30 font-data">Generated</span>
                          <span className="text-[10px] text-white font-data">
                            {selectedSignal.generated_at ? new Date(selectedSignal.generated_at).toLocaleTimeString() : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] text-white/30 font-data">AI Model</span>
                          <span className="text-[10px] text-white font-data">claude-sonnet-4</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] text-white/30 font-data">Raw Conf.</span>
                          <span className="text-[10px] text-white font-data">
                            {selectedSignal.raw_confidence !== undefined ? `${selectedSignal.raw_confidence}%` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/chat', { state: { symbol: selectedSymbol, signal: selectedSignal } })}
                      className="mt-6 w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-data uppercase tracking-widest transition-all"
                    >
                      Ask Assistant about {selectedSymbol}
                    </button>
                  </div>
                </div>

                {/* Technical snapshots */}
                {selectedSignal.indicators_snapshot && (
                  <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap gap-4 items-center">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest mr-2">Core Tech Data:</span>
                    {[
                      { l: 'RSI', v: selectedSignal.indicators_snapshot.rsi?.value?.toFixed(1) },
                      { l: 'EMA 9/21', v: selectedSignal.indicators_snapshot.ema?.relationship },
                      { l: '52w High', v: (selectedSignal.indicators_snapshot.range_52w?.dist_from_high_pct)?.toFixed(1) + '%' },
                      { l: 'BB Pos', v: selectedSignal.indicators_snapshot.bollinger?.position },
                    ].filter((t) => t.v).map((tag) => (
                      <span key={tag.l} className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/40 text-[9px] uppercase tracking-tighter">
                        {tag.l}: <span className="text-white/60 ml-1">{tag.v}</span>
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
