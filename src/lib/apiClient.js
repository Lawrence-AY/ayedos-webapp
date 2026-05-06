// src/lib/apiClient.js
export const DEFAULT_API_PATH_PREFIX = '/api';

function normalizeBaseUrl(url) {
  if (!url) return '';
  return String(url).replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  return normalizeBaseUrl(envUrl) || DEFAULT_API_PATH_PREFIX;
}

export function buildApiUrl(path) {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function toJsonBody(body) {
  if (body === undefined || body === null) return undefined;
  return JSON.stringify(body);
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
export async function apiRequest(path, { method = 'GET', body, accessToken, signal } = {}) {
  const url = buildApiUrl(path);

  const headers = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const fetchOptions = {
    method,
    headers,
    signal,
  };

  if (body !== undefined && body !== null) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const text = await response.text().catch(() => '');
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
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