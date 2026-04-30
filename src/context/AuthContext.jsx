import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, unwrapEnvelopeData, getApiBaseUrl } from '../lib/apiClient'

const AuthContext = createContext(null)

const STORAGE_KEYS = {
  accessToken: 'ayedos_accessToken',
  refreshToken: 'ayedos_refreshToken',
  user: 'ayedos_user',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const loadStoredAuth = useCallback(() => {
    try {
      const storedAccessToken = localStorage.getItem(STORAGE_KEYS.accessToken)
      const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
      const storedUser = localStorage.getItem(STORAGE_KEYS.user)

      setAccessToken(storedAccessToken || null)
      setRefreshToken(storedRefreshToken || null)
      setUser(storedUser ? JSON.parse(storedUser) : null)
    } catch {
      setAccessToken(null)
      setRefreshToken(null)
      setUser(null)
    }
  }, [])

  const persistAuth = useCallback((next) => {
    try {
      if (typeof next.accessToken !== 'undefined') {
        if (next.accessToken) localStorage.setItem(STORAGE_KEYS.accessToken, next.accessToken)
        else localStorage.removeItem(STORAGE_KEYS.accessToken)
      }
      if (typeof next.refreshToken !== 'undefined') {
        if (next.refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, next.refreshToken)
        else localStorage.removeItem(STORAGE_KEYS.refreshToken)
      }
      if (typeof next.user !== 'undefined') {
        if (next.user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(next.user))
        else localStorage.removeItem(STORAGE_KEYS.user)
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const loadCurrentUser = useCallback(async (token) => {
    const res = await apiRequest('/api/users/me', {
      method: 'GET',
      accessToken: token,
    })

    if (!res.ok) {
      throw new Error(`Failed to load current user (status ${res.status})`)
    }

    const data = unwrapEnvelopeData(res.json)
    setUser(data)
    persistAuth({ user: data })
  }, [persistAuth])

  const refresh = useCallback(async () => {
    if (!refreshToken) return

    const res = await apiRequest('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    })

    if (!res.ok) {
      throw new Error(`Refresh failed (status ${res.status})`)
    }

    const data = unwrapEnvelopeData(res.json) // expected: tokens { accessToken, refreshToken }
    const nextAccessToken = data?.accessToken ?? null
    const nextRefreshToken = data?.refreshToken ?? null

    if (!nextAccessToken) throw new Error('Refresh did not return accessToken')

    setAccessToken(nextAccessToken)
    setRefreshToken(nextRefreshToken)
    persistAuth({ accessToken: nextAccessToken, refreshToken: nextRefreshToken })

    await loadCurrentUser(nextAccessToken)
  }, [loadCurrentUser, persistAuth, refreshToken])

  const login = useCallback(
    async ({ email, password }) => {
      setAuthError(null)
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      if (!res.ok) {
        const msg = res.json?.message || `Login failed (status ${res.status})`
        throw new Error(msg)
      }

      const data = unwrapEnvelopeData(res.json) // expected: { user, tokens }
      const nextUser = data?.user ?? null
      const tokens = data?.tokens ?? data?.token ?? null

      const nextAccessToken = tokens?.accessToken ?? null
      const nextRefreshToken = tokens?.refreshToken ?? null

      if (!nextUser || !nextAccessToken || !nextRefreshToken) {
        throw new Error('Login succeeded but response shape is unexpected')
      }

      setUser(nextUser)
      setAccessToken(nextAccessToken)
      setRefreshToken(nextRefreshToken)
      persistAuth({ user: nextUser, accessToken: nextAccessToken, refreshToken: nextRefreshToken })

      return nextUser
    },
    [persistAuth]
  )

  const register = useCallback(
    async ({ firstName, lastName, name, email, password, phone, role }) => {
      setAuthError(null)
      const payload = {
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        name: name?.trim() || [firstName, lastName].filter(Boolean).join(' ').trim(),
        email,
        password,
        phone,
        role,
      }

      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: payload,
      })

      if (!res.ok) {
        const msg = res.json?.message || `Register failed (status ${res.status})`
        throw new Error(msg)
      }

      const data = unwrapEnvelopeData(res.json)
      const nextUser = data?.user ?? null
      const tokens = data?.tokens ?? data?.token ?? null
      const nextAccessToken = tokens?.accessToken ?? null
      const nextRefreshToken = tokens?.refreshToken ?? null

      if (nextUser && nextAccessToken && nextRefreshToken) {
        setUser(nextUser)
        setAccessToken(nextAccessToken)
        setRefreshToken(nextRefreshToken)
        persistAuth({ user: nextUser, accessToken: nextAccessToken, refreshToken: nextRefreshToken })
      }

      return data
    },
    [persistAuth]
  )

  const logout = useCallback(async () => {
    setAuthError(null)
    try {
      // backend logout handler likely accepts refreshToken; if it ignores body, it's fine.
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        body: refreshToken ? { refreshToken } : undefined,
        accessToken: accessToken || undefined,
      })
    } catch {
      // ignore logout failures, still clear local state
    }

    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    persistAuth({ user: null, accessToken: null, refreshToken: null })
  }, [accessToken, persistAuth, refreshToken])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setIsLoading(true)
      setAuthError(null)

      loadStoredAuth()

      const hasTokens = Boolean(localStorage.getItem(STORAGE_KEYS.accessToken))

      try {
        if (!hasTokens) {
          if (!cancelled) setIsLoading(false)
          return
        }

        // Try load current user first (fast path)
        await loadCurrentUser(accessToken || localStorage.getItem(STORAGE_KEYS.accessToken))
        if (!cancelled) setIsLoading(false)
      } catch {
        // If current token is invalid/expired, try refresh
        try {
          await refresh()
          if (!cancelled) setIsLoading(false)
        } catch (e) {
          if (!cancelled) {
            setAuthError(e?.message || 'Authentication expired')
            setIsLoading(false)
          }
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isLoading,
      authError,
      login,
      register,
      refresh,
      logout,
      loadCurrentUser,
      apiBaseUrl: getApiBaseUrl(),
    }),
    [accessToken, authError, isLoading, login, loadCurrentUser, logout, refresh, refreshToken, register, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
