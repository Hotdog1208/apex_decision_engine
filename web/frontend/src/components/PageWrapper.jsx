import { motion } from 'framer-motion'

const easing = [0.16, 1, 0.3, 1]

export default function PageWrapper({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: easing }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
