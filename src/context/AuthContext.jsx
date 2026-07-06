import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest, unwrapEnvelopeData, getApiBaseUrl, getApiErrorMessage, isApiDebugEnabled, clearApiCache } from '../lib/apiClient'
import { decryptData, encryptData, isEncryptedData } from '../lib/storageCrypto'

const AuthContext = createContext(null)

const STORAGE_KEYS = {
  accessToken: 'ayedos_accessToken',
  refreshToken: 'ayedos_refreshToken',
  sessionId: 'ayedos_sessionId',
  user: 'ayedos_user',
  otpSession: 'ayedos_loginOtpSession',
}

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000
const AUTH_SYNC_INTERVAL_MS = 5 * 60 * 1000
const OTP_SESSION_TTL_MS = 10 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
const LOGIN_IDEMPOTENCY_KEY = 'ayedos_loginIdempotencyKey'

const getPersistableUser = (user) => {
  if (!user) return null
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    email: user.email,
    phone: user.phone,
    nationalId: user.nationalId,
    address: user.address,
    passportPhotoUrl: user.passportPhotoUrl,
    nextOfKinName: user.nextOfKinName,
    nextOfKinRelationship: user.nextOfKinRelationship,
    nextOfKinPhone: user.nextOfKinPhone,
    nextOfKin: user.nextOfKin,
    consentGiven: user.consentGiven,
    role: user.role,
  }
}

