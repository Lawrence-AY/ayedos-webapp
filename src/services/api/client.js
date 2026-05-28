import axios from 'axios'

export const DEFAULT_API_PATH_PREFIX = '/api'

const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_RETRY_ATTEMPTS = 2
const CACHE_TTL_MS = 60 * 1000
const RAILWAY_WAKE_DELAY_MS = 1200
const RETRYABLE_STATUSES = new Set([408, 425, 500, 502, 503, 504])
const NO_RETRY_STATUSES = new Set([401, 403, 429])

const TOKEN_STORAGE_KEYS = {
  accessToken: 'ayedos_accessToken',
  refreshToken: 'ayedos_refreshToken',
  sessionId: 'ayedos_sessionId',
}

const PUBLIC_AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/login/verify-otp',
  '/api/auth/register',
  '/api/auth/verify-otp',
  '/api/auth/resend-otp',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/set-password',
])

const safeMessagesByStatus = {
  400: 'The request could not be completed. Please check the details and try again.',
  401: 'Invalid credentials',
  403: 'Forbidden',
  404: 'Service unavailable',
  408: 'The server is taking longer than usual to respond. Please try again.',
  429: 'Too many login attempts. Please wait before trying again.',
  500: 'Server error',
}

const responseCache = new Map()
const inFlightRequests = new Map()
let refreshPromise = null

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = details.kind || 'unknown'
    this.status = details.status || 0
    this.code = details.code || null
    this.url = details.url || ''
    this.method = details.method || 'GET'
    this.response = details.response || null
    this.retryAfterSeconds = details.retryAfterSeconds || 0
    this.isRateLimited = this.status === 429
    this.isNetworkError = this.kind === 'network' || this.kind === 'timeout'
    this.cause = details.cause
  }
}

function normalizeBaseUrl(url) {
  if (!url) return ''
  return String(url).replace(/\/+$/, '')
}

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE
  return normalizeBaseUrl(envUrl) || DEFAULT_API_PATH_PREFIX
}

export function buildApiUrl(path) {
  const baseUrl = getApiBaseUrl()
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`

  if (baseUrl === DEFAULT_API_PATH_PREFIX && normalizedPath.startsWith(DEFAULT_API_PATH_PREFIX)) {
    return normalizedPath
  }

  if (baseUrl.endsWith(DEFAULT_API_PATH_PREFIX) && normalizedPath.startsWith(DEFAULT_API_PATH_PREFIX)) {
    return `${baseUrl}${normalizedPath.slice(DEFAULT_API_PATH_PREFIX.length)}`
  }

  return `${baseUrl}${normalizedPath}`
}

export function isApiDebugEnabled() {
  try {
    return import.meta.env.DEV || import.meta.env.VITE_AUTH_DEBUG === 'true' || localStorage.getItem('ayedos_debug_api') === 'true'
  } catch {
    return import.meta.env.DEV || import.meta.env.VITE_AUTH_DEBUG === 'true'
  }
}

export function unwrapEnvelopeData(envelope) {
  if (!envelope || typeof envelope !== 'object') return envelope
  if ('data' in envelope) return envelope.data
  return envelope
}

export function getApiErrorMessage(error) {
  if (!(error instanceof ApiError)) return error?.message || 'Something went wrong. Please try again.'

  if (error.status === 429) return safeMessagesByStatus[429]
  if (error.status === 401) return safeMessagesByStatus[401]
  if (error.status === 403) return safeMessagesByStatus[403]
  if (error.status === 404) return safeMessagesByStatus[404]
  if (error.status === 400 || error.code === 'VALIDATION_ERROR') {
    return error.response?.message || safeMessagesByStatus[400]
  }
  if (error.status >= 500) return safeMessagesByStatus[500]

  if (error.kind === 'timeout') return 'Server is waking up. Please wait...'
  if (error.kind === 'network') {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'Unable to connect. Please check your internet connection.'
    }
    return 'Unable to connect. Please try again in a moment.'
  }

  return error.response?.message || error.message || 'Something went wrong. Please try again.'
}

function parseRetryAfter(headers = {}) {
  const raw = headers['retry-after'] || headers['Retry-After']
  if (!raw) return 60
  const numeric = Number(raw)
  if (Number.isFinite(numeric)) return Math.max(1, numeric)
  const dateMs = Date.parse(raw)
  if (Number.isFinite(dateMs)) return Math.max(1, Math.ceil((dateMs - Date.now()) / 1000))
  return 60
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getBackoffMs(attempt) {
  return Math.min(RAILWAY_WAKE_DELAY_MS * 2 ** attempt, 5000)
}

function getOrCreateDeviceId() {
  const key = 'ayedos_deviceId'
  let deviceId = localStorage.getItem(key)
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(key, deviceId)
  }
  return deviceId
}

function getDeviceName() {
  const platform = navigator.userAgentData?.platform || navigator.platform || 'Unknown platform'
  const browser = navigator.userAgentData?.brands?.[0]?.brand || navigator.userAgent.split(' ')[0] || 'Browser'
  return `${browser} on ${platform}`
}

function getStoredAuth() {
  try {
    return {
      accessToken: localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken),
      refreshToken: localStorage.getItem(TOKEN_STORAGE_KEYS.refreshToken),
      sessionId: localStorage.getItem(TOKEN_STORAGE_KEYS.sessionId),
    }
  } catch {
    return {}
  }
}

function persistTokens(tokens = {}) {
  try {
    if (tokens.accessToken) localStorage.setItem(TOKEN_STORAGE_KEYS.accessToken, tokens.accessToken)
    if (tokens.refreshToken) localStorage.setItem(TOKEN_STORAGE_KEYS.refreshToken, tokens.refreshToken)
    if (tokens.sessionId) localStorage.setItem(TOKEN_STORAGE_KEYS.sessionId, tokens.sessionId)
  } catch {
    // Storage can be unavailable in private mode.
  }
}

function clearStoredAuth() {
  try {
    Object.values(TOKEN_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
    localStorage.removeItem('ayedos_user')
  } catch {
    // Ignore storage errors.
  }
  window.dispatchEvent(new CustomEvent('ayedos:auth-expired'))
}

function isPublicAuthPath(path) {
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`
  return PUBLIC_AUTH_PATHS.has(normalizedPath)
}

