import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BarChart3, Brain, Award, Zap } from 'lucide-react'

const STORAGE_KEY = 'ade_onboarded_v2'
const easing = [0.16, 1, 0.3, 1]

const BULLETS = [
  {
    icon:  BarChart3,
    title: 'Quantitative Scoring',
    text:  'ADE runs a 5-factor model — Trend, Momentum, Volume, Price Structure, Regime — to score each symbol 0-100.',
  },
  {
    icon:  Brain,
    title: 'AI Synthesis Layer',
    text:  'Claude synthesises the quantitative output into a directional verdict, bull/bear case, and confidence score.',
  },
  {
    icon:  Award,
    title: 'Tracked Track Record',
    text:  'Every signal is logged and evaluated 3 days later. View live accuracy stats on the Track Record page.',
  },
  {
    icon:  Zap,
    title: 'Not Financial Advice',
    text:  'ADE is a research tool. Signals are for educational purposes only. Always do your own due diligence.',
  },
]

export default function OnboardingModal({ forceOpen = false, onClose }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (forceOpen) { setOpen(true); return }
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch (_) {}
  }, [forceOpen])

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch (_) {}
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
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
        >
          <motion.div
            key="onboarding-panel"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ duration: 0.32, ease: easing }}
            className="relative w-full max-w-md"
            style={{
              background:  'rgba(6,6,6,0.98)',
              border:      '1px solid rgba(204,255,0,0.28)',
              boxShadow:   '0 0 60px rgba(204,255,0,0.12), 0 32px 80px rgba(0,0,0,0.7)',
              padding:     '32px',
            }}
          >
            {/* Corner ticks */}
            <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-apex-accent/60" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-apex-accent/60" />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-apex-accent/60" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-apex-accent/60" />

            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-4 right-4 transition-colors"
              style={{ color: 'rgba(255,255,255,0.28)' }}
            >
              <X size={15} />
            </button>

            {/* Header */}
            <div className="mb-7">
              <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#CCFF00', fontWeight: 700, marginBottom: '8px' }}>
                ADE // Signal Intelligence
              </p>
              <h2 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '24px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                Welcome to ADE
              </h2>
            </div>

            {/* Bullets */}
            <div className="space-y-2.5 mb-8">
              {BULLETS.map(({ icon: Icon, title, text }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.28, ease: easing, delay: 0.12 + i * 0.07 }}
                  className="flex items-start gap-3 p-3"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="p-1.5 shrink-0 mt-0.5" style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.18)' }}>
                    <Icon size={12} className="text-apex-accent" />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '3px' }}>
                      {title}
                    </p>
                    <p style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                      {text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={dismiss}
              className="w-full py-3 font-black transition-all hover:bg-white"
              style={{
                fontFamily: 'var(--font-display, sans-serif)',
                fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase',
                background: '#CCFF00', color: '#000',
              }}
            >
              Show me the signals →
            </button>

            <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginTop: '12px', lineHeight: 1.5 }}>
              Not financial advice · For research purposes only
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
