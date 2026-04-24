import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Eye, Shield, Zap, X,
  RefreshCw, ChevronDown, ChevronUp, ExternalLink, Activity,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import VerdictBadge from './VerdictBadge'
import ConfidenceBar from './ConfidenceBar'
import IndicatorPill from './IndicatorPill'

const VERDICT_COLOR = {
  STRONG_BUY:   '#00E879',
  BUY:          '#52F7A2',
  WATCH:        '#FFB800',
  AVOID:        '#FF7043',
  STRONG_AVOID: '#FF2052',
}

const VERDICT_BG_SELECTED = {
  STRONG_BUY:   'rgba(0,232,121,0.04)',
  BUY:          'rgba(82,247,162,0.02)',
  WATCH:        'rgba(255,184,0,0.02)',
  AVOID:        'rgba(255,112,67,0.02)',
  STRONG_AVOID: 'rgba(255,32,82,0.04)',
}

const VERDICT_GLOW = {
  STRONG_BUY:   '0 0 22px rgba(0,232,121,0.08), -3px 0 14px rgba(0,232,121,0.12)',
  STRONG_AVOID: '0 0 22px rgba(255,32,82,0.08), -3px 0 14px rgba(255,32,82,0.12)',
}

const VERDICT_ICON = {
  STRONG_BUY:   Zap,
  BUY:          TrendingUp,
  WATCH:        Eye,
  AVOID:        TrendingDown,
  STRONG_AVOID: Shield,
}

function getConfidencePct(signal) {
  const c = signal.confidence
  if (c == null) return 0
  return c > 1 ? c : c * 100
}

function timeAgo(isoStr) {
  if (!isoStr) return null
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000)
  if (diff < 1)  return 'just now'
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

