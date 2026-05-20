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

export async function repayLoan(id, amount, accessToken) {
  const res = await apiRequest(`/api/member/loans/${id}/repay`, {
    method: 'POST',
    accessToken,
    body: { amount },
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to record loan repayment')
  return unwrapEnvelopeData(res.json)
}

export async function depositSavings(amount, accessToken) {
  const res = await apiRequest('/api/member/savings/deposit', {
    method: 'POST',
    accessToken,
    body: { amount },
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to record savings deposit')
  return unwrapEnvelopeData(res.json)
}

export async function initiateContribution(data, accessToken) {
  const res = await apiRequest('/api/member/contributions', {
    method: 'POST',
    accessToken,
    body: data,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to initiate contribution')
  return {
    ...unwrapEnvelopeData(res.json),
    message: res.json?.message,
  }
}

export async function getContributionStatus(transactionId, accessToken) {
  const res = await apiRequest(`/api/member/contributions/${transactionId}/status`, {
    method: 'GET',
    accessToken,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch contribution status')
  return {
    ...unwrapEnvelopeData(res.json),
    message: res.json?.message,
  }
}

export async function emailMemberReport(reportType, accessToken) {
  const res = await apiRequest('/api/member/reports/email', {
    method: 'POST',
    accessToken,
    body: { reportType },
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to email report')
  return unwrapEnvelopeData(res.json)
}
