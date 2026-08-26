import { apiRequest, unwrapEnvelopeData } from '../../lib/apiClient'

export async function getIdentityVerificationConfig(accessToken) {
  const res = await apiRequest('/api/applications/identity-verification/config', {
    method: 'GET',
    accessToken,
    cacheTtlMs: 60 * 1000,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Unable to load identity verification settings')
  return unwrapEnvelopeData(res.json)
}

export async function verifyIdentity(payload, accessToken) {
  const res = await apiRequest('/api/applications/identity-verification', {
    method: 'POST',
    accessToken,
    body: payload,
    cache: false,
    retry: false,
  })
  if (!res.ok) {
    const error = new Error(res.json?.message || 'Identity verification failed')
    error.status = res.status
    error.data = unwrapEnvelopeData(res.json)
    throw error
  }
  return unwrapEnvelopeData(res.json)
}