export default function SignalCard({
  signal,
  isSelected,
  onSelect,
  onExpandReasoning,
  onRemove,
  onRefresh,
  isRefreshing,
  inCooldown,
  index = 0,
}) {
  const [expanded, setExpanded] = useState(false)

  const verdict       = (signal.verdict || 'WATCH').toUpperCase()
  const Icon          = VERDICT_ICON[verdict] || Eye
  const stripeColor   = VERDICT_COLOR[verdict] || '#FFB800'
  const isStrong      = verdict === 'STRONG_BUY' || verdict === 'STRONG_AVOID'
  const confidencePct = getConfidencePct(signal)
  const updated       = timeAgo(signal.generated_at)

  const handleExpand = (e) => {
    e.stopPropagation()
    setExpanded(!expanded)
    if (!expanded) onExpandReasoning?.(signal.symbol)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10, scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
      onClick={() => onSelect?.(signal.symbol)}
      className="relative cursor-pointer group"
      style={{
        background:   isSelected
          ? (VERDICT_BG_SELECTED[verdict] || 'rgba(255,255,255,0.02)')
          : 'rgba(7, 9, 15, 0.80)',
        borderTop:    '1px solid rgba(255,255,255,0.05)',
        borderRight:  '1px solid rgba(255,255,255,0.05)',
        borderBottom: `1px solid ${isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
        borderLeft:   `3px solid ${isSelected ? stripeColor : 'rgba(255,255,255,0.07)'}`,
        boxShadow:    isSelected && isStrong ? (VERDICT_GLOW[verdict] || 'none') : 'none',
        padding:      '13px 14px 12px 13px',
        transition:   'border-color 0.18s, box-shadow 0.22s, background 0.18s',
      }}
    >
      {/* Row 1: Symbol · verdict badge · conflict flag · icon + remove */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span style={{
            fontFamily: 'var(--font-display, sans-serif)', fontSize: '15px',
            fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em',
          }}>
            {signal.symbol}
          </span>
          <VerdictBadge verdict={verdict} size="sm" />
          {signal.regime_conflict && (
            <span style={{
              fontFamily: 'var(--font-data, monospace)', fontSize: '7px',
              color: '#FFB800', border: '1px solid rgba(255,184,0,0.28)',
              padding: '1px 4px', textTransform: 'uppercase', letterSpacing: '0.10em',
            }}>
              ⚡ Conflict
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <Icon size={12} style={{ color: stripeColor, opacity: isSelected ? 1 : 0.4 }} />
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(signal.symbol) }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', padding: 0 }}
              aria-label={`Remove ${signal.symbol}`}
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Price + confidence score */}
      <div className="flex items-baseline justify-between mb-2">
        {signal.price > 0 ? (
          <span style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '11px',
            fontWeight: 600, color: 'rgba(255,255,255,0.65)',
          }}>
            ${signal.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : <span />}
        <div className="flex items-baseline gap-0.5">
          <span style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '15px', fontWeight: 800,
            color: stripeColor,
            textShadow: isSelected ? `0 0 12px ${stripeColor}55` : 'none',
            lineHeight: 1,
          }}>
            {confidencePct.toFixed(0)}
          </span>
          <span style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
            color: stripeColor, opacity: 0.65, fontWeight: 600,
          }}>%</span>
        </div>
      </div>

      {/* Confidence bar */}
      <ConfidenceBar value={confidencePct} height={2} showValue={false} className="mb-2.5" />

      {/* Reasoning preview */}
      <p className="line-clamp-2 mb-2.5" style={{
        fontFamily: 'var(--font-body, Inter, sans-serif)',
        fontSize: '10.5px', lineHeight: 1.55, color: 'rgba(255,255,255,0.50)',
      }}>
        {signal.reasoning}
      </p>

      {/* Top 3 indicator pills */}
      {(signal.key_indicators || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {signal.key_indicators.slice(0, 3).map((ind, i) => (
            <IndicatorPill key={i} text={ind} neutral />
          ))}
        </div>
      )}

      {/* Footer: timestamp + refresh */}
      <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{
          fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
          color: 'rgba(255,255,255,0.20)', letterSpacing: '0.04em',
        }}>
          {updated ? `↻ ${updated}` : ''}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRefresh?.(signal.symbol) }}
          disabled={inCooldown || isRefreshing}
          style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: inCooldown || isRefreshing ? 'rgba(255,255,255,0.14)' : 'rgba(204,255,0,0.40)',
            cursor: inCooldown || isRefreshing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '3px',
            background: 'none', border: 'none', padding: 0,
          }}
        >
          <RefreshCw size={8} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing' : inCooldown ? '60s' : 'Refresh'}
        </button>
      </div>

      {/* Expand toggle */}
      <button
        onClick={handleExpand}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', marginTop: '8px', paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
          letterSpacing: '0.10em', textTransform: 'uppercase',
          color: expanded ? stripeColor : 'rgba(255,255,255,0.22)',
          background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)',
          padding: '8px 0 0 0', cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Activity size={9} />
          Full Analysis
        </span>
        {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {/* Expanded: bull/bear + indicators + technicals */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">

              {/* Bull / Bear case */}
              <div className="grid grid-cols-2 gap-2">
                <div style={{ padding: '8px 10px', background: 'rgba(0,232,121,0.04)', border: '1px solid rgba(0,232,121,0.12)', borderLeft: '2px solid rgba(0,232,121,0.35)' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-data, monospace)', fontSize: '7px', color: 'var(--color-profit)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '4px' }}>
                    Bull Case
                  </span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                    {signal.bull_case}
                  </p>
                </div>
                <div style={{ padding: '8px 10px', background: 'rgba(255,32,82,0.04)', border: '1px solid rgba(255,32,82,0.12)', borderLeft: '2px solid rgba(255,32,82,0.35)' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-data, monospace)', fontSize: '7px', color: 'var(--color-loss)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '4px' }}>
                    Bear Case
                  </span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                    {signal.bear_case}
                  </p>
                </div>
              </div>

              {/* All indicators */}
              <div className="flex flex-wrap gap-1">
                {(signal.key_indicators || []).map((ind, i) => (
                  <IndicatorPill key={i} text={ind} neutral />
                ))}
              </div>

              {/* Technical snapshot */}
              {signal.indicators_snapshot && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { l: 'RSI',      v: signal.indicators_snapshot.rsi?.value?.toFixed(1) },
                    { l: 'MACD',     v: signal.indicators_snapshot.macd?.histogram?.toFixed(3) },
                    { l: 'Vol Ratio',v: signal.indicators_snapshot.volume_ratio != null ? `${signal.indicators_snapshot.volume_ratio.toFixed(2)}×` : null },
                    { l: '52w High', v: signal.indicators_snapshot.range_52w?.dist_from_high_pct != null ? `${signal.indicators_snapshot.range_52w.dist_from_high_pct.toFixed(1)}%` : null },
                  ].filter(t => t.v != null).map(t => (
                    <div key={t.l} className="flex justify-between items-center">
                      <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                        {t.l}
                      </span>
                      <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.68)', fontWeight: 600 }}>
                        {t.v}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Link
                to="/track-record"
                onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,232,121,0.42)', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ExternalLink size={8} />
                Track record →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
