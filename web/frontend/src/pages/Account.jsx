import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, CheckCircle, Trash2, CreditCard, ExternalLink, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Card, { CardBody } from '../components/Card'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

const TIER_META = {
  free:  { label: 'FREE',  color: 'rgba(255,255,255,0.28)',  desc: 'Basic access' },
  edge:  { label: 'EDGE',  color: 'rgba(255,255,255,0.50)',  desc: 'Signal Hub, 20 symbols, UOA' },
  alpha: { label: 'ALPHA', color: '#00D4FF',                 desc: 'Unlimited symbols, AI Chat' },
  apex:  { label: 'APEX',  color: '#CCFF00',                 desc: 'All features + APEX Agent' },
}

export default function Account() {
  const { user, tier, refreshTier } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const checkoutSuccess = searchParams.get('checkout') === 'success'

  // Billing state
  const [portalLoading, setPortalLoading] = useState(false)

  // 2FA state
  const [factors, setFactors]           = useState([])
  const [mfaStep, setMfaStep]           = useState('idle')   // idle | enroll | verify | done
  const [qrCode, setQrCode]             = useState(null)
  const [totpSecret, setTotpSecret]     = useState(null)
  const [enrollFactorId, setEnrollFactorId] = useState(null)
  const [totpCode, setTotpCode]         = useState('')
  const [mfaError, setMfaError]         = useState('')
  const [mfaLoading, setMfaLoading]     = useState(false)

  // Password change state
  const [pwLoading, setPwLoading]       = useState(false)
  const [pwError, setPwError]           = useState('')
  const [pwSuccess, setPwSuccess]       = useState('')
  const [currentPw, setCurrentPw]       = useState('')
  const [newPw, setNewPw]               = useState('')
  const [confirmPw, setConfirmPw]       = useState('')

  // After Stripe redirect: refresh tier and clear the query param
  useEffect(() => {
    if (checkoutSuccess) {
      toast.success('Subscription activated — welcome to the next tier!')
      refreshTier(user?.id)
      setSearchParams({}, { replace: true })
    }
  }, [checkoutSuccess, user?.id, refreshTier, setSearchParams])

  const loadFactors = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.totp || [])
  }, [])

  useEffect(() => {
    loadFactors()
  }, [loadFactors])

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const { url } = await api.createPortalSession()
      window.location.href = url
    } catch (err) {
      toast.error(err.message || 'Could not open billing portal.')
      setPortalLoading(false)
    }
  }

  // ── 2FA Enrollment ──────────────────────────────────────────
  const startEnroll = async () => {
    setMfaError('')
    setMfaLoading(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Apex Decision Engine' })
    if (error) {
      setMfaError(error.message)
      setMfaLoading(false)
      return
    }
    setQrCode(data.totp.qr_code)
    setTotpSecret(data.totp.secret)
    setEnrollFactorId(data.id)
    setMfaStep('enroll')
    setMfaLoading(false)
  }

  const verifyEnrollment = async (e) => {
    e.preventDefault()
    setMfaError('')
    setMfaLoading(true)

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId })
    if (cErr) {
      setMfaError(cErr.message)
      setMfaLoading(false)
      return
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: challenge.id,
      code: totpCode.replace(/\s/g, ''),
    })

    if (vErr) {
      setMfaError(vErr.message)
      setMfaLoading(false)
      return
    }

    await loadFactors()
    setMfaStep('done')
    setTotpCode('')
    setMfaLoading(false)
  }

  const unenroll = async (factorId) => {
    if (!window.confirm('Disable two-factor authentication? Your account will be less secure.')) return
    await supabase.auth.mfa.unenroll({ factorId })
    await loadFactors()
    setMfaStep('idle')
  }

  // ── Password change ─────────────────────────────────────────
  const changePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.')
      return
    }
    if (newPw.length < 8) {
      setPwError('Password must be at least 8 characters.')
      return
    }

    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      setPwError(error.message)
    } else {
      setPwSuccess('Password updated successfully.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    }
    setPwLoading(false)
  }

  const tierMeta = TIER_META[tier] || TIER_META.free

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Account Settings"
        subtitle="Manage your APEX account, security, and subscription"
      />

      {/* Plan & Billing */}
      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Plan &amp; Billing</h2>

          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Email</span>
              <span className="text-white text-sm font-mono">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Current plan</span>
              <span
                className="text-sm font-bold font-mono"
                style={{ color: tierMeta.color }}
              >
                {tierMeta.label}
              </span>
            </div>
            {tier !== 'free' && (
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Manage billing</span>
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors disabled:opacity-50"
                >
                  {portalLoading
                    ? <Loader2 size={12} className="animate-spin" />
                    : <ExternalLink size={12} />
                  }
                  Stripe portal
                </button>
              </div>
            )}
          </div>

          {tier !== 'apex' && (
            <div className="pt-4 border-t border-white/8 flex items-center gap-3">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90"
                style={{
                  fontFamily: 'var(--font-data, monospace)',
                  background: 'rgba(204,255,0,0.1)',
                  color: '#CCFF00',
                  border: '1px solid rgba(204,255,0,0.25)',
                }}
              >
                <CreditCard size={13} />
                Upgrade plan
              </Link>
              <span className="text-white/25 text-xs">Cancel anytime from Stripe portal</span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Two-factor authentication */}
      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-1">
            Two-factor authentication
          </h2>
          <p className="text-white/35 text-xs mb-4">
            Add a TOTP authenticator (Google Authenticator, Authy) for extra security.
          </p>

          {mfaStep === 'idle' && factors.length === 0 && (
            <button
              onClick={startEnroll}
              disabled={mfaLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.25)' }}
            >
              <ShieldCheck size={15} />
              {mfaLoading ? 'Setting up…' : 'Enable 2FA'}
            </button>
          )}

          {mfaStep === 'enroll' && qrCode && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <p className="text-white/55 text-sm">
                Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
              </p>
              <div
                className="inline-block p-3 rounded-xl"
                style={{ background: '#fff' }}
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
              {totpSecret && (
                <div>
                  <p className="text-white/35 text-xs mb-1">Or enter this key manually:</p>
                  <code className="text-white/60 text-xs font-mono bg-white/5 px-2 py-1 rounded border border-white/10">
                    {totpSecret}
                  </code>
                </div>
              )}
              <form onSubmit={verifyEnrollment} className="space-y-3">
                {mfaError && (
                  <div className="p-3 rounded-lg bg-apex-loss/20 text-apex-loss text-sm border border-apex-loss/30">
                    {mfaError}
                  </div>
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                  maxLength={6}
                  autoFocus
                  className="w-40 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apex-accent/50 focus:border-apex-accent/50 transition-colors text-center text-xl tracking-[0.4em] font-mono"
                  placeholder="000000"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={mfaLoading || totpCode.length < 6}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                    style={{ background: 'var(--accent-primary)', color: '#000' }}
                  >
                    {mfaLoading ? 'Verifying…' : 'Activate 2FA'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMfaStep('idle')}
                    className="px-4 py-2 rounded-lg text-sm text-white/45 hover:text-white/70 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {(mfaStep === 'done' || factors.length > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {mfaStep === 'done' && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle size={15} />
                  2FA enabled successfully.
                </div>
              )}
              {factors.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-cyan-400" />
                    <div>
                      <p className="text-white/80 text-sm font-medium">{f.friendly_name || 'Authenticator app'}</p>
                      <p className="text-white/35 text-xs">Enrolled {new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => unenroll(f.id)}
                    className="p-1.5 rounded text-white/30 hover:text-red-400 transition-colors"
                    title="Remove 2FA"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </CardBody>
      </Card>

      {/* Change password */}
      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
            Change password
          </h2>
          <form onSubmit={changePassword} className="space-y-4 max-w-sm">
            {pwError && (
              <div className="p-3 rounded-lg bg-apex-loss/20 text-apex-loss text-sm border border-apex-loss/30">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="p-3 rounded-lg bg-green-500/15 text-green-400 text-sm border border-green-500/25">
                {pwSuccess}
              </div>
            )}
            <div>
              <label className="block text-white/60 text-sm font-medium mb-1.5">New password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apex-accent/50 focus:border-apex-accent/50 transition-colors"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm font-medium mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apex-accent/50 focus:border-apex-accent/50 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={pwLoading}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {pwLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
