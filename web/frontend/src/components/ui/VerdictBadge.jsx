import { motion } from 'framer-motion'

const CFG = {
  STRONG_BUY:   { label: 'Strong Buy',   color: '#00E879', bg: 'rgba(0,232,121,0.10)',   border: 'rgba(0,232,121,0.32)',  glow: '0 0 10px rgba(0,232,121,0.22)' },
  BUY:          { label: 'Buy',           color: '#52F7A2', bg: 'rgba(82,247,162,0.08)',  border: 'rgba(82,247,162,0.25)', glow: '' },
  WATCH:        { label: 'Watch',         color: '#FFB800', bg: 'rgba(255,184,0,0.08)',   border: 'rgba(255,184,0,0.25)',  glow: '' },
  AVOID:        { label: 'Avoid',         color: '#FF7043', bg: 'rgba(255,112,67,0.08)',  border: 'rgba(255,112,67,0.25)', glow: '' },
  STRONG_AVOID: { label: 'Strong Avoid', color: '#FF2052', bg: 'rgba(255,32,82,0.10)',   border: 'rgba(255,32,82,0.35)',  glow: '0 0 10px rgba(255,32,82,0.22)' },
}

const SZ = {
  sm: { fontSize: '8px',  padding: '2px 6px',  letterSpacing: '0.10em' },
  md: { fontSize: '9px',  padding: '3px 9px',  letterSpacing: '0.12em' },
  lg: { fontSize: '11px', padding: '4px 13px', letterSpacing: '0.12em' },
}

export default function VerdictBadge({ verdict, size = 'md', animate = false }) {
  const key = (verdict || '').toUpperCase()
  const cfg = CFG[key] || CFG.WATCH
  const sz  = SZ[size] || SZ.md
  const El  = animate ? motion.span : 'span'
  const mProps = animate
    ? { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 }, transition: { type: 'spring', stiffness: 320, damping: 22 } }
    : {}

  return (
    <El
      {...mProps}
      style={{
        fontFamily:    'var(--font-data, "Share Tech Mono", monospace)',
        fontSize:      sz.fontSize,
        fontWeight:    800,
        letterSpacing: sz.letterSpacing,
        textTransform: 'uppercase',
        color:         cfg.color,
        background:    cfg.bg,
        border:        `1px solid ${cfg.border}`,
        boxShadow:     cfg.glow || 'none',
        padding:       sz.padding,
        display:       'inline-flex',
        alignItems:    'center',
        borderRadius:  0,
        whiteSpace:    'nowrap',
        lineHeight:    1.2,
      }}
    >
      {cfg.label}
    </El>
  )
}
