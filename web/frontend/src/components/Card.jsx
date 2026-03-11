import { motion } from 'framer-motion'

const easing = [0.16, 1, 0.3, 1]

export default function Card({
  children,
  className = '',
  hover = false,
  animate = false,
  delay = 0,
  ...rest
}) {
  const base = `relative cyber-panel bg-black/70 overflow-hidden border border-white/10 ${hover ? 'hover:border-apex-cyan/50 hover:shadow-[0_10px_30px_rgba(0,240,255,0.1)] transition-all duration-300 transform hover:-translate-y-1' : ''} ${className}`

  const content = (
    <>
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
      <div className="absolute inset-0 scanlines opacity-10 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: easing }}
        className={base}
        {...rest}
      >
        {content}
      </motion.div>
    )
  }

  return (
    <div className={base} {...rest}>
      {content}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`relative flex flex-wrap items-start justify-between gap-4 p-6 pb-4 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent ${className}`}>
      {/* Decorative corner tick */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-[2px] border-l-[2px] border-apex-cyan/50" />

      <div>
        <h2 className="text-xl font-display font-black text-white uppercase tracking-tighter flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-apex-cyan animate-pulse" />
          {title}
        </h2>
        {subtitle && <p className="text-white/40 text-[10px] uppercase font-data tracking-[0.2em] mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-3 relative z-10">{action}</div>}
    </div>
  )
}

export function CardBody({ children, className = '', noPadding }) {
  return (
    <div className={`relative ${noPadding ? className : `p-6 ${className}`}`}>
      {children}
    </div>
  )
}
