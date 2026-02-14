import { motion } from 'framer-motion'

export default function SkeletonLoader({ className = '', width, height = 20 }) {
  return (
    <motion.div
      className={`skeleton ${className}`}
      style={{ width: width || '100%', height }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}
