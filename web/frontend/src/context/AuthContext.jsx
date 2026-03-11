import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const TOKEN_KEY = 'ade_token'
const USER_KEY = 'ade_user'

const AuthContext = createContext({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  isReady: false,
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKEN_KEY)
      const u = localStorage.getItem(USER_KEY)
      if (t && u) {
        setToken(t)
        setUser(JSON.parse(u))
      }
    } catch (_) {}
    setIsReady(true)
  }, [])

  const login = useCallback((userData, accessToken) => {
    setUser(userData)
    setToken(accessToken)
    try {
      localStorage.setItem(TOKEN_KEY, accessToken)
      localStorage.setItem(USER_KEY, JSON.stringify(userData))
    } catch (_) {}
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch (_) {}
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
