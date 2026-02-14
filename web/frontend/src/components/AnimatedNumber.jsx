import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

export default function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 2, format = 'number', className = '' }) {
  const v = useMotionValue(0)
  const display = useTransform(v, (n) => {
    const fmt = n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    if (format === 'currency') return prefix + fmt + suffix
    if (format === 'percent') return prefix + (n >= 0 ? '+' : '') + fmt + '%' + suffix
    return prefix + fmt + suffix
  })

  useEffect(() => {
    const ctrl = animate(v, value, { duration: 0.8, ease: [0.16, 1, 0.3, 1] })
    return () => ctrl.stop()
  }, [v, value])

  return <motion.span className={`font-data ${className}`}>{display}</motion.span>
}
