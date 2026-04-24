import { motion } from 'framer-motion'

function color(pct) {
  if (pct >= 60) return '#00FF88'
  if (pct >= 50) return '#CCFF00'
  if (pct >= 40) return '#FFEA00'
  return '#FF0055'
}

export default function AccuracyBar({ value = 0, label = 'Directional Accuracy', showThreshold = true, subtitle = '1-3 day' }) {
  const pct = Math.min(100, Math.max(0, value))
  const c   = color(pct)

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div>
          <span style={{
            fontFamily: 'var(--font-data, monospace)',
            fontSize: '9px', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
          }}>
            {label}
          </span>
          {subtitle && (
            <span style={{
              display: 'block',
              fontFamily: 'var(--font-data, monospace)',
              fontSize: '8px', color: 'rgba(255,255,255,0.18)',
            }}>
              {subtitle}
            </span>
          )}
        </div>
        <span style={{
          fontFamily: 'var(--font-display, sans-serif)',
          fontSize: '24px', fontWeight: 900, color: c,
        }}>
          {pct.toFixed(1)}%
        </span>
      </div>

      <div className="relative w-full overflow-hidden" style={{ height: '6px', background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: '100%', background: c }}
        />
        {showThreshold && (
          <div className="absolute inset-y-0" style={{ left: '50%', width: '1px', background: 'rgba(255,255,255,0.18)' }} />
        )}
      </div>

      {showThreshold && (
        <div className="flex justify-between" style={{
          fontFamily: 'var(--font-data, monospace)',
          fontSize: '8px', letterSpacing: '0.10em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)',
        }}>
          <span>0%</span>
          <span style={{ color: 'rgba(255,0,85,0.38)' }}>50% threshold</span>
          <span>100%</span>
        </div>
      )}
    </div>
  )
}
