import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Eye, Shield, Zap, X, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import VerdictBadge from './VerdictBadge'
import ConfidenceBar from './ConfidenceBar'
import IndicatorPill from './IndicatorPill'

const VERDICT_COLOR = {
  STRONG_BUY:   '#34D399',
  BUY:          '#00FF88',
  WATCH:        '#FFEA00',
  AVOID:        '#F97316',
  STRONG_AVOID: '#FF0055',
}

const VERDICT_BORDER_ALPHA = {
  STRONG_BUY:   'rgba(52,211,153,0.38)',
  BUY:          'rgba(0,255,136,0.28)',
  WATCH:        'rgba(255,234,0,0.24)',
  AVOID:        'rgba(249,115,22,0.24)',
  STRONG_AVOID: 'rgba(255,0,85,0.38)',
}

const VERDICT_GLOW = {
  STRONG_BUY:   '0 0 28px rgba(52,211,153,0.14)',
  BUY:          '0 0 20px rgba(0,255,136,0.10)',
  WATCH:        'none',
  AVOID:        'none',
  STRONG_AVOID: '0 0 28px rgba(255,0,85,0.14)',
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

function minutesAgo(isoStr) {
  if (!isoStr) return null
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000)
  if (diff < 1) return 'just now'
  return `${diff}m ago`
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
  const verdict      = (signal.verdict || 'WATCH').toUpperCase()
  const Icon         = VERDICT_ICON[verdict] || Eye
  const iconColor    = VERDICT_COLOR[verdict] || '#CCFF00'
  const borderColor  = isSelected ? (VERDICT_BORDER_ALPHA[verdict] || 'rgba(255,255,255,0.18)') : 'rgba(255,255,255,0.07)'
  const glowStyle    = isSelected ? (VERDICT_GLOW[verdict] || 'none') : 'none'
  const confidencePct = getConfidencePct(signal)
  const updated      = minutesAgo(signal.generated_at)

  const handleExpand = (e) => {
    e.stopPropagation()
    setExpanded(!expanded)
    if (!expanded) onExpandReasoning?.(signal.symbol)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: index * 0.055 }}
      onClick={() => onSelect?.(signal.symbol)}
      className="relative cursor-pointer"
      style={{
        background:   isSelected ? 'rgba(255,255,255,0.025)' : 'transparent',
        border:       `1px solid ${borderColor}`,
        boxShadow:    glowStyle,
        padding:      '15px',
        transition:   'border-color 0.2s, box-shadow 0.25s',
      }}
    >
      {/* Corner ticks */}
      <span className="absolute top-0 left-0 w-2 h-2 border-t border-l pointer-events-none" style={{ borderColor }} />
      <span className="absolute top-0 right-0 w-2 h-2 border-t border-r pointer-events-none" style={{ borderColor }} />

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '16px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
            {signal.symbol}
          </span>
          <VerdictBadge verdict={verdict} size="sm" />
          <span style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '8px', letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.08)',
            padding: '1px 5px', textTransform: 'uppercase',
          }}>
            1-3d
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <Icon size={13} style={{ color: iconColor }} />
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(signal.symbol) }}
              className="transition-colors"
              style={{ color: 'rgba(255,255,255,0.20)' }}
              aria-label={`Remove ${signal.symbol}`}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Price + alignment ── */}
      {signal.price > 0 && (
        <div className="flex items-center gap-3 mb-2.5">
          <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>
            ${signal.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em',
            color: signal.regime_conflict ? '#FFEA00' : '#00FF88',
          }}>
            {signal.regime_conflict ? '⚡ Conflict' : '✓ Aligned'}
          </span>
        </div>
      )}

      {/* ── Confidence bar ── */}
      <ConfidenceBar
        value={confidencePct}
        label="Confidence"
        sublabel={signal.calibrated_label}
        height={2}
        className="mb-2.5"
      />

      {/* ── Reasoning preview ── */}
      <p className="line-clamp-2 mb-2.5" style={{
        fontFamily: 'var(--font-body, Inter, sans-serif)',
        fontSize: '11px', lineHeight: 1.55, color: 'rgba(255,255,255,0.62)',
      }}>
        {signal.reasoning}
      </p>

      {/* ── Indicator pills ── */}
      {(signal.key_indicators || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {signal.key_indicators.slice(0, 3).map((ind, i) => (
            <IndicatorPill key={i} text={ind} neutral />
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.05em' }}>
          {updated ? `Updated ${updated}` : ''}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRefresh?.(signal.symbol) }}
          disabled={inCooldown || isRefreshing}
          className="flex items-center gap-1 transition-colors"
          style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: inCooldown || isRefreshing ? 'rgba(255,255,255,0.18)' : 'rgba(204,255,0,0.42)',
            cursor: inCooldown || isRefreshing ? 'not-allowed' : 'pointer',
          }}
          title="Force refresh (bypasses cache)"
        >
          <RefreshCw size={9} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing' : inCooldown ? 'Wait 60s' : 'Refresh'}
        </button>
      </div>

      {/* ── Expand toggle ── */}
      <button
        onClick={handleExpand}
        className="flex items-center gap-2 w-full justify-between py-2 mt-2 transition-colors"
        style={{
          fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
          letterSpacing: '0.10em', textTransform: 'uppercase',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          color: expanded ? iconColor : 'rgba(255,255,255,0.28)',
        }}
      >
        <span className="flex items-center gap-1.5">
          <Shield size={10} />
          Details & Indicators
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* ── Expanded content ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {/* Bull / Bear case */}
              <div className="grid grid-cols-2 gap-2">
                <div style={{ padding: '8px 10px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.12)' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: '#00FF88', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>Bull Case</span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'rgba(255,255,255,0.52)', lineHeight: 1.45 }}>{signal.bull_case}</p>
                </div>
                <div style={{ padding: '8px 10px', background: 'rgba(255,0,85,0.04)', border: '1px solid rgba(255,0,85,0.12)' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: '#FF0055', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>Bear Case</span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'rgba(255,255,255,0.52)', lineHeight: 1.45 }}>{signal.bear_case}</p>
                </div>
              </div>

              {/* All key indicators */}
              <div className="flex flex-wrap gap-1">
                {(signal.key_indicators || []).map((ind, i) => (
                  <IndicatorPill key={i} text={ind} neutral />
                ))}
              </div>

              {/* Technical snapshot */}
              {signal.indicators_snapshot && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { l: 'RSI',      v: signal.indicators_snapshot.rsi?.value?.toFixed(1) },
                    { l: 'MACD',     v: signal.indicators_snapshot.macd?.histogram?.toFixed(3) },
                    { l: 'Vol Ratio',v: signal.indicators_snapshot.volume_ratio != null ? `${signal.indicators_snapshot.volume_ratio.toFixed(2)}×` : null },
                    { l: '52w High', v: signal.indicators_snapshot.range_52w?.dist_from_high_pct != null ? `${signal.indicators_snapshot.range_52w.dist_from_high_pct.toFixed(1)}%` : null },
                  ].filter(t => t.v != null).map(t => (
                    <div key={t.l} className="flex justify-between items-center">
                      <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>{t.l}</span>
                      <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.65)' }}>{t.v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Track record link */}
              <Link
                to="/track-record"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 transition-colors"
                style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,255,136,0.42)' }}
              >
                <ExternalLink size={9} />
                View track record →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
