export const DEFAULT_API_PATH_PREFIX = '/api'

function normalizeBaseUrl(url) {
  if (!url) return ''
  return String(url).replace(/\/+$/, '')
}

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL
  return normalizeBaseUrl(envUrl) || DEFAULT_API_PATH_PREFIX
}

export function buildApiUrl(path) {
  const baseUrl = getApiBaseUrl()
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

function toJsonBody(body) {
  if (body === undefined) return undefined
  return JSON.stringify(body)
}

export async function apiRequest(path, { method = 'GET', body, accessToken, signal } = {}) {
  const url = buildApiUrl(path)

  const headers = {
    'Content-Type': 'application/json'
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const res = await fetch(url, {
    method,
    headers,
    body: toJsonBody(body),
    signal
  })

  const text = await res.text().catch(() => '')
  let json = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    json
  }
}

export function unwrapEnvelopeData(envelope) {
  // Backend uses ResponseHandler => { success, message, data, timestamp }
  if (!envelope || typeof envelope !== 'object') return envelope
  if ('data' in envelope) return envelope.data
  return envelope
}
