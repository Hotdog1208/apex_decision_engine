import { motion } from 'framer-motion'

export default function RiskGauge({ riskLevel = 0 }) {
  const rotation = (riskLevel / 100) * 180 - 90
  const color = riskLevel < 50 ? 'var(--color-profit)' : riskLevel < 80 ? 'var(--color-warning)' : 'var(--color-loss)'

  return (
    <div className="relative w-40 h-24">
      <svg viewBox="0 0 200 100" className="w-full h-full">
        <path
          d="M 20,90 A 80,80 0 0,1 180,90"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="10"
          fill="none"
        />
        <motion.path
          d="M 20,90 A 80,80 0 0,1 180,90"
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="251.2"
          initial={{ strokeDashoffset: 251.2 }}
          animate={{ strokeDashoffset: 251.2 - (riskLevel / 100) * 251.2 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <motion.div
        className="absolute bottom-0 left-1/2 w-0.5 h-12 origin-bottom -translate-x-1/2"
        style={{ background: color }}
        initial={{ rotate: -90 }}
        animate={{ rotate: rotation }}
        transition={{ type: 'spring', stiffness: 80, damping: 15 }}
      />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center -mb-6">
        <motion.span
          key={riskLevel}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-2xl font-data font-bold block"
          style={{ color }}
        >
          {riskLevel}%
        </motion.span>
        <p className="text-[10px] text-white/50 uppercase tracking-wider">Risk</p>
      </div>
    </div>
  )
}
