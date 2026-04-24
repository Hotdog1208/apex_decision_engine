import { motion } from 'framer-motion'

function barColor(v) {
  if (v >= 75) return '#00FF88'
  if (v >= 55) return '#CCFF00'
  if (v >= 40) return '#FFEA00'
  return '#FF0055'
}

export default function ConfidenceBar({ value = 0, label, sublabel, showValue = true, height = 2, className = '' }) {
  const pct   = Math.min(100, Math.max(0, value))
  const color = barColor(pct)

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-end mb-1">
          <div>
            {label && (
              <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)' }}>
                {label}
              </span>
            )}
            {sublabel && (
              <span className="block truncate" style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.20)', maxWidth: '160px' }}>
                {sublabel}
              </span>
            )}
          </div>
          {showValue && (
            <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', fontWeight: 700, color }}>
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full overflow-hidden" style={{ height: `${height}px`, background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          style={{ height: '100%', background: color }}
        />
      </div>
    </div>
  )
}
