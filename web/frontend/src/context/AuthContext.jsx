import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({
  user: null,
  session: null,
  token: null,
  tier: 'free',
  login: async () => {},
  logout: async () => {},
  refreshTier: async () => {},
  isReady: false,
})

async function fetchUserTier(userId) {
  try {
    const { data } = await supabase
      .from('users')
      .select('tier')
      .eq('user_id', userId)
      .single()
    return data?.tier || 'free'
  } catch {
    return 'free'
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [tier, setTier] = useState('free')
  const [isReady, setIsReady] = useState(false)

  const refreshTier = useCallback(async (userId) => {
    if (!userId) return
    const t = await fetchUserTier(userId)
    setTier(t)
    return t
  }, [])

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        setUser(session.user)
        await refreshTier(session.user.id)
      }
      setIsReady(true)
    })

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session?.user) {
          setUser(session.user)
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await refreshTier(session.user.id)
          }
        } else {
          setUser(null)
          setTier('free')
        }
        // Mark ready after first resolution (handles redirect flows)
        setIsReady(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [refreshTier])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setTier('free')
  }, [])

  // Backward-compat shim: login() is a no-op; Supabase manages sessions via onAuthStateChange.
  const login = useCallback(() => {}, [])

  const token = session?.access_token ?? null

  return (
    <AuthContext.Provider value={{ user, session, token, tier, login, logout, refreshTier, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

/** Synchronously read the Supabase access token from localStorage (for WebSocket setup). */
export function getStoredToken() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          return parsed?.access_token ?? null
        }
      }
    }
  } catch {
    return null
  }
  return null
}
