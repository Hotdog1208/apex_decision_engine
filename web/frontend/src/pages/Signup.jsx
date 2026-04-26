import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus, Mail, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Card, { CardBody } from '../components/Card'

const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

export default function Signup() {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [riskAcked, setRiskAcked]     = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [confirmed, setConfirmed]     = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!riskAcked) {
      setError('You must acknowledge the risk disclosure to create an account.')
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${APP_URL}/auth/callback`,
        data: {
          risk_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Show "check your email" screen — do not auto-login until confirmed
    setConfirmed(true)
    setLoading(false)
  }

  if (confirmed) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md text-center"
        >
          <Card className="overflow-hidden">
            <CardBody>
              <div className="flex justify-center mb-5">
                <span className="w-14 h-14 rounded-xl bg-apex-accent/20 flex items-center justify-center text-apex-accent">
                  <Mail size={28} />
                </span>
              </div>
              <h2 className="text-xl font-display font-bold text-white mb-2">Check your email</h2>
              <p className="text-white/55 text-sm mb-4">
                We sent a confirmation link to{' '}
                <span className="text-white/80 font-medium">{email}</span>.{' '}
                Click it to activate your account — the link expires in 24 hours.
              </p>
              <p className="text-white/35 text-xs">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  type="button"
                  onClick={() => setConfirmed(false)}
                  className="text-apex-accent hover:underline"
                >
                  try again
                </button>.
              </p>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card hover className="overflow-hidden">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-apex-accent/20 flex items-center justify-center text-apex-accent">
                <UserPlus size={20} />
              </span>
              <div>
                <h1 className="text-xl font-display font-bold text-white tracking-tight">Create account</h1>
                <p className="text-white/50 text-sm">Join APEX — free to start, upgrade anytime</p>
              </div>
            </div>
          </div>

          <CardBody>
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-apex-loss/20 text-apex-loss text-sm border border-apex-loss/30">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-white/60 text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apex-accent/50 focus:border-apex-accent/50 transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm font-medium mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apex-accent/50 focus:border-apex-accent/50 transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm font-medium mb-1.5">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apex-accent/50 focus:border-apex-accent/50 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {/* Risk acknowledgment — legally required */}
              <div
                className="p-3.5 rounded-lg border cursor-pointer select-none transition-colors"
                style={{
                  borderColor: riskAcked ? 'rgba(204,255,0,0.35)' : 'rgba(255,255,255,0.12)',
                  background:  riskAcked ? 'rgba(204,255,0,0.05)' : 'rgba(255,255,255,0.02)',
                }}
                onClick={() => setRiskAcked(v => !v)}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <div
                    className="mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      borderColor:  riskAcked ? 'var(--accent-primary)' : 'rgba(255,255,255,0.25)',
                      background:   riskAcked ? 'var(--accent-primary)' : 'transparent',
                    }}
                  >
                    {riskAcked && (
                      <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                        <path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={12} className="text-amber-400" />
                      <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">Risk Disclosure</span>
                    </div>
                    <p className="text-white/45 text-xs leading-relaxed">
                      I acknowledge that ADE signals are for <strong className="text-white/65">informational and research purposes only</strong>, not financial advice. Trading involves substantial risk of loss. I am solely responsible for my own trading decisions.{' '}
                      <Link
                        to="/risk-disclosure"
                        target="_blank"
                        className="text-apex-accent hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Read full disclosure →
                      </Link>
                    </p>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !riskAcked}
                className="w-full py-3 rounded-lg bg-apex-accent text-black font-semibold hover:bg-apex-accent-hover focus:outline-none focus:ring-2 focus:ring-apex-accent/50 disabled:opacity-50 transition-all"
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-white/50 text-sm mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-apex-accent hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardBody>
        </Card>

        <p className="text-center text-white/40 text-xs mt-4">
          By signing up you agree to our{' '}
          <Link to="/terms" className="text-white/60 hover:underline">Terms</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-white/60 hover:underline">Privacy Policy</Link>.
        </p>
      </motion.div>
    </div>
  )
}
