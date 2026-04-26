import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { KeyRound, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Card, { CardBody } from '../components/Card'

const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/auth/callback`,
    })

    if (resetError) {
      setError(resetError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
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
                  <CheckCircle size={28} />
                </span>
              </div>
              <h2 className="text-xl font-display font-bold text-white mb-2">Check your email</h2>
              <p className="text-white/55 text-sm mb-4">
                If an account exists for <span className="text-white/80 font-medium">{email}</span>,
                you&apos;ll receive a password reset link shortly.
              </p>
              <Link
                to="/login"
                className="text-apex-accent hover:underline text-sm"
              >
                ← Back to sign in
              </Link>
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
                <KeyRound size={20} />
              </span>
              <div>
                <h1 className="text-xl font-display font-bold text-white tracking-tight">Reset password</h1>
                <p className="text-white/50 text-sm">We&apos;ll email you a reset link</p>
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
                  autoFocus
                  autoComplete="email"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apex-accent/50 focus:border-apex-accent/50 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-apex-accent text-black font-semibold hover:bg-apex-accent-hover focus:outline-none focus:ring-2 focus:ring-apex-accent/50 disabled:opacity-60 transition-all"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="text-center text-white/50 text-sm mt-5">
              <Link to="/login" className="text-apex-accent hover:underline">
                ← Back to sign in
              </Link>
            </p>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  )
}
