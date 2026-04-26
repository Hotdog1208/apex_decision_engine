import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps a route so only authenticated users can access it.
 * Redirects unauthenticated visitors to /login with the attempted path preserved
 * in location state so they can be sent back after login.
 */
export default function PrivateRoute({ children }) {
  const { user, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) {
    // Supabase session is still being restored from storage — don't redirect yet.
    return (
      <div style={{
        padding: '80px 20px',
        textAlign: 'center',
        fontFamily: 'var(--font-data, monospace)',
        fontSize: '10px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--accent-cyan)',
        opacity: 0.6,
      }}
        className="animate-pulse"
      >
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