function getCacheKey(config) {
  if (String(config.method || 'GET').toUpperCase() !== 'GET') return null
  return `${config.url}|${JSON.stringify(config.params || {})}|${config.headers?.Authorization || ''}|${config.headers?.['X-Session-Id'] || ''}`
}

function getCachedResponse(cacheKey) {
  if (!cacheKey) return null
  const entry = responseCache.get(cacheKey)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(cacheKey)
    return null
  }
  return entry.value
}

function setCachedResponse(cacheKey, value, ttlMs = CACHE_TTL_MS) {
  if (!cacheKey) return
  responseCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlMs,
  })
}

export function clearApiCache() {
  responseCache.clear()
  inFlightRequests.clear()
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: () => true,
})

api.interceptors.request.use((config) => {
  const rawPath = String(config.url || '').startsWith('/') ? config.url : `/${config.url || ''}`
  const baseUrl = getApiBaseUrl()
  const normalizedPath =
    (baseUrl === DEFAULT_API_PATH_PREFIX || baseUrl.endsWith(DEFAULT_API_PATH_PREFIX)) &&
    !rawPath.startsWith(DEFAULT_API_PATH_PREFIX)
      ? `${DEFAULT_API_PATH_PREFIX}${rawPath}`
      : rawPath
  const storedAuth = getStoredAuth()
  const headers = {
    ...(config.headers || {}),
    'X-Device-Id': getOrCreateDeviceId(),
    'X-Device-Name': getDeviceName(),
  }

  const accessToken = config.accessToken || (!isPublicAuthPath(normalizedPath) ? storedAuth.accessToken : null)
  const sessionId = config.sessionId || storedAuth.sessionId

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (sessionId) headers['X-Session-Id'] = sessionId

  if (isApiDebugEnabled()) {
    console.log('[api:request]', {
      route: window.location.pathname,
      apiUrl: `${config.baseURL || ''}${config.url || ''}`,
      method: String(config.method || 'GET').toUpperCase(),
      hasAccessToken: Boolean(accessToken),
      hasSessionId: Boolean(sessionId),
    })
  }

  config.headers = headers
  config.metadata = { startedAt: Date.now() }
  return config
})

api.interceptors.response.use(
  (response) => {
    if (isApiDebugEnabled()) {
      console.log('[api:response]', {
        route: window.location.pathname,
        apiUrl: `${response.config.baseURL || ''}${response.config.url || ''}`,
        method: String(response.config.method || 'GET').toUpperCase(),
        status: response.status,
        durationMs: Date.now() - (response.config.metadata?.startedAt || Date.now()),
      })
    }
    return response
  },
  (error) => {
    const config = error.config || {}
    const isTimeout = error.code === 'ECONNABORTED' || String(error.message || '').toLowerCase().includes('timeout')
    const kind = isTimeout ? 'timeout' : 'network'
    const apiError = new ApiError(
      kind === 'timeout' ? 'Server is waking up. Please wait...' : 'Unable to connect',
      {
        kind,
        url: `${config.baseURL || ''}${config.url || ''}`,
        method: String(config.method || 'GET').toUpperCase(),
        cause: error,
      },
    )
    return Promise.reject(apiError)
  },
)

