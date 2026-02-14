import { useState } from 'react'
import { motion } from 'framer-motion'

export default function MagneticButton({ children, onClick, variant = 'primary', disabled, className = '' }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    if (disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) / 5
    const y = (e.clientY - rect.top - rect.height / 2) / 5
    setPos({ x, y })
  }

  const base = variant === 'primary'
    ? 'bg-apex-accent text-black hover:bg-apex-accent-hover'
    : 'border border-white/20 text-white hover:bg-white/5'

  return (
    <motion.button
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-lg font-display font-semibold tracking-tight uppercase text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${base} ${className}`}
    >
      {children}
    </motion.button>
  )
}
