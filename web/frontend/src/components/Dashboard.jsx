import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Cpu, BarChart3, Zap, Plus, ExternalLink,
  RefreshCw, WifiOff, Calculator, History,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import PageWrapper from './PageWrapper'
import GlitchText from './GlitchText'
import SkeletonLoader from './SkeletonLoader'
import TradingViewChart from './TradingViewChart'
import SignalCard from './ui/SignalCard'
import ConfidenceBar from './ui/ConfidenceBar'
import VerdictBadge from './ui/VerdictBadge'
import IndicatorPill from './ui/IndicatorPill'
import UpgradePrompt from './UpgradePrompt'

const easing = [0.16, 1, 0.3, 1]
const MAX_WATCHLIST = 20

const VERDICT_COLOR = {
  STRONG_BUY:   '#34D399',
  BUY:          '#00FF88',
  WATCH:        '#FFEA00',
  AVOID:        '#F97316',
  STRONG_AVOID: '#FF0055',
}

function getConfidencePct(signal) {
  const c = signal?.confidence
  if (c == null) return 0
  return c > 1 ? c : c * 100
}

function SignalCardSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SkeletonLoader width={56} height={20} />
          <SkeletonLoader width={44} height={16} />
        </div>
        <SkeletonLoader width={18} height={18} />
      </div>
      <SkeletonLoader height={12} width="55%" />
      <SkeletonLoader height={2} />
      <SkeletonLoader height={28} />
      <SkeletonLoader height={10} width="65%" />
    </div>
  )
}

