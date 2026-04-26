import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Card, { CardBody } from '../components/Card'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // MFA state
  const [mfaRequired, setMfaRequired]   = useState(false)
  const [totpCode, setTotpCode]         = useState('')
  const [mfaLoading, setMfaLoading]     = useState(false)
  const [challengeId, setChallengeId]   = useState(null)
  const [factorId, setFactorId]         = useState(null)

  const navigate  = useNavigate()
  const location  = useLocation()
  const returnTo  = location.state?.from?.pathname || '/dashboard'

  // Step 1 — email + password
  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Check if MFA is required
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalData?.nextLevel === 'aal2' && aalData.nextLevel !== aalData.currentLevel) {
      // User has TOTP enrolled — start challenge
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (totp) {
        const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
        if (challengeErr) {
          setError(challengeErr.message)
          setLoading(false)
          return
        }
        setFactorId(totp.id)
        setChallengeId(challenge.id)
        setMfaRequired(true)
        setLoading(false)
        return
      }
    }

    // No MFA required — onAuthStateChange will handle the session; navigate now
    navigate(returnTo, { replace: true })
    setLoading(false)
  }

  // Step 2 — TOTP verification
  const submitMfa = async (e) => {
    e.preventDefault()
    setError('')
    setMfaLoading(true)

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: totpCode.replace(/\s/g, ''),
    })

    if (verifyError) {
      setError(verifyError.message)
      setMfaLoading(false)
      return
    }

    navigate(returnTo, { replace: true })
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
                {mfaRequired ? <ShieldCheck size={20} /> : <LogIn size={20} />}
              </span>
              <div>
                <h1 className="text-xl font-display font-bold text-white tracking-tight">
                  {mfaRequired ? 'Two-factor authentication' : 'Sign in'}
                </h1>
                <p className="text-white/50 text-sm">
                  {mfaRequired
                    ? 'Enter the 6-digit code from your authenticator app'
                    : 'Use your APEX account to continue'}
                </p>
              </div>
            </div>
          </div>

          <CardBody>
            {!mfaRequired ? (
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-white/60 text-sm font-medium">Password</label>
                    <Link to="/forgot-password" className="text-xs text-white/40 hover:text-apex-accent transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apex-accent/50 focus:border-apex-accent/50 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-apex-accent text-black font-semibold hover:bg-apex-accent-hover focus:outline-none focus:ring-2 focus:ring-apex-accent/50 disabled:opacity-60 transition-all"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            ) : (
              <form onSubmit={submitMfa} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-apex-loss/20 text-apex-loss text-sm border border-apex-loss/30">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-1.5">Authenticator code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    required
                    autoFocus
                    maxLength={6}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apex-accent/50 focus:border-apex-accent/50 transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="000000"
                  />
                </div>
                <button
                  type="submit"
                  disabled={mfaLoading || totpCode.length < 6}
                  className="w-full py-3 rounded-lg bg-apex-accent text-black font-semibold hover:bg-apex-accent-hover focus:outline-none focus:ring-2 focus:ring-apex-accent/50 disabled:opacity-60 transition-all"
                >
                  {mfaLoading ? 'Verifying…' : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMfaRequired(false); setError(''); setTotpCode('') }}
                  className="w-full text-center text-white/40 text-sm hover:text-white/60 transition-colors"
                >
                  ← Back
                </button>
              </form>
            )}

            {!mfaRequired && (
              <p className="text-center text-white/50 text-sm mt-5">
                No account?{' '}
                <Link to="/signup" className="text-apex-accent hover:underline font-medium">
                  Sign up free
                </Link>
              </p>
            )}
          </CardBody>
        </Card>

        <p className="text-center text-white/40 text-xs mt-4">
          By signing in you agree to our{' '}
          <Link to="/terms" className="text-white/60 hover:underline">Terms</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-white/60 hover:underline">Privacy</Link>.
        </p>
      </motion.div>
    </div>
  )
}
