import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Zap, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import toast from 'react-hot-toast'

const PLANS = [
  {
    id: 'free',
    label: 'FREE',
    price: '$0',
    period: 'forever',
    tagline: 'Get a feel for the platform',
    color: 'rgba(255,255,255,0.38)',
    border: 'rgba(255,255,255,0.10)',
    bg: 'rgba(255,255,255,0.02)',
    features: [
      'Signal Hub grayed-out preview',
      'Charting & technical tools',
      'Stock screener & heatmap',
      'Watchlists & track record summary',
    ],
    locked: [
      'AI signal generation',
      'UOA options flow',
      'AI Chat',
      'APEX Agent',
    ],
  },
  {
    id: 'edge',
    label: 'EDGE',
    price: '$29',
    period: '/mo',
    tagline: 'Serious retail. Real signals.',
    color: 'rgba(255,255,255,0.75)',
    border: 'rgba(255,255,255,0.20)',
    bg: 'rgba(255,255,255,0.04)',
    features: [
      'Signal Hub — up to 20 symbols',
      'Full AI signal reasoning',
      'UOA options flow data',
      'Basic AI alerts (10 active)',
      'Everything in FREE',
    ],
    locked: ['AI Chat', 'APEX Agent'],
  },
  {
    id: 'alpha',
    label: 'ALPHA',
    price: '$59',
    period: '/mo',
    tagline: 'For traders who want an edge.',
    color: '#00D4FF',
    border: 'rgba(0,212,255,0.30)',
    bg: 'rgba(0,212,255,0.04)',
    featured: true,
    features: [
      'Signal Hub — unlimited symbols',
      'AI Chat — Claude Q&A (20/day)',
      'Full historical accuracy breakdown',
      'Full AI alerts (50 active)',
      '5-minute signal refresh',
      'Everything in EDGE',
    ],
    locked: ['APEX Agent'],
  },
  {
    id: 'apex',
    label: 'APEX',
    price: '$119',
    period: '/mo',
    tagline: 'The institutional-grade full stack.',
    color: '#CCFF00',
    border: 'rgba(204,255,0,0.32)',
    bg: 'rgba(204,255,0,0.04)',
    features: [
      'APEX Agent — Jarvis morning brief',
      'Intraday signal-flip alerts',
      'AI Chat — unlimited',
      'Unlimited signal refresh (priority)',
      'CSV data export',
      'Portfolio access',
      'Everything in ALPHA',
    ],
    locked: [],
  },
]

function PlanCard({ plan, currentTier, onUpgrade, loadingTier }) {
  const isPaid = plan.id !== 'free'
  const isCurrent = plan.id === currentTier
  const isUpgrade = isPaid && !isCurrent

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-col"
      style={{
        background: plan.bg,
        border: `1px solid ${plan.border}`,
        boxShadow: plan.featured ? `0 0 48px ${plan.bg}, 0 0 0 1px ${plan.border}` : 'none',
      }}
    >
      {plan.featured && (
        <div
          className="absolute -top-px left-0 right-0 h-0.5"
          style={{ background: plan.color }}
        />
      )}

      <div className="p-6 flex-1">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-bold tracking-[0.18em] uppercase"
              style={{ fontFamily: 'var(--font-data, monospace)', color: plan.color }}
            >
              {plan.label}
            </span>
            {plan.featured && (
              <span
                className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5"
                style={{ color: '#000', background: plan.color }}
              >
                Most popular
              </span>
            )}
            {isCurrent && (
              <span
                className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5"
                style={{ color: plan.color, border: `1px solid ${plan.border}` }}
              >
                Current
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-display font-black text-white">{plan.price}</span>
            <span className="text-white/35 text-sm">{plan.period}</span>
          </div>

          <p className="text-white/40 text-xs mt-1.5" style={{ fontFamily: 'var(--font-data, monospace)' }}>
            {plan.tagline}
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-6">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-white/65">
              <Check size={13} style={{ color: plan.color, flexShrink: 0, marginTop: '2px' }} />
              {f}
            </li>
          ))}
          {plan.locked.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-white/20 line-through">
              <span className="w-[13px] flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        {!isPaid ? (
          <button
            disabled
            className="w-full py-2.5 text-sm text-center opacity-40 cursor-default"
            style={{
              fontFamily: 'var(--font-data, monospace)',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.40)',
            }}
          >
            Free forever
          </button>
        ) : isCurrent ? (
          <button
            disabled
            className="w-full py-2.5 text-sm text-center opacity-50 cursor-default"
            style={{
              fontFamily: 'var(--font-data, monospace)',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              border: `1px solid ${plan.border}`,
              color: plan.color,
            }}
          >
            Active plan
          </button>
        ) : (
          <button
            onClick={() => onUpgrade(plan.id)}
            disabled={!!loadingTier}
            className="w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 hover:opacity-90 active:scale-[0.98]"
            style={{
              fontFamily: 'var(--font-data, monospace)',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              background: plan.color,
              color: '#000',
            }}
          >
            {loadingTier === plan.id ? (
              <><Loader2 size={13} className="animate-spin" /> Redirecting…</>
            ) : (
              <><ArrowRight size={13} /> Upgrade to {plan.label}</>
            )}
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function Pricing() {
  const { user, tier } = useAuth()
  const navigate = useNavigate()
  const [loadingTier, setLoadingTier] = useState(null)

  const handleUpgrade = async (planId) => {
    if (!user) {
      navigate('/signup', { state: { from: { pathname: '/pricing' } } })
      return
    }
    setLoadingTier(planId)
    try {
      const { url } = await api.createCheckoutSession(planId)
      window.location.href = url
    } catch (err) {
      toast.error(err.message || 'Could not start checkout. Please try again.')
      setLoadingTier(null)
    }
  }

  return (
    <div className="py-10 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-display font-black text-white mb-3"
        >
          Simple, transparent pricing
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-white/45 text-sm max-w-md mx-auto"
          style={{ fontFamily: 'var(--font-data, monospace)' }}
        >
          Start free. Upgrade when the signals start hitting.
          Cancel anytime from your account settings.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentTier={tier}
            onUpgrade={handleUpgrade}
            loadingTier={loadingTier}
          />
        ))}
      </div>

      <p className="text-center text-white/20 text-xs mt-8" style={{ fontFamily: 'var(--font-data, monospace)' }}>
        All prices in USD · Billed monthly · No refunds on current billing period ·{' '}
        <a href="/terms" className="hover:text-white/40 transition-colors">Terms</a>
      </p>
    </div>
  )
}