const normalizeOtpSession = (session) => {
  if (!session?.email) return null
  const expiresAt = Number(session.expiresAt) || Date.now() + OTP_SESSION_TTL_MS
  if (expiresAt <= Date.now()) return null

  return {
    email: String(session.email).trim().toLowerCase(),
    tempToken: session.tempToken || session.sessionId || null,
    sessionId: session.sessionId || session.tempToken || null,
    requiresOTP: true,
    expiresAt,
    resendAvailableAt: Number(session.resendAvailableAt) || Date.now() + OTP_RESEND_COOLDOWN_MS,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [otpSession, setOtpSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const loadUserPromiseRef = useRef(null)
  const refreshPromiseRef = useRef(null)
  const loginOtpVerifyPromiseRef = useRef(null)
  const lastUserLoadAtRef = useRef(0)

  const loadStoredAuth = useCallback(async () => {
    try {
      const storedAccessToken = localStorage.getItem(STORAGE_KEYS.accessToken)
      const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
      const storedSessionId = localStorage.getItem(STORAGE_KEYS.sessionId)
      const storedUser = localStorage.getItem(STORAGE_KEYS.user)
      const storedOtpSession = sessionStorage.getItem(STORAGE_KEYS.otpSession)
      const nextOtpSession = normalizeOtpSession(storedOtpSession ? JSON.parse(storedOtpSession) : null)

      setAccessToken(storedAccessToken || null)
      setRefreshToken(storedRefreshToken || null)
      setSessionId(storedSessionId || null)
      const decryptedUser = storedUser ? await decryptData(storedUser) : null
      const nextUser = decryptedUser && typeof decryptedUser === 'object'
        ? decryptedUser
        : storedUser
          ? JSON.parse(storedUser)
          : null
      setUser(nextUser)
      if (nextUser && !isEncryptedData(storedUser)) {
        const encryptedUser = await encryptData(nextUser)
        if (encryptedUser) localStorage.setItem(STORAGE_KEYS.user, encryptedUser)
      }
      setOtpSession(nextOtpSession)
      if (!nextOtpSession) sessionStorage.removeItem(STORAGE_KEYS.otpSession)
    } catch {
      setAccessToken(null)
      setRefreshToken(null)
      setSessionId(null)
      setUser(null)
      setOtpSession(null)
    }
  }, [])

  const persistAuth = useCallback(async (next) => {
    try {
      if (typeof next.accessToken !== 'undefined') {
        if (next.accessToken) localStorage.setItem(STORAGE_KEYS.accessToken, next.accessToken)
        else localStorage.removeItem(STORAGE_KEYS.accessToken)
      }
      if (typeof next.refreshToken !== 'undefined') {
        if (next.refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, next.refreshToken)
        else localStorage.removeItem(STORAGE_KEYS.refreshToken)
      }
      if (typeof next.sessionId !== 'undefined') {
        if (next.sessionId) localStorage.setItem(STORAGE_KEYS.sessionId, next.sessionId)
        else localStorage.removeItem(STORAGE_KEYS.sessionId)
      }
      if (typeof next.user !== 'undefined') {
        const encryptedUser = next.user ? await encryptData(getPersistableUser(next.user)) : null
        if (encryptedUser) localStorage.setItem(STORAGE_KEYS.user, encryptedUser)
        else localStorage.removeItem(STORAGE_KEYS.user)
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const persistOtpSession = useCallback((nextSession) => {
    const normalized = normalizeOtpSession(nextSession)
    setOtpSession(normalized)
    try {
      if (normalized) sessionStorage.setItem(STORAGE_KEYS.otpSession, JSON.stringify(normalized))
      else sessionStorage.removeItem(STORAGE_KEYS.otpSession)
    } catch {
      // ignore storage errors
    }
    return normalized
  }, [])

  const clearOtpSession = useCallback(() => {
    persistOtpSession(null)
  }, [persistOtpSession])

  const loadCurrentUser = useCallback(async (token, { force = false } = {}) => {
    const resolvedToken = token || localStorage.getItem(STORAGE_KEYS.accessToken)
    if (!resolvedToken) return null

    if (!force && loadUserPromiseRef.current && Date.now() - lastUserLoadAtRef.current < 5000) {
      return loadUserPromiseRef.current
    }

    loadUserPromiseRef.current = (async () => {
      const res = await apiRequest('/api/users/me', {
        method: 'GET',
        accessToken: resolvedToken,
        sessionId,
        cache: !force,
        cacheTtlMs: 2 * 60 * 1000,
      })

      if (!res.ok) {
        throw res.error || new Error(`Failed to load current user (status ${res.status})`)
      }

      const data = unwrapEnvelopeData(res.json)
      setUser(data)
      persistAuth({ user: data })
      lastUserLoadAtRef.current = Date.now()
      return data
    })()

    try {
      return await loadUserPromiseRef.current
    } finally {
      window.setTimeout(() => {
        loadUserPromiseRef.current = null
      }, 0)
    }
  }, [persistAuth, sessionId])

  const updateCurrentUser = useCallback((nextUser) => {
    if (!nextUser) return
    setUser((current) => {
      const merged = {
        ...(current || {}),
        ...nextUser,
      }
      persistAuth({ user: merged })
      return merged
    })
  }, [persistAuth])

  const refresh = useCallback(async (overrideRefreshToken) => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current

    const tokenForRefresh = overrideRefreshToken || refreshToken || localStorage.getItem(STORAGE_KEYS.refreshToken)
    const activeSessionId = sessionId || localStorage.getItem(STORAGE_KEYS.sessionId)

    refreshPromiseRef.current = (async () => {
      const res = await apiRequest('/api/auth/refresh', {
        method: 'POST',
        body: tokenForRefresh ? { refreshToken: tokenForRefresh } : {},
        sessionId: activeSessionId,
        cache: false,
      })

      if (!res.ok) {
        throw res.error || new Error(`Refresh failed (status ${res.status})`)
      }

      const data = unwrapEnvelopeData(res.json) // expected: tokens { accessToken, refreshToken }
      const nextAccessToken = data?.accessToken ?? null
      const nextRefreshToken = data?.refreshToken ?? tokenForRefresh ?? null
      const nextSessionId = data?.sessionId ?? activeSessionId ?? null

      if (!nextAccessToken) {
        return loadCurrentUser(null, { force: true })
      }

      setAccessToken(nextAccessToken)
      setRefreshToken(nextRefreshToken)
      setSessionId(nextSessionId)
      persistAuth({ accessToken: nextAccessToken, refreshToken: nextRefreshToken, sessionId: nextSessionId })

      return loadCurrentUser(nextAccessToken, { force: true })
    })()

    try {
      return await refreshPromiseRef.current
    } finally {
      refreshPromiseRef.current = null
    }
  }, [loadCurrentUser, persistAuth, refreshToken, sessionId])

  const login = useCallback(
    async ({ email, password }) => {
      setAuthError(null)
      const normalizedEmail = email.trim().toLowerCase()
      const storedIdempotency = sessionStorage.getItem(LOGIN_IDEMPOTENCY_KEY)
      const parsedIdempotency = storedIdempotency ? JSON.parse(storedIdempotency) : null
      const idempotencyKey = parsedIdempotency?.email === normalizedEmail && parsedIdempotency.expiresAt > Date.now()
        ? parsedIdempotency.key
        : globalThis.crypto.randomUUID()
      sessionStorage.setItem(LOGIN_IDEMPOTENCY_KEY, JSON.stringify({
        key: idempotencyKey,
        email: normalizedEmail,
        expiresAt: Date.now() + OTP_SESSION_TTL_MS,
      }))
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        idempotencyKey,
        retry: false,
        cache: false,
      })

      if (!res.ok) {
        throw res.error || new Error(getApiErrorMessage(res.error) || `Login failed (status ${res.status})`)
      }

      const data = unwrapEnvelopeData(res.json) // expected: { user, tokens } or OTP challenge
      const requiresOTP = Boolean(data?.requiresOtp || data?.requiresOTP)
      if (requiresOTP) {
        const nextOtpSession = persistOtpSession({
          email: data?.email || email,
          tempToken: data?.tempToken || data?.sessionId || null,
          sessionId: data?.sessionId || data?.tempToken || null,
          expiresAt: Date.now() + OTP_SESSION_TTL_MS,
          resendAvailableAt: Date.now() + OTP_RESEND_COOLDOWN_MS,
        })
        if (nextOtpSession?.sessionId) {
          setSessionId(nextOtpSession.sessionId)
          persistAuth({ sessionId: null })
        }
        return { ...data, requiresOtp: true, requiresOTP: true, otpSession: nextOtpSession }
      }
      const nextUser = data?.user ?? null
      const tokens = data?.tokens ?? data?.token ?? null

      const nextAccessToken = tokens?.accessToken ?? null
      const nextRefreshToken = tokens?.refreshToken ?? null
      const nextSessionId = data?.sessionId ?? null

      if (!nextUser || !nextAccessToken || !nextRefreshToken) {
        throw new Error('Login succeeded but response shape is unexpected')
      }

      setUser(nextUser)
      setAccessToken(nextAccessToken)
      setRefreshToken(nextRefreshToken)
      setSessionId(nextSessionId)
      persistAuth({ user: nextUser, accessToken: nextAccessToken, refreshToken: nextRefreshToken, sessionId: nextSessionId })
      clearOtpSession()
      sessionStorage.removeItem(LOGIN_IDEMPOTENCY_KEY)

      return nextUser
    },
    [clearOtpSession, persistAuth, persistOtpSession]
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
        body: refreshToken || sessionId ? { refreshToken, sessionId } : undefined,
        accessToken: accessToken || undefined,
        sessionId: sessionId || undefined,
      })
    } catch {
      // ignore logout failures, still clear local state
    }

    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    setSessionId(null)
    setOtpSession(null)
    persistAuth({ user: null, accessToken: null, refreshToken: null, sessionId: null })
    clearOtpSession()
    clearApiCache()
  }, [accessToken, clearOtpSession, persistAuth, refreshToken, sessionId])

  const clearLocalAuth = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    setSessionId(null)
    setOtpSession(null)
    persistAuth({ user: null, accessToken: null, refreshToken: null, sessionId: null })
    clearOtpSession()
    clearApiCache()
  }, [clearOtpSession, persistAuth])

  const completeLoginOtp = useCallback(
    async ({ email, otp, tempToken, sessionId: otpSessionId, signal }) => {
      setAuthError(null)
      const storedOtpSession = normalizeOtpSession(otpSession)
      const resolvedEmail = (email || storedOtpSession?.email || '').trim().toLowerCase()
      const resolvedSessionId = otpSessionId || tempToken || storedOtpSession?.sessionId || storedOtpSession?.tempToken || sessionId || null

      if (!resolvedEmail) {
        throw new Error('Your login verification session was lost. Please sign in again.')
      }

      const verificationKey = `${resolvedEmail}:${resolvedSessionId || 'no-session'}:${String(otp || '').trim()}`
      if (loginOtpVerifyPromiseRef.current?.key === verificationKey) {
        return loginOtpVerifyPromiseRef.current.promise
      }

      if (isApiDebugEnabled()) {
        console.log({
          apiUrl: `${getApiBaseUrl()}/auth/login/verify-otp`,
          route: window.location.pathname,
          email: resolvedEmail,
          tempToken: resolvedSessionId,
          otp,
        })
      }

      const verificationPromise = (async () => {
        const res = await apiRequest('/api/auth/login/verify-otp', {
          method: 'POST',
          body: { email: resolvedEmail, otp },
          sessionId: resolvedSessionId || undefined,
          signal,
          retry: false,
          cache: false,
        })

        if (!res.ok) {
          const msg = getApiErrorMessage(res.error) || res.json?.message || `OTP verification failed (status ${res.status})`
          throw new Error(msg)
        }

        const data = unwrapEnvelopeData(res.json)
        const nextUser = data?.user ?? null
        const tokens = data?.tokens ?? null
        const nextAccessToken = tokens?.accessToken ?? null
        const nextRefreshToken = tokens?.refreshToken ?? null
        const nextSessionId = data?.sessionId ?? null

        if (!nextUser) {
          throw new Error('OTP verification succeeded but response shape is unexpected')
        }

        setUser(nextUser)
        setAccessToken(nextAccessToken)
        setRefreshToken(nextRefreshToken)
        setSessionId(nextSessionId)
        persistAuth({ user: nextUser, accessToken: nextAccessToken, refreshToken: nextRefreshToken, sessionId: nextSessionId })
        clearOtpSession()
        sessionStorage.removeItem(LOGIN_IDEMPOTENCY_KEY)

        return nextUser
      })()

      loginOtpVerifyPromiseRef.current = { key: verificationKey, promise: verificationPromise }

      try {
        return await verificationPromise
      } finally {
        if (loginOtpVerifyPromiseRef.current?.key === verificationKey) {
          loginOtpVerifyPromiseRef.current = null
        }
      }
    },
    [clearOtpSession, otpSession, persistAuth, sessionId]
  )

  const resendLoginOtp = useCallback(async () => {
    setAuthError(null)
    const storedOtpSession = normalizeOtpSession(otpSession)
    if (!storedOtpSession?.email) {
      throw new Error('Your login verification session was lost. Please sign in again.')
    }

    const now = Date.now()
    if (storedOtpSession.resendAvailableAt > now) {
      const waitSeconds = Math.ceil((storedOtpSession.resendAvailableAt - now) / 1000)
      throw new Error(`Please wait ${waitSeconds} seconds before requesting another code.`)
    }

    const res = await apiRequest('/api/auth/resend-otp', {
      method: 'POST',
      body: { email: storedOtpSession.email },
      sessionId: storedOtpSession.sessionId || undefined,
      retry: false,
      cache: false,
    })

    if (!res.ok) {
      const msg = getApiErrorMessage(res.error) || res.json?.message || `OTP resend failed (status ${res.status})`
      throw new Error(msg)
    }

    const nextOtpSession = persistOtpSession({
      ...storedOtpSession,
      expiresAt: Date.now() + OTP_SESSION_TTL_MS,
      resendAvailableAt: Date.now() + OTP_RESEND_COOLDOWN_MS,
    })

    return {
      message: res.json?.message || 'A new OTP has been sent to your email',
      otpSession: nextOtpSession,
    }
  }, [otpSession, persistOtpSession])

  const completeRegistrationOtp = useCallback(
    async ({ email, otp }) => {
      setAuthError(null)
      const res = await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        body: { email, otp },
      })

      if (!res.ok) {
        const msg = res.json?.message || `OTP verification failed (status ${res.status})`
        throw new Error(msg)
      }

      const data = unwrapEnvelopeData(res.json)
      const nextUser = data?.user ?? null
      const tokens = data?.tokens ?? null
      const nextAccessToken = tokens?.accessToken ?? null
      const nextRefreshToken = tokens?.refreshToken ?? null

      if (!nextUser) {
        throw new Error('OTP verification succeeded but response shape is unexpected')
      }

      setUser(nextUser)
      setAccessToken(nextAccessToken)
      setRefreshToken(nextRefreshToken)
      persistAuth({ user: nextUser, accessToken: nextAccessToken, refreshToken: nextRefreshToken })

      return nextUser
    },
    [persistAuth]
  )

  useEffect(() => {
    let cancelled = false

    async function init() {
      setIsLoading(true)
      setAuthError(null)

      await loadStoredAuth()

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
          await refresh(localStorage.getItem(STORAGE_KEYS.refreshToken))
          if (!cancelled) setIsLoading(false)
        } catch (e) {
          if (!cancelled) {
            setAuthError(null)
            clearLocalAuth()
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

  useEffect(() => {
    if (!accessToken) return undefined

    let timeoutId
    const resetTimer = () => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        logout()
      }, INACTIVITY_TIMEOUT_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      window.clearTimeout(timeoutId)
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer))
    }
  }, [accessToken, logout])

  useEffect(() => {
    if (!accessToken) return undefined

    let cancelled = false
    const syncAuth = async () => {
      try {
        await loadCurrentUser(accessToken)
      } catch (error) {
        if (cancelled) return
        setAuthError(null)
        clearLocalAuth()
      }
    }

    const intervalId = window.setInterval(syncAuth, AUTH_SYNC_INTERVAL_MS)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncAuth()
    }
    window.addEventListener('focus', syncAuth)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', syncAuth)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [accessToken, clearLocalAuth, loadCurrentUser])

  useEffect(() => {
    const handleAuthExpired = () => {
      setAuthError(null)
      clearLocalAuth()
    }
    const handleAuthRefreshed = (event) => {
      const tokens = event.detail || {}
      if (tokens.accessToken) setAccessToken(tokens.accessToken)
      if (tokens.refreshToken) setRefreshToken(tokens.refreshToken)
      if (tokens.sessionId) setSessionId(tokens.sessionId)
    }
    const handleOnline = () => {
      setIsOnline(true)
      setAuthError(null)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setAuthError('You are offline. Some actions will resume when your connection returns.')
    }

    window.addEventListener('ayedos:auth-expired', handleAuthExpired)
    window.addEventListener('ayedos:auth-refreshed', handleAuthRefreshed)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('ayedos:auth-expired', handleAuthExpired)
      window.removeEventListener('ayedos:auth-refreshed', handleAuthRefreshed)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [clearLocalAuth])

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      sessionId,
      otpSession,
      isLoading,
      authError,
      isOnline,
      login,
      completeLoginOtp,
      resendLoginOtp,
      clearOtpSession,
      completeRegistrationOtp,
      register,
      refresh,
      logout,
      loadCurrentUser,
      updateCurrentUser,
      apiBaseUrl: getApiBaseUrl(),
    }),
    [accessToken, authError, clearOtpSession, completeLoginOtp, completeRegistrationOtp, isLoading, isOnline, login, loadCurrentUser, logout, otpSession, refresh, refreshToken, register, resendLoginOtp, sessionId, updateCurrentUser, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
