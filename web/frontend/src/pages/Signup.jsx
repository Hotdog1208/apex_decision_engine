import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Card, { CardBody } from '../components/Card'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await api.signup(email, password)
      if (r.error) {
        setError(r.error)
        setLoading(false)
        return
      }
      login(r.user, r.access_token)
      navigate('/dashboard')
    } catch (e) {
      setError(e.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
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
                <p className="text-white/50 text-sm">Join APEX to save preferences and track your session</p>
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
                  minLength={6}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apex-accent/50 focus:border-apex-accent/50 transition-colors"
                  placeholder="At least 6 characters"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-apex-accent text-black font-semibold hover:bg-apex-accent-hover focus:outline-none focus:ring-2 focus:ring-apex-accent/50 disabled:opacity-60 transition-all"
              >
                {loading ? 'Creating account…' : 'Sign up'}
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
          By signing up you agree to our <Link to="/terms" className="text-white/60 hover:underline">Terms</Link> and <Link to="/privacy" className="text-white/60 hover:underline">Privacy</Link>.
        </p>
      </motion.div>
    </div>
  )
}
