import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const r = await api.signup(email, password)
      if (r.error) {
        setError(r.error)
        return
      }
      localStorage.setItem('ade_token', r.access_token)
      navigate('/dashboard')
    } catch (e) {
      setError(e.message || 'Signup failed')
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold text-white mb-6">Create account</h1>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-apex-loss text-sm">{error}</p>}
        <div>
          <label className="block text-slate-400 text-sm mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="block text-slate-400 text-sm mb-1">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white" />
        </div>
        <button type="submit" className="w-full py-2 rounded-lg bg-apex-accent text-white font-medium">Sign up</button>
      </form>
      <p className="text-slate-400 text-sm mt-4">Already have an account? <Link to="/login" className="text-apex-accent">Sign in</Link></p>
    </div>
  )
}
