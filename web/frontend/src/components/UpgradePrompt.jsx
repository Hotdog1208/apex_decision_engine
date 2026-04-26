import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import toast from 'react-hot-toast'

const TIER_META = {
  edge:  { label: 'EDGE',  price: '$29/mo',  color: 'rgba(255,255,255,0.55)',  border: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.04)' },
  alpha: { label: 'ALPHA', price: '$59/mo',  color: '#00D4FF',                 border: 'rgba(0,212,255,0.28)',   glow: 'rgba(0,212,255,0.05)'   },
  apex:  { label: 'APEX',  price: '$119/mo', color: '#CCFF00',                 border: 'rgba(204,255,0,0.32)',   glow: 'rgba(204,255,0,0.05)'   },
}

const TIER_FEATURES = {
  edge:  ['Signal Hub — 20 symbols', 'UOA options flow', 'Full AI reasoning', 'Basic AI alerts'],
  alpha: ['Unlimited symbols', 'AI Chat (Claude Q&A)', 'Full historical accuracy', 'All AI alerts'],
  apex:  ['Priority refresh', 'APEX Agent — Jarvis', 'Morning brief daily', 'Intraday alert calls'],
}

/**
 * On-brand locked feature component.
 *
 * Props:
 *   requiredTier  — 'edge' | 'alpha' | 'apex'
 *   feature       — short display name, e.g. "AI Chat"
 *   compact       — render a slim inline badge instead of a full card
 *   children      — optional content to render inside the card below the CTA
 */
export default function UpgradePrompt({ requiredTier = 'edge', feature = 'this feature', compact = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const meta = TIER_META[requiredTier] || TIER_META.edge
  const features = TIER_FEATURES[requiredTier] || []

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/signup')
      return
    }
    setLoading(true)
    try {
      const { url } = await api.createCheckoutSession(requiredTier)
      window.location.href = url
    } catch (err) {
      toast.error(err.message || 'Could not start checkout. Please try again.')
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold cursor-pointer select-none transition-all hover:opacity-90"
        style={{
          fontFamily: 'var(--font-data, monospace)',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: meta.color,
          background: meta.glow,
          border: `1px solid ${meta.border}`,
        }}
        onClick={handleUpgrade}
        title={`Upgrade to ${meta.label} to unlock ${feature}`}
      >
        <Lock size={9} />
        {meta.label}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center text-center px-6 py-12"
      style={{ minHeight: '280px' }}
    >
      {/* Lock icon */}
      <div
        className="w-14 h-14 flex items-center justify-center mb-5"
        style={{
          background: meta.glow,
          border: `1px solid ${meta.border}`,
          boxShadow: `0 0 32px ${meta.glow}`,
        }}
      >
        <Lock size={22} style={{ color: meta.color }} />
      </div>

      {/* Headline */}
      <p
        className="text-white font-display font-bold text-lg mb-1 tracking-tight"
      >
        {feature} requires{' '}
        <span style={{ color: meta.color }}>{meta.label}</span>
      </p>

      <p className="text-white/40 text-sm mb-6 max-w-xs">
        {meta.price} · Cancel anytime
      </p>

      {/* Feature list */}
      <ul className="space-y-1.5 mb-7 text-left">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <Zap size={11} style={{ color: meta.color, flexShrink: 0 }} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all disabled:opacity-60 hover:opacity-90 active:scale-95"
        style={{
          fontFamily: 'var(--font-data, monospace)',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: requiredTier === 'edge' ? '#000' : requiredTier === 'apex' ? '#000' : '#000',
          background: meta.color,
        }}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ArrowRight size={14} />
        )}
        {loading ? 'Redirecting…' : `Upgrade to ${meta.label}`}
      </button>

      <p className="text-white/20 text-xs mt-4">
        Secure checkout via Stripe · No trial period needed
      </p>
    </motion.div>
  )
}
