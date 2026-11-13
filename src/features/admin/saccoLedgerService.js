import { apiRequest, unwrapEnvelopeData } from '../../lib/apiClient'

export async function previewSaccoLedger(records, sourceFile, accessToken) {
  const res = await apiRequest('/api/admin/sacco-ledger/preview', { method: 'POST', accessToken, body: { records, sourceFile }, cache: false, retry: false })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to preview workbook')
  return unwrapEnvelopeData(res.json)
}

export async function commitSaccoLedger(records, sourceFile, accessToken) {
  const res = await apiRequest('/api/admin/sacco-ledger/commit', { method: 'POST', accessToken, body: { records, sourceFile }, cache: false, retry: false })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to import workbook')
  return unwrapEnvelopeData(res.json)
}

export async function getSaccoLedgerOverview(category, accessToken) {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  const res = await apiRequest(`/api/admin/sacco-ledger/overview${query}`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to load ledger overview')
  return unwrapEnvelopeData(res.json)
}
