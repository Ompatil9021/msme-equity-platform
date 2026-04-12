import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, loginUser, registerUser } from './api'

const AUTH_TOKEN_KEY = 'msme_auth_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) {
        setAuthLoading(false)
        return
      }

      try {
        const payload = await getCurrentUser()
        setCurrentUser(payload.user)
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        setCurrentUser(null)
      } finally {
        setAuthLoading(false)
      }
    }

    bootstrapAuth()
  }, [])

  const register = async ({ name, email, password, role }) => {
    const payload = await registerUser({ name, email, password, role })
    localStorage.setItem(AUTH_TOKEN_KEY, payload.token)
    setCurrentUser(payload.user)
    return payload.user
  }

  const login = async ({ email, password }) => {
    const payload = await loginUser({ email, password })
    localStorage.setItem(AUTH_TOKEN_KEY, payload.token)
    setCurrentUser(payload.user)
    return payload.user
  }

  const logout = () => {
    setCurrentUser(null)
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }

  const value = useMemo(
    () => ({
      currentUser,
      authLoading,
      isAuthenticated: Boolean(currentUser),
      register,
      login,
      logout,
    }),
    [currentUser, authLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
