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
import { FileDown, Calculator, History, Info } from 'lucide-react'

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
    bg: 'bg-apex-profit/20',
    border: 'border-apex-profit/60',
    text: 'text-apex-profit',
    badge: 'bg-apex-profit text-black font-black uppercase tracking-widest',
    glow: 'shadow-[0_0_30px_rgba(0,255,136,0.3)]',
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
    bg: 'bg-apex-loss/10',
    border: 'border-apex-loss/40',
    text: 'text-apex-loss',
    badge: 'bg-apex-loss text-white',
    glow: 'shadow-[0_0_20px_rgba(255,0,85,0.15)]',
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

function SignalCard({ signal, isSelected, onSelect, onExpandReasoning }) {
  const [expanded, setExpanded] = useState(false)
  const style = VERDICT_STYLES[signal.verdict?.toLowerCase()] || VERDICT_STYLES.watch
  const Icon = style.icon

  const handleExpand = (e) => {
    e.stopPropagation()
    setExpanded(!expanded)
    if (!expanded) {
      onExpandReasoning(signal.symbol)
    }
  }

  // Handle new 100-point confidence or old 0-1 scale
  const confidence = signal.confidence_score !== undefined ? signal.confidence_score : (signal.confidence * 100)

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
        <div className="flex items-center gap-2">
            {signal.target_timeframe && (
                <span className="text-[9px] text-white/30 font-data border border-white/10 px-1.5 py-0.5 uppercase">{signal.target_timeframe}</span>
            )}
            <Icon size={18} className={style.text} />
        </div>
      </div>

      {/* Price + Change */}
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

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <div className="flex flex-col">
            <span className="text-white/40 text-[10px] font-data uppercase tracking-widest">Confidence</span>
            <span className="text-[8px] text-white/30 truncate max-w-[120px]">{signal.calibrated_label}</span>
          </div>
          <span className={`text-xs font-data font-bold ${style.text}`}>{confidence.toFixed(0)}%</span>
        </div>
        <div className="h-1 bg-white/10 w-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full ${style.badge.split(' ')[0]}`}
          />
        </div>
      </div>

      {/* Synthesis */}
      <div className="space-y-2 mb-3">
        <p className="text-white/80 text-[11px] font-body leading-relaxed line-clamp-2">
            {signal.reasoning}
        </p>
      </div>

      {/* Expandable "Why does ADE say this?" */}
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
              {/* Bull/Bear Case */}
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

              {/* Key Indicators List */}
              <div className="space-y-2">
                <span className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-data">Key Signals</span>
                <div className="flex flex-wrap gap-1.5">
                  {(signal.key_indicators || []).map((ind, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/50 text-[9px] font-data truncate max-w-[150px]">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>

              {/* Indicator Snapshots */}
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
  
  const stopPrice = parseFloat(stopLoss?.split(' ')[0]) || (price * 0.95);
  const riskAmount = accountSize * (riskPct / 100);
  const priceRisk = Math.abs(price - stopPrice);
  const shares = priceRisk > 0 ? Math.floor(riskAmount / priceRisk) : 0;
  const totalCost = shares * price;

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

  const handleRegenerate = async (symbol) => {
    try {
        setLoading(true)
        const newSignal = await api.regenerateSignal(symbol)
        setSignals(prev => prev.map(s => s.symbol === symbol ? newSignal : s))
        toast.success(`Signal for ${symbol} refreshed with Claude 3.5 Sonnet`)
    } catch (e) {
        toast.error(`Regeneration failed: ${e.message}`)
    } finally {
        setLoading(false)
    }
  }

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
                {/* Detailed Header */}
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
                                        {confidence.toFixed(0)}%
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
                        onClick={() => handleRegenerate(selectedSymbol)}
                        className="px-4 py-2 bg-white/5 hover:bg-apex-accent hover:text-black border border-white/10 hover:border-apex-accent font-data text-[10px] font-bold uppercase tracking-widest transition-all h-fit flex items-center gap-2"
                    >
                        <Zap size={14} />
                        Refetch Signal
                    </button>
                </div>

                {/* Synthesis Section */}
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

                {/* Calculator & Contextual Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/5">
                    <div className="lg:col-span-2">
                        <PositionCalculator price={selectedSignal.price} stopLoss={selectedSignal.stop_loss || `${(selectedSignal.price * 0.95).toFixed(2)} (Managed Risk)`} />
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
                                    <span className="text-[10px] text-white font-data">{new Date(selectedSignal.generated_at).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-[10px] text-white/30 font-data">AI Model</span>
                                    <span className="text-[10px] text-white font-data">{model_name}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-[10px] text-white/30 font-data">Raw Conf.</span>
                                    <span className="text-[10px] text-white font-data">{selectedSignal.raw_confidence}%</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/chat', { state: { symbol: selectedSymbol, signal: selectedSignal }})}
                            className="mt-6 w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-data uppercase tracking-widest transition-all"
                        >
                            Ask Assistant about {selectedSymbol}
                        </button>
                    </div>
                </div>

                {/* Technical Baseline Snapshots */}
                {selectedSignal.indicators_snapshot && (
                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap gap-4 items-center">
                        <span className="text-[9px] text-white/20 uppercase tracking-widest mr-2">Core Tech Data:</span>
                        {[
                            { l: 'RSI', v: selectedSignal.indicators_snapshot.rsi?.value?.toFixed(1) },
                            { l: 'EMA 9/21', v: selectedSignal.indicators_snapshot.ema?.relationship },
                            { l: '52w High', v: (selectedSignal.indicators_snapshot.range_52w?.dist_from_high_pct)?.toFixed(1) + '%' },
                            { l: 'BB Pos', v: selectedSignal.indicators_snapshot.bollinger?.position }
                        ].map(tag => (
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
