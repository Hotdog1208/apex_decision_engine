import { CheckCircle, XCircle, Clock } from 'lucide-react'

export default function OutcomeIndicator({ correct, pctChange, size = 13 }) {
  const monoStyle = {
    fontFamily: 'var(--font-data, monospace)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.04em',
  }

  if (correct === null || correct === undefined) {
    return <Clock size={size} style={{ color: 'rgba(255,255,255,0.20)' }} />
  }

  if (correct) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CheckCircle size={size} style={{ color: '#00FF88', flexShrink: 0 }} />
        {pctChange != null && (
          <span style={{ ...monoStyle, color: '#00FF88' }}>
            +{typeof pctChange === 'number' ? pctChange.toFixed(2) : pctChange}%
          </span>
        )}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <XCircle size={size} style={{ color: '#FF0055', flexShrink: 0 }} />
      {pctChange != null && (
        <span style={{ ...monoStyle, color: '#FF0055' }}>
          {typeof pctChange === 'number' ? pctChange.toFixed(2) : pctChange}%
        </span>
      )}
    </span>
  )
}
