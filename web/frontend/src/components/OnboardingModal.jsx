import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BarChart3, Brain, Award } from 'lucide-react'

const STORAGE_KEY = 'ade_onboarded'
const easing = [0.16, 1, 0.3, 1]

const BULLETS = [
  {
    icon: BarChart3,
    text: 'ADE analyzes 8 technical indicators and options flow to generate a directional signal for each stock.',
  },
  {
    icon: Brain,
    text: 'Each signal includes a confidence score and the exact reasoning behind the verdict.',
  },
  {
    icon: Award,
    text: 'ADE logs every signal and tracks its accuracy — you can see the full track record at any time.',
  },
]

export default function OnboardingModal({ forceOpen = false, onClose }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (forceOpen) {
      setOpen(true)
      return
    }
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [forceOpen])

  const handleDismiss = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    setOpen(false)
    onClose?.()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleDismiss() }}
        >
          <motion.div
            key="onboarding-panel"
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: easing }}
            className="cyber-panel border border-apex-accent/40 bg-black/95 p-8 max-w-md w-full relative shadow-[0_0_60px_rgba(204,255,0,0.15)]"
          >
            <button
              onClick={handleDismiss}
              aria-label="Close"
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <div className="mb-6">
              <p className="text-apex-accent text-[10px] uppercase tracking-[0.3em] font-data mb-2">
                ADE // Signal Intelligence
              </p>
              <h2 className="text-2xl font-display font-black text-white">Welcome to ADE</h2>
            </div>

            <div className="space-y-3 mb-8">
              {BULLETS.map(({ icon: Icon, text }, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/5"
                >
                  <div className="p-1.5 bg-apex-accent/10 border border-apex-accent/20 shrink-0 mt-0.5">
                    <Icon size={13} className="text-apex-accent" />
                  </div>
                  <p className="text-white/70 text-sm font-body leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleDismiss}
              className="w-full py-3 bg-apex-accent hover:bg-white text-black font-display font-black text-sm uppercase tracking-widest transition-all"
            >
              Show me the signals →
            </button>

            <p className="text-white/25 text-[10px] font-data text-center mt-3 leading-relaxed">
              Not financial advice. For research purposes only.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
