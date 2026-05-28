// src/lib/apiClient.js
export const DEFAULT_API_PATH_PREFIX = '/api';
const DEFAULT_TIMEOUT_MS = 45000;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const TOKEN_STORAGE_KEYS = {
  accessToken: 'ayedos_accessToken',
  refreshToken: 'ayedos_refreshToken',
  sessionId: 'ayedos_sessionId',
};
const PUBLIC_AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/login/verify-otp',
  '/api/auth/register',
  '/api/auth/verify-otp',
  '/api/auth/resend-otp',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/set-password',
]);

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = details.kind || 'unknown';
    this.status = details.status || 0;
    this.url = details.url || '';
    this.method = details.method || 'GET';
    this.response = details.response || null;
    this.cause = details.cause;
  }
}

function normalizeBaseUrl(url) {
  if (!url) return '';
  return String(url).replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE;
  return normalizeBaseUrl(envUrl) || DEFAULT_API_PATH_PREFIX;
}

export function buildApiUrl(path) {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`;

  if (baseUrl === DEFAULT_API_PATH_PREFIX && normalizedPath.startsWith(DEFAULT_API_PATH_PREFIX)) {
    return normalizedPath;
  }

  if (baseUrl.endsWith(DEFAULT_API_PATH_PREFIX) && normalizedPath.startsWith(DEFAULT_API_PATH_PREFIX)) {
    return `${baseUrl}${normalizedPath.slice(DEFAULT_API_PATH_PREFIX.length)}`;
  }

  return `${baseUrl}${normalizedPath}`;
}

export function isApiDebugEnabled() {
  try {
    return import.meta.env.DEV || import.meta.env.VITE_AUTH_DEBUG === 'true' || localStorage.getItem('ayedos_debug_api') === 'true';
  } catch {
    return import.meta.env.DEV || import.meta.env.VITE_AUTH_DEBUG === 'true';
  }
}

export function getApiErrorMessage(error) {
  if (!(error instanceof ApiError)) return error?.message || 'Something went wrong. Please try again.';

  if (error.kind === 'timeout') {
    return 'The server is taking longer than usual to respond. It may be waking up; please try again in a moment.';
  }
  if (error.kind === 'network') {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'You appear to be offline. Reconnect and try again.';
    }
    return 'Network connection failed. Check your internet connection, CORS settings, or backend availability.';
  }
  if (error.status === 400) {
    return error.response?.message || 'The request was rejected. Please check the details and try again.';
  }
  if (error.status === 401 || error.status === 403) {
    return error.response?.message || 'The verification code is invalid, expired, or this session is no longer authorized.';
  }
  if (error.status === 408 || error.status === 504) {
    return 'The request timed out while waiting for the backend. Please try again.';
  }
  if (error.status === 429) {
    return error.response?.message || 'Too many requests. Please wait before trying again.';
  }
  if (error.status >= 500) {
    return 'The backend is temporarily unavailable. Please wait a few seconds and try again.';
  }

  return error.response?.message || error.message || 'Something went wrong. Please try again.';
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getBackoffMs(attempt) {
  return Math.min(1200 * 2 ** attempt, 5000);
}

function createTimeoutSignal(parentSignal, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);

  const abortFromParent = () => {
    controller.abort(parentSignal.reason || new DOMException('Request aborted', 'AbortError'));
  };

  if (parentSignal) {
    if (parentSignal.aborted) abortFromParent();
    else parentSignal.addEventListener('abort', abortFromParent, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      parentSignal?.removeEventListener?.('abort', abortFromParent);
    },
  };
}

function getOrCreateDeviceId() {
  const key = 'ayedos_deviceId';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

function getDeviceName() {
  const platform = navigator.userAgentData?.platform || navigator.platform || 'Unknown platform';
  const browser = navigator.userAgentData?.brands?.[0]?.brand || navigator.userAgent.split(' ')[0] || 'Browser';
  return `${browser} on ${platform}`;
}

function getStoredAuth() {
  try {
    return {
      accessToken: localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken),
      refreshToken: localStorage.getItem(TOKEN_STORAGE_KEYS.refreshToken),
      sessionId: localStorage.getItem(TOKEN_STORAGE_KEYS.sessionId),
    };
  } catch {
    return {};
  }
}

function persistTokens(tokens = {}) {
  try {
    if (tokens.accessToken) localStorage.setItem(TOKEN_STORAGE_KEYS.accessToken, tokens.accessToken);
    if (tokens.refreshToken) localStorage.setItem(TOKEN_STORAGE_KEYS.refreshToken, tokens.refreshToken);
    if (tokens.sessionId) localStorage.setItem(TOKEN_STORAGE_KEYS.sessionId, tokens.sessionId);
  } catch {
    // storage may be unavailable in private mode
  }
}

function clearStoredAuth() {
  try {
    Object.values(TOKEN_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('ayedos_user');
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new CustomEvent('ayedos:auth-expired'));
}

async function refreshStoredAccessToken() {
  const stored = getStoredAuth();
  if (!stored.refreshToken) return null;

  const res = await apiRequest('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: stored.refreshToken },
    sessionId: stored.sessionId,
    retry: false,
    skipAuthRefresh: true,
  });

  if (!res.ok) {
    clearStoredAuth();
    return null;
  }

  const data = unwrapEnvelopeData(res.json);
  const nextTokens = {
    accessToken: data?.accessToken,
    refreshToken: data?.refreshToken || stored.refreshToken,
    sessionId: data?.sessionId || stored.sessionId,
  };
  if (!nextTokens.accessToken) return null;
  persistTokens(nextTokens);
  window.dispatchEvent(new CustomEvent('ayedos:auth-refreshed', { detail: nextTokens }));
  return nextTokens;
}

/**
 * Generic API request helper
 * @param {string} path - API endpoint path (e.g. '/api/applications')
 * @param {object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {object} options.body - Request body (will be JSON.stringify'd)
 * @param {string} options.accessToken - Bearer token for authorization
 * @param {AbortSignal} options.signal - AbortSignal for request cancellation
 * @returns {Promise<{ok: boolean, status: number, json: any}>}
 */
export async function apiRequest(path, { method = 'GET', body, accessToken, sessionId, signal, timeoutMs = DEFAULT_TIMEOUT_MS, retry = true, skipAuthRefresh = false } = {}) {
  const url = buildApiUrl(path);
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`;
  const storedAuth = getStoredAuth();
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.has(normalizedPath);
  const resolvedAccessToken = accessToken || (!isPublicAuthPath ? storedAuth.accessToken : null) || null;

  const headers = {
    'Content-Type': 'application/json',
    'X-Device-Id': getOrCreateDeviceId(),
    'X-Device-Name': getDeviceName(),
  };

  if (resolvedAccessToken) {
    headers.Authorization = `Bearer ${resolvedAccessToken}`;
  }

  const storedSessionId = sessionId || storedAuth.sessionId;
  if (storedSessionId) {
    headers['X-Session-Id'] = storedSessionId;
  }

  const fetchOptions = {
    method,
    headers,
    credentials: 'include',
  };

  if (body !== undefined && body !== null) {
    fetchOptions.body = JSON.stringify(body);
  }

  const shouldRetry = retry && method.toUpperCase() !== 'DELETE';
  let response;

  const runFetch = async (targetUrl, attempt) => {
    const timeout = createTimeoutSignal(signal, timeoutMs);
    const startedAt = Date.now();
    try {
      if (isApiDebugEnabled()) {
        console.log('[api:request]', {
          route: window.location.pathname,
          apiUrl: targetUrl,
          method,
          attempt: attempt + 1,
          hasAccessToken: Boolean(resolvedAccessToken),
          hasSessionId: Boolean(storedSessionId),
        });
      }

      const nextResponse = await fetch(targetUrl, {
        ...fetchOptions,
        signal: timeout.signal,
      });

      if (isApiDebugEnabled()) {
        console.log('[api:response]', {
          route: window.location.pathname,
          apiUrl: targetUrl,
          method,
          status: nextResponse.status,
          durationMs: Date.now() - startedAt,
        });
      }

      return nextResponse;
    } catch (error) {
      const kind = error?.name === 'TimeoutError' || timeout.signal.reason?.name === 'TimeoutError' ? 'timeout' : 'network';
      if (signal?.aborted) {
        throw new ApiError('Request was cancelled', { kind: 'cancelled', url: targetUrl, method, cause: error });
      }
      throw new ApiError(
        kind === 'timeout' ? `API request timed out after ${timeoutMs}ms` : `Failed to reach the API at ${targetUrl}`,
        { kind, url: targetUrl, method, cause: error }
      );
    } finally {
      timeout.cleanup();
    }
  };

  for (let attempt = 0; attempt <= (shouldRetry ? 1 : 0); attempt += 1) {
    try {
      response = await runFetch(url, attempt);
    } catch (error) {
      // During local development, fall back to the Vite proxy route if an absolute API host is unavailable.
      if (import.meta.env.DEV && url !== normalizedPath && normalizedPath.startsWith(DEFAULT_API_PATH_PREFIX)) {
        try {
          response = await runFetch(normalizedPath, attempt);
        } catch (fallbackError) {
          if (attempt < 1 && shouldRetry && fallbackError.kind !== 'cancelled') {
            await wait(getBackoffMs(attempt));
            continue;
          }
          throw new ApiError(
            `Failed to reach the API at ${url}. Check that the backend is running and that VITE_API_URL points to the backend URL.`,
            { kind: fallbackError.kind || 'network', url, method, cause: fallbackError }
          );
        }
      } else if (attempt < 1 && shouldRetry && error.kind !== 'cancelled') {
        await wait(getBackoffMs(attempt));
        continue;
      } else {
        throw new ApiError(
          `Failed to reach the API at ${url}. Check that VITE_API_URL or VITE_API_BASE points to the backend URL.`,
          { kind: error.kind || 'network', url, method, cause: error }
        );
      }
    }

    if (attempt < 1 && shouldRetry && RETRYABLE_STATUSES.has(response.status)) {
      await wait(getBackoffMs(attempt));
      continue;
    }

    break;
  }

  if (!response) {
    throw new ApiError(`Failed to reach the API at ${url}`, { kind: 'network', url, method });
  }

  const text = await response.text().catch(() => '');
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (
    response.status === 405 &&
    normalizedPath.startsWith(DEFAULT_API_PATH_PREFIX) &&
    getApiBaseUrl() === DEFAULT_API_PATH_PREFIX
  ) {
    json = {
      ...(json || {}),
      message:
        'API base URL is not configured. Set VITE_API_URL or VITE_API_BASE to the backend URL, then rebuild and redeploy the web app.',
    };
  }

  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !isPublicAuthPath &&
    normalizedPath !== '/api/auth/refresh' &&
    getStoredAuth().refreshToken
  ) {
    const nextTokens = await refreshStoredAccessToken().catch(() => null);
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
      });
    }
  }

  if ((response.status === 401 || response.status === 403) && !skipAuthRefresh && !isPublicAuthPath) {
    clearStoredAuth();
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
    url,
    error: response.ok ? null : new ApiError(json?.message || `API request failed (status ${response.status})`, {
      kind: 'http',
      status: response.status,
      url,
      method,
      response: json,
    }),
  };
}

/**
 * Unwrap response data from backend envelope
 * Backend uses ResponseHandler => { success, message, data, timestamp }
 */
export function unwrapEnvelopeData(envelope) {
  if (!envelope || typeof envelope !== 'object') return envelope;
  if ('data' in envelope) return envelope.data;
  return envelope;
}
