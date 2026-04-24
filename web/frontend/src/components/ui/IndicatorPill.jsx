export default function IndicatorPill({ text, positive, neutral = false, className = '' }) {
  let textColor, bgColor, borderColor

  if (neutral) {
    textColor   = 'rgba(255,255,255,0.42)'
    bgColor     = 'rgba(255,255,255,0.03)'
    borderColor = 'rgba(255,255,255,0.08)'
  } else if (positive) {
    textColor   = 'rgba(0,255,136,0.72)'
    bgColor     = 'rgba(0,255,136,0.05)'
    borderColor = 'rgba(0,255,136,0.22)'
  } else {
    textColor   = 'rgba(255,0,85,0.72)'
    bgColor     = 'rgba(255,0,85,0.05)'
    borderColor = 'rgba(255,0,85,0.22)'
  }

  return (
    <span
      className={`inline-block overflow-hidden text-ellipsis whitespace-nowrap ${className}`}
      style={{
        fontFamily:   'var(--font-data, "Share Tech Mono", monospace)',
        fontSize:     '9px',
        letterSpacing: '0.02em',
        color:        textColor,
        background:   bgColor,
        border:       `1px solid ${borderColor}`,
        padding:      '2px 7px',
        borderRadius: 0,
        lineHeight:   1.5,
        maxWidth:     '200px',
      }}
    >
      {text}
    </span>
  )
}
