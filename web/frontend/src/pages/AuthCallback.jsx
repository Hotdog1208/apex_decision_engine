import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Landing page for all Supabase email redirect flows:
 * - Email confirmation after signup
 * - Password reset link
 *
 * Supabase processes the URL code/token automatically when detectSessionInUrl is true.
 * We simply listen for the auth state event and redirect accordingly.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Confirming your account…')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('Redirecting to password reset…')
        navigate('/reset-password', { replace: true })
      } else if (event === 'SIGNED_IN' && session) {
        setStatus('Account confirmed! Redirecting…')
        navigate('/dashboard', { replace: true })
      }
    })

    // If the session was already established before this page mounted (race condition),
    // check synchronously and redirect.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <div style={{
        textAlign: 'center',
        fontFamily: 'var(--font-data, monospace)',
        fontSize: '10px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--accent-cyan)',
        opacity: 0.7,
      }}
        className="animate-pulse"
      >
        {status}
      </div>
    </div>
  )
}