function PositionCalculator({ price, stopLoss }) {
  const [accountSize, setAccountSize] = useState(100000)
  const [riskPct, setRiskPct]         = useState(2)

  const stopPrice  = parseFloat(stopLoss?.split(' ')[0]) || (price * 0.95)
  const riskAmount = accountSize * (riskPct / 100)
  const priceRisk  = Math.abs(price - stopPrice)
  const shares     = priceRisk > 0 ? Math.floor(riskAmount / priceRisk) : 0
  const totalCost  = shares * price

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
    padding: '8px 10px', color: '#FFFFFF',
    fontFamily: 'var(--font-data, monospace)', fontSize: '12px',
    width: '100%', outline: 'none',
  }

  const labelStyle = {
    fontFamily: 'var(--font-data, monospace)', fontSize: '9px',
    color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase',
    letterSpacing: '0.12em', display: 'block', marginBottom: '4px',
  }

  return (
    <div className="p-5" style={{ background: 'rgba(204,255,0,0.03)', border: '1px solid rgba(204,255,0,0.12)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={14} className="text-apex-accent" />
        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
          Position Sizing — 2% Rule
        </span>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-3">
          <div>
            <label style={labelStyle}>Account Size ($)</label>
            <input type="number" value={accountSize} onChange={e => setAccountSize(+e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Risk per Trade (%)</label>
            <input type="number" value={riskPct} onChange={e => setRiskPct(+e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div className="p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.50)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { l: 'Recommended Shares', v: shares.toLocaleString(), c: '#CCFF00'   },
            { l: 'Position Notional',  v: `$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, c: 'rgba(255,255,255,0.85)' },
            { l: 'Max Risk ($)',       v: `$${riskAmount.toLocaleString()}`, c: '#FF0055' },
          ].map(({ l, v, c }) => (
            <div key={l} className="flex justify-between items-center">
              <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</span>
              <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '13px', fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '8px', color: 'rgba(255,255,255,0.18)', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', lineHeight: 1.4 }}>
            Stop at ${stopPrice.toFixed(2)}. Always respect your stops.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, tier } = useAuth()
  const navigate = useNavigate()

  const [signals,          setSignals]          = useState([])
  const [watchlist,        setWatchlist]        = useState([])
  const [selectedSymbol,   setSelectedSymbol]   = useState('AAPL')
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)
  const [addInput,         setAddInput]         = useState('')
  const [addError,         setAddError]         = useState('')
  const [addLoading,       setAddLoading]       = useState(false)
  const [refreshCooldowns, setRefreshCooldowns] = useState(new Set())
  const [refreshingSymbols,setRefreshingSymbols]= useState(new Set())
  const addInputRef = useRef(null)

  const loadSignalsForSymbols = useCallback(async (symbols) => {
    if (!symbols?.length) return
    // Free tier: don't make any Claude API calls — signals are locked
    if (tier === 'free') { setLoading(false); return }
    setLoading(true)
    try {
      const res = await api.getBatchSignals(symbols)
      setSignals(res.signals || [])
      if (user?.email) api.logEvent(user.email, symbols[0], 'view_signal').catch(() => {})
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user, tier])

  useEffect(() => {
    if (tier === 'free') { setLoading(false); return }
    if (user) {
      api.getWatchlists()
        .then((res) => {
          const wl = res.watchlists?.default || []
          setWatchlist(wl)
          const syms = wl.length > 0 ? wl : ['AAPL', 'MSFT', 'NVDA']
          setSelectedSymbol(syms[0])
          return loadSignalsForSymbols(syms)
        })
        .catch(() => {
          api.getMvpSignals()
            .then((r) => setSignals(r.signals || []))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false))
        })
    } else {
      api.getMvpSignals()
        .then((res) => {
          setSignals(res.signals || [])
          if (user?.email) api.logEvent(user.email, 'AAPL', 'view_signal').catch(() => {})
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [user, tier]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((symbol) => {
    setSelectedSymbol(symbol)
    if (user?.email) api.logEvent(user.email, symbol, 'view_signal').catch(() => {})
  }, [user])

  const handleExpandReasoning = useCallback((symbol) => {
    if (user?.email) api.logEvent(user.email, symbol, 'view_reasoning').catch(() => {})
  }, [user])

  const handleRefresh = useCallback(async (symbol) => {
    if (refreshCooldowns.has(symbol) || refreshingSymbols.has(symbol)) return
    setRefreshingSymbols(prev => new Set([...prev, symbol]))
    try {
      const newSignal = await api.refreshSignal(symbol)
      setSignals(prev => prev.map(s => s.symbol === symbol ? newSignal : s))
      toast.success(`${symbol} refreshed`)
    } catch (e) {
      toast.error(`Refresh failed: ${e.message}`)
    } finally {
      setRefreshingSymbols(prev => { const n = new Set(prev); n.delete(symbol); return n })
      setRefreshCooldowns(prev => new Set([...prev, symbol]))
      setTimeout(() => {
        setRefreshCooldowns(prev => { const n = new Set(prev); n.delete(symbol); return n })
      }, 60000)
    }
  }, [refreshCooldowns, refreshingSymbols])

  const handleAddSymbol = async () => {
    const sym = addInput.trim().toUpperCase()
    if (!sym) return
    if (watchlist.length >= MAX_WATCHLIST) { setAddError(`${MAX_WATCHLIST} symbol limit reached`); return }
    if (watchlist.includes(sym))            { setAddError(`${sym} already in watchlist`); return }
    setAddLoading(true)
    setAddError('')
    try {
      const quote = await api.getQuote(sym)
      if (!quote?.price || quote.price === 0) { setAddError('Symbol not found — check ticker'); setAddLoading(false); return }
      await api.addToWatchlist('default', sym)
      const newWl = [...watchlist, sym]
      setWatchlist(newWl)
      setAddInput('')
      const newSignal = await api.getSignal(sym)
      setSignals(prev => [...prev, newSignal])
      setSelectedSymbol(sym)
      toast.success(`${sym} added`)
    } catch {
      setAddError('Symbol not found — check ticker')
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemoveSymbol = useCallback(async (symbol) => {
    try {
      await api.removeFromWatchlist('default', symbol)
      const newWl = watchlist.filter(s => s !== symbol)
      setWatchlist(newWl)
      setSignals(prev => prev.filter(s => s.symbol !== symbol))
      if (selectedSymbol === symbol) {
        const remaining = signals.filter(s => s.symbol !== symbol)
        setSelectedSymbol(remaining[0]?.symbol || '')
      }
    } catch {
      toast.error(`Failed to remove ${symbol}`)
    }
  }, [watchlist, signals, selectedSymbol])

  const selectedSignal       = signals.find(s => s.symbol === selectedSymbol) || signals[0]
  const selectedConfidencePct = selectedSignal ? getConfidencePct(selectedSignal) : 0
  const verdictKey           = (selectedSignal?.verdict || 'watch').toUpperCase()
  const selectedColor        = VERDICT_COLOR[verdictKey] || '#CCFF00'

  const verdictCounts = signals.reduce((acc, s) => {
    const v = (s.verdict || 'WATCH').toUpperCase()
    acc[v] = (acc[v] || 0) + 1
    return acc
  }, {})

  if (tier === 'free') {
    return (
      <PageWrapper className="relative min-h-screen">
        {/* Research disclaimer */}
        <div
          className="flex items-center gap-2 px-4 py-2 mb-4 text-xs"
          style={{
            fontFamily: 'var(--font-data, monospace)',
            letterSpacing: '0.08em',
            background: 'rgba(255,184,0,0.05)',
            borderLeft: '3px solid rgba(255,184,0,0.50)',
            color: 'rgba(255,184,0,0.70)',
          }}
        >
          <span>⚠</span>
          <span>ADE signals are for research purposes only and do not constitute financial advice.{' '}
            <a href="/risk-disclosure" className="underline hover:text-amber-300 transition-colors">Risk Disclosure</a>.
          </span>
        </div>
        <div className="relative">
          {/* Blurred ghost preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 select-none pointer-events-none"
            style={{ filter: 'blur(4px)', opacity: 0.35 }}
          >
            {['AAPL','MSFT','NVDA','TSLA','META','AMZN'].map(sym => (
              <div key={sym} className="p-4 space-y-3"
                style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white/80">{sym}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(204,255,0,0.15)', color: '#CCFF00' }}>BUY</span>
                </div>
                <div className="h-1 rounded" style={{ background: 'rgba(204,255,0,0.3)', width: '70%' }} />
                <div className="space-y-1">
                  {[80, 55, 40].map(w => (
                    <div key={w} className="h-2 rounded" style={{ background: 'rgba(255,255,255,0.06)', width: `${w}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Upgrade overlay */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(3,5,8,0.70)', backdropFilter: 'blur(2px)' }}>
            <UpgradePrompt requiredTier="edge" feature="Signal Hub" />
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (loading && signals.length === 0) {
    return (
      <PageWrapper>
        <div className="space-y-8">
          <SkeletonLoader height={64} width="35%" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <SignalCardSkeleton key={i} />)}
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="relative min-h-screen">
      {/* Persistent research disclaimer — required on Signal Hub */}
      <div
        className="flex items-center gap-2 px-4 py-2 mb-4 text-xs"
        style={{
          fontFamily: 'var(--font-data, monospace)',
          letterSpacing: '0.08em',
          background: 'rgba(255,184,0,0.05)',
          borderLeft: '3px solid rgba(255,184,0,0.50)',
          color: 'rgba(255,184,0,0.70)',
        }}
      >
        <span>⚠</span>
        <span>ADE signals are for research purposes only and do not constitute financial advice. See{' '}
          <a href="/risk-disclosure" className="underline hover:text-amber-300 transition-colors">Risk Disclosure</a>.
        </span>
      </div>
      <div className="space-y-6 relative z-10 mt-5 mb-24">

        {/* ── Command bar header ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easing }}
          className="relative overflow-hidden"
          style={{
            background: 'rgba(7,9,15,0.85)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderLeft: '3px solid var(--accent-primary)',
            padding: '20px 24px',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-apex-accent/[0.03] to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Cpu size={12} className="text-apex-accent animate-pulse" />
                <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  Signal Hub
                </span>
                <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.20)', letterSpacing: '0.06em' }}>
                  · AI-scored · 1-3 day directional window
                </span>
              </div>
              <GlitchText as="h1" text="AI Signal Hub" className="text-3xl md:text-4xl font-display font-black tracking-tighter leading-none text-white" />
              <Link
                to="/track-record"
                className="inline-flex items-center gap-1.5 mt-3 transition-colors"
                style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.08em', color: 'rgba(0,232,121,0.55)' }}
              >
                <ExternalLink size={9} />
                ADE track record →
              </Link>
            </div>

            {/* Verdict count chips — compact */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(verdictCounts).map(([verdict, count]) => {
                const c = VERDICT_COLOR[verdict] || '#CCFF00'
                return (
                  <div key={verdict} className="text-center px-3 py-2 min-w-[52px]" style={{ border: `1px solid ${c}22`, background: `${c}08` }}>
                    <p style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '18px', fontWeight: 900, color: c, lineHeight: 1 }}>{count}</p>
                    <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '7px', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.10em', marginTop: '2px' }}>{verdict.replace('_', ' ')}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Offline / error banner ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 p-4"
              style={{ background: 'rgba(255,0,85,0.08)', border: '1px solid rgba(255,0,85,0.25)' }}
            >
              <WifiOff size={16} style={{ color: '#FF0055', flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,0,85,0.80)', letterSpacing: '0.04em' }}>
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Signal cards column */}
          <div className="lg:col-span-1 space-y-3">
            {/* Column header */}
            <div className="flex items-center gap-2 px-1">
              <Zap size={11} style={{ color: 'var(--accent-primary)' }} />
              <h2 style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
                Watchlist Signals
              </h2>
              {user && watchlist.length > 0 && (
                <span className="ml-auto" style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.20)' }}>
                  {watchlist.length}/{MAX_WATCHLIST}
                </span>
              )}
            </div>

            {/* Add symbol — authenticated only */}
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
                    className="flex-1 outline-none placeholder-white/20 disabled:opacity-40"
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                      color: '#FFFFFF', fontFamily: 'var(--font-data, monospace)', fontSize: '11px',
                      padding: '8px 12px',
                    }}
                  />
                  <button
                    onClick={handleAddSymbol}
                    disabled={!addInput.trim() || addLoading || watchlist.length >= MAX_WATCHLIST}
                    className="flex items-center justify-center px-3 transition-all disabled:opacity-30"
                    style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.25)', color: '#CCFF00' }}
                    aria-label="Add symbol"
                  >
                    <Plus size={14} className={addLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
                {watchlist.length >= MAX_WATCHLIST && (
                  <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: '#FFEA00' }}>Limit reached ({MAX_WATCHLIST})</p>
                )}
                {addError && (
                  <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: '#FF0055' }}>{addError}</p>
                )}
              </div>
            )}

            {/* Signal card list */}
            <div className="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-0.5">
              <AnimatePresence>
                {loading && signals.length === 0
                  ? [1,2,3].map(i => <SignalCardSkeleton key={i} />)
                  : signals.map((signal, i) => (
                      <SignalCard
                        key={signal.symbol}
                        signal={signal}
                        index={i}
                        isSelected={signal.symbol === selectedSymbol}
                        onSelect={handleSelect}
                        onExpandReasoning={handleExpandReasoning}
                        onRemove={user ? handleRemoveSymbol : null}
                        onRefresh={handleRefresh}
                        isRefreshing={refreshingSymbols.has(signal.symbol)}
                        inCooldown={refreshCooldowns.has(signal.symbol)}
                      />
                    ))
                }
              </AnimatePresence>
            </div>
          </div>

          {/* Chart + detail column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Chart */}
            <motion.div
              key={selectedSymbol}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.30 }}
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(7,9,15,0.90)' }}
            >
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                  <BarChart3 size={13} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '16px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                    {selectedSymbol}
                  </span>
                  {selectedSignal && <VerdictBadge verdict={selectedSignal.verdict} size="sm" />}
                </div>
                <div className="flex items-center gap-2">
                  <span style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'var(--accent-cyan)', background: 'rgba(0,212,255,0.08)',
                    border: '1px solid rgba(0,212,255,0.18)', padding: '2px 8px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-apex-cyan animate-pulse inline-block" />
                    Live
                  </span>
                </div>
              </div>
              <div className="h-[400px]">
                <TradingViewChart symbol={selectedSymbol} height={400} />
              </div>
            </motion.div>

            {/* Signal detail panel */}
            {selectedSignal && (
              <motion.div
                key={`detail-${selectedSymbol}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.30, delay: 0.07 }}
                style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(7,9,15,0.90)', padding: '24px' }}
              >
                {/* Detail header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                  <div>
                    <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: '8px' }}>
                      Market Reasoning — {selectedSymbol}
                    </p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <VerdictBadge verdict={selectedSignal.verdict} size="md" />
                      <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.10)' }} />
                      <div>
                        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '18px', fontWeight: 700, color: selectedColor }}>
                          {selectedConfidencePct.toFixed(0)}%
                        </span>
                        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block' }}>
                          Confidence
                        </span>
                      </div>
                      <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.10)' }} />
                      <div>
                        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.70)', textTransform: 'uppercase' }}>
                          {selectedSignal.timeframe || '1-3 DAYS'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block' }}>
                          Timeframe
                        </span>
                      </div>
                    </div>
                    {selectedSignal.calibrated_label && (
                      <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.22)', display: 'inline-block', marginTop: '6px', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 7px' }}>
                        {selectedSignal.calibrated_label}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRefresh(selectedSymbol)}
                    disabled={refreshCooldowns.has(selectedSymbol) || refreshingSymbols.has(selectedSymbol)}
                    className="flex items-center gap-2 px-4 py-2 transition-all disabled:opacity-35 shrink-0"
                    style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)', background: 'rgba(255,255,255,0.03)' }}
                  >
                    <RefreshCw size={12} className={refreshingSymbols.has(selectedSymbol) ? 'animate-spin' : ''} />
                    {refreshingSymbols.has(selectedSymbol) ? 'Refreshing…' : refreshCooldowns.has(selectedSymbol) ? 'Wait 60s' : 'Refetch Signal'}
                  </button>
                </div>

                {/* Confidence bar */}
                <ConfidenceBar
                  value={selectedConfidencePct}
                  height={3}
                  showValue={false}
                  className="mb-8"
                />

                {/* Synthesis + indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="space-y-4">
                    <h4 style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--accent-violet)' }}>AI Synthesis</h4>
                    <p style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '14px', lineHeight: 1.65, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.005em' }}>
                      {selectedSignal.reasoning}
                    </p>
                    <div className="p-4" style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.12)', borderLeft: '3px solid rgba(0,255,136,0.40)' }}>
                      <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: '#00FF88', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '6px' }}>Bullish Driver</p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{selectedSignal.bull_case}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)' }}>Key Signals</h4>
                    <div className="space-y-2">
                      {(selectedSignal.key_indicators || []).map((tag, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <Activity size={12} style={{ color: 'rgba(0,240,255,0.45)', flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.02em' }}>{tag}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4" style={{ background: 'rgba(255,0,85,0.04)', border: '1px solid rgba(255,0,85,0.12)', borderLeft: '3px solid rgba(255,0,85,0.35)' }}>
                      <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: '#FF0055', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '6px' }}>Primary Risk</p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{selectedSignal.bear_case}</p>
                    </div>
                    {/* Cross-timeframe notes from PRISM */}
                    {(selectedSignal.scalp_note && selectedSignal.scalp_note !== 'No intraday edge.') && (
                      <div className="px-3 py-2.5" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.10)' }}>
                        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(0,212,255,0.60)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Scalp › </span>
                        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.55)' }}>{selectedSignal.scalp_note.replace(/^Intraday:\s*/i, '')}</span>
                      </div>
                    )}
                    {(selectedSignal.long_note && selectedSignal.long_note !== 'Insufficient fundamental data.') && (
                      <div className="px-3 py-2.5" style={{ background: 'rgba(204,255,0,0.03)', border: '1px solid rgba(204,255,0,0.10)' }}>
                        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(204,255,0,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Long-term › </span>
                        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.55)' }}>{selectedSignal.long_note.replace(/^Long-term:\s*/i, '')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Calculator + persistence */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="lg:col-span-2">
                    <PositionCalculator
                      price={selectedSignal.price}
                      stopLoss={selectedSignal.stop_loss || `${(selectedSignal.price * 0.95).toFixed(2)} (Managed)`}
                    />
                  </div>
                  <div className="flex flex-col justify-between p-5" style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <History size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
                        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Signal Metadata</span>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { l: 'Generated', v: selectedSignal.generated_at ? new Date(selectedSignal.generated_at).toLocaleTimeString() : '—' },
                          { l: 'AI Model',  v: 'claude-sonnet-4' },
                          { l: 'Raw Conf.', v: selectedSignal.raw_confidence != null ? `${selectedSignal.raw_confidence}%` : '—' },
                        ].map(({ l, v }) => (
                          <div key={l} className="flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>{l}</span>
                            <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.65)' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/chat', { state: { symbol: selectedSymbol, signal: selectedSignal } })}
                      className="mt-5 w-full py-2 transition-all"
                      style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)', color: 'rgba(129,140,248,0.80)' }}
                    >
                      Ask Assistant about {selectedSymbol}
                    </button>
                  </div>
                </div>

                {/* Technical indicator row */}
                {selectedSignal.indicators_snapshot && (
                  <div className="mt-8 pt-6 flex flex-wrap gap-2 items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.20)', textTransform: 'uppercase', letterSpacing: '0.14em', marginRight: '4px' }}>Core Data:</span>
                    {[
                      { l: 'RSI',     v: selectedSignal.indicators_snapshot.rsi?.value?.toFixed(1)                                  },
                      { l: 'EMA',     v: selectedSignal.indicators_snapshot.ema?.relationship                                       },
                      { l: '52w Hi',  v: (selectedSignal.indicators_snapshot.range_52w?.dist_from_high_pct)?.toFixed(1) + '%'       },
                      { l: 'BB Pos',  v: selectedSignal.indicators_snapshot.bollinger?.position?.toFixed(2)                         },
                    ].filter(t => t.v).map(t => (
                      <IndicatorPill key={t.l} text={`${t.l}: ${t.v}`} neutral />
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
