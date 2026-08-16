import { createContext, useContext, useEffect, useState } from 'react'
import { api, clearTokens, getTokens, onTokensChange, setTokens } from './api'
import { clearApiCache } from './pwa'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadMe() {
      if (!getTokens()?.access_token) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const me = await api.get('/auth/me')
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) {
          clearTokens()
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadMe()
    const off = onTokensChange((t) => {
      if (!t) setUser(null)
    })
    return () => {
      cancelled = true
      off()
    }
  }, [])

  async function login(email, password) {
    const t = await api.post('/auth/login', { email, password }, { auth: false })
    setTokens(t)
    const me = await api.get('/auth/me')
    setUser(me)
  }

  async function register(email, password, display_name) {
    const t = await api.post(
      '/auth/register',
      { email, password, display_name },
      { auth: false }
    )
    setTokens(t)
    const me = await api.get('/auth/me')
    setUser(me)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore — we're clearing local state regardless
    }
    clearTokens()
    // Offline copies of recipes outlive the token — drop them too, so a
    // shared device doesn't stay readable after signing out.
    clearApiCache()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
