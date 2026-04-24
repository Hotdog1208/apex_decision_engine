import { motion } from 'framer-motion'

const CFG = {
  STRONG_BUY:   { label: 'Strong Buy',   color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.40)',  glow: '0 0 12px rgba(52,211,153,0.28)' },
  BUY:          { label: 'Buy',           color: '#00FF88', bg: 'rgba(0,255,136,0.09)',   border: 'rgba(0,255,136,0.32)',   glow: '0 0 10px rgba(0,255,136,0.20)' },
  WATCH:        { label: 'Watch',         color: '#FFEA00', bg: 'rgba(255,234,0,0.08)',   border: 'rgba(255,234,0,0.28)',   glow: '' },
  AVOID:        { label: 'Avoid',         color: '#F97316', bg: 'rgba(249,115,22,0.09)',  border: 'rgba(249,115,22,0.30)',  glow: '' },
  STRONG_AVOID: { label: 'Strong Avoid', color: '#FF0055', bg: 'rgba(255,0,85,0.12)',    border: 'rgba(255,0,85,0.42)',    glow: '0 0 12px rgba(255,0,85,0.28)' },
}

const SZ = {
  sm: { fontSize: '9px',  padding: '2px 7px'  },
  md: { fontSize: '10px', padding: '3px 10px' },
  lg: { fontSize: '12px', padding: '4px 14px' },
}

export default function VerdictBadge({ verdict, size = 'md', animate = false }) {
  const key = (verdict || '').toUpperCase()
  const cfg = CFG[key] || CFG.WATCH
  const El  = animate ? motion.span : 'span'
  const mProps = animate
    ? { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, transition: { type: 'spring', stiffness: 300, damping: 22 } }
    : {}

  return (
    <El
      {...mProps}
      style={{
        fontFamily:    'var(--font-data, "Share Tech Mono", monospace)',
        fontSize:      SZ[size]?.fontSize || SZ.md.fontSize,
        fontWeight:    700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color:         cfg.color,
        background:    cfg.bg,
        border:        `1px solid ${cfg.border}`,
        boxShadow:     cfg.glow || 'none',
        padding:       SZ[size]?.padding || SZ.md.padding,
        display:       'inline-flex',
        alignItems:    'center',
        borderRadius:  0,
        whiteSpace:    'nowrap',
        lineHeight:    1.25,
      }}
    >
      {cfg.label}
    </El>
  )
}
