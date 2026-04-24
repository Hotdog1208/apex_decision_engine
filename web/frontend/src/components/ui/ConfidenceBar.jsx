import { motion } from 'framer-motion'

function barColor(v) {
  if (v >= 75) return 'var(--color-profit)'
  if (v >= 55) return 'var(--accent-primary)'
  if (v >= 40) return 'var(--color-warning)'
  return 'var(--color-loss)'
}

function barGlow(v) {
  if (v >= 75) return 'rgba(0,232,121,0.45)'
  if (v >= 55) return 'rgba(204,255,0,0.45)'
  if (v >= 40) return 'rgba(255,184,0,0.45)'
  return 'rgba(255,32,82,0.45)'
}

export default function ConfidenceBar({ value = 0, label, sublabel, showValue = true, height = 3, className = '' }) {
  const pct   = Math.min(100, Math.max(0, value))
  const color = barColor(pct)
  const glow  = barGlow(pct)

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-end mb-1.5">
          <div>
            {label && (
              <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
                {label}
              </span>
            )}
            {sublabel && (
              <span className="block truncate" style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.18)', maxWidth: '160px' }}>
                {sublabel}
              </span>
            )}
          </div>
          {showValue && (
            <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '12px', fontWeight: 700, color }}>
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full overflow-hidden" style={{ height: `${height}px`, background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={{
            height: '100%',
            background: color,
            boxShadow: `0 0 8px ${glow}`,
          }}
        />
      </div>
    </div>
  )
}