async function refreshStoredAccessToken() {
  const stored = getStoredAuth()
  if (!stored.refreshToken) return null

  if (!refreshPromise) {
    refreshPromise = apiRequest('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: stored.refreshToken },
      sessionId: stored.sessionId,
      retry: false,
      skipAuthRefresh: true,
      cache: false,
    })
      .then((res) => {
        if (!res.ok) {
          clearStoredAuth()
          return null
        }

        const data = unwrapEnvelopeData(res.json)
        const nextTokens = {
          accessToken: data?.accessToken,
          refreshToken: data?.refreshToken || stored.refreshToken,
          sessionId: data?.sessionId || stored.sessionId,
        }
        if (!nextTokens.accessToken) return null
        persistTokens(nextTokens)
        window.dispatchEvent(new CustomEvent('ayedos:auth-refreshed', { detail: nextTokens }))
        return nextTokens
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function makeApiErrorFromResponse(response, path, method) {
  const json = response.data
  const status = response.status
  const retryAfterSeconds = status === 429 ? parseRetryAfter(response.headers) : 0
  const safeMessage = safeMessagesByStatus[status] || json?.message || `API request failed (status ${status})`

  return new ApiError(safeMessage, {
    kind: 'http',
    status,
    code: json?.code || null,
    url: buildApiUrl(path),
    method,
    response: json,
    retryAfterSeconds,
  })
}

export async function apiRequest(
  path,
  {
    method = 'GET',
    body,
    accessToken,
    sessionId,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retry = true,
    skipAuthRefresh = false,
    cache = true,
    cacheTtlMs = CACHE_TTL_MS,
  } = {},
) {
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`
  const baseUrl = getApiBaseUrl()
  const requestBaseUrl =
    normalizedPath === '/health' && (baseUrl === DEFAULT_API_PATH_PREFIX || baseUrl.endsWith(DEFAULT_API_PATH_PREFIX))
      ? baseUrl.slice(0, -DEFAULT_API_PATH_PREFIX.length)
      : undefined
  const requestPath =
    normalizedPath !== '/health' &&
    (baseUrl === DEFAULT_API_PATH_PREFIX || baseUrl.endsWith(DEFAULT_API_PATH_PREFIX)) &&
    normalizedPath.startsWith(DEFAULT_API_PATH_PREFIX)
      ? normalizedPath.slice(DEFAULT_API_PATH_PREFIX.length) || '/'
      : normalizedPath
  const upperMethod = method.toUpperCase()
  const shouldRetry = retry && upperMethod !== 'DELETE'
  const maxAttempt = shouldRetry ? DEFAULT_RETRY_ATTEMPTS : 0
  const cacheKey = cache
    ? getCacheKey({
        method: upperMethod,
        url: requestPath,
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : getStoredAuth().accessToken || '',
          'X-Session-Id': sessionId || getStoredAuth().sessionId || '',
        },
      })
    : null

  const cached = getCachedResponse(cacheKey)
  if (cached) return cached

  if (cacheKey && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)
  }

  const requestPromise = (async () => {
    let response

    for (let attempt = 0; attempt <= maxAttempt; attempt += 1) {
      try {
        response = await api.request({
          ...(requestBaseUrl !== undefined ? { baseURL: requestBaseUrl || undefined } : {}),
          url: requestPath,
          method: upperMethod,
          data: body,
          accessToken,
          sessionId,
          signal,
          timeout: timeoutMs,
        })
      } catch (error) {
        if (attempt < maxAttempt && shouldRetry && error.kind !== 'cancelled') {
          await wait(getBackoffMs(attempt))
          continue
        }
        throw error instanceof ApiError
          ? error
          : new ApiError('Unable to connect', { kind: 'network', url: buildApiUrl(path), method: upperMethod, cause: error })
      }

      if (
        attempt < maxAttempt &&
        shouldRetry &&
        RETRYABLE_STATUSES.has(response.status) &&
        !NO_RETRY_STATUSES.has(response.status)
      ) {
        await wait(getBackoffMs(attempt))
        continue
      }

      break
    }

    if (!response) {
      throw new ApiError('Unable to connect', { kind: 'network', url: buildApiUrl(path), method: upperMethod })
    }

    if (
      response.status === 401 &&
      !skipAuthRefresh &&
      !isPublicAuthPath(normalizedPath) &&
      normalizedPath !== '/api/auth/refresh' &&
      getStoredAuth().refreshToken
    ) {
      const nextTokens = await refreshStoredAccessToken().catch(() => null)
      if (nextTokens?.accessToken) {
        return apiRequest(path, {
          method,
          body,
          accessToken: nextTokens.accessToken,
          sessionId: nextTokens.sessionId,
          signal,
          timeoutMs,
          retry: false,
          skipAuthRefresh: true,
          cache,
          cacheTtlMs,
        })
      }
    }

    if ((response.status === 401 || response.status === 403) && !skipAuthRefresh && !isPublicAuthPath(normalizedPath)) {
      clearStoredAuth()
    }

    const result = {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: response.data || null,
      url: buildApiUrl(path),
      headers: response.headers || {},
      error: response.status >= 200 && response.status < 300 ? null : makeApiErrorFromResponse(response, path, upperMethod),
    }

    if (result.ok && cacheKey) setCachedResponse(cacheKey, result, cacheTtlMs)
    return result
  })()

  if (cacheKey) inFlightRequests.set(cacheKey, requestPromise)

  try {
    return await requestPromise
  } finally {
    if (cacheKey) inFlightRequests.delete(cacheKey)
  }
}
