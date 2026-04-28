// Member feature services - personal dashboard actions
import { apiRequest, unwrapEnvelopeData } from '../../lib/apiClient'

// Profile
export async function getMemberProfile(accessToken) {
  const res = await apiRequest('/api/member/profile', {
    method: 'GET',
    accessToken,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch profile')
  return unwrapEnvelopeData(res.json)
}

export async function updateMemberProfile(data, accessToken) {
  const res = await apiRequest('/api/member/profile', {
    method: 'PUT',
    accessToken,
    body: data,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to update profile')
  return unwrapEnvelopeData(res.json)
}

// Loan application (member)
export async function applyForLoan(data, accessToken) {
  const res = await apiRequest('/api/member/loans', {
    method: 'POST',
    accessToken,
    body: data,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to apply for loan')
  return unwrapEnvelopeData(res.json)
}

export async function getMyLoans(accessToken) {
  const res = await apiRequest('/api/member/loans', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch loans')
  return unwrapEnvelopeData(res.json)
}

export async function cancelLoanApplication(id, accessToken) {
  const res = await apiRequest(`/api/member/loans/${id}/cancel`, {
    method: 'POST',
    accessToken,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to cancel loan')
  return unwrapEnvelopeData(res.json)
}

// Shares
export async function getMyShares(accessToken) {
  const res = await apiRequest('/api/member/shares', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch shares')
  return unwrapEnvelopeData(res.json)
}

export async function buyShares(data, accessToken) {
  const res = await apiRequest('/api/member/shares', {
    method: 'POST',
    accessToken,
    body: data,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to buy shares')
  return unwrapEnvelopeData(res.json)
}

// Transactions - view my own transactions
export async function getMyTransactions(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/member/transactions?${queryParams}` : '/api/member/transactions'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch transactions')
  return unwrapEnvelopeData(res.json)
}

// Guarantors
export async function getMyGuarantees(accessToken) {
  const res = await apiRequest('/api/member/guarantees', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch guarantees')
  return unwrapEnvelopeData(res.json)
}
