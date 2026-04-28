// Finance feature services - transactions, loans, shares, deductions
import { apiRequest, unwrapEnvelopeData } from '../../lib/apiClient'

// Transactions
export async function getAllTransactions(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/transactions?${queryParams}` : '/api/finance/transactions'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch transactions')
  return unwrapEnvelopeData(res.json)
}

export async function createTransaction(data, accessToken) {
  const res = await apiRequest('/api/finance/transactions', {
    method: 'POST',
    accessToken,
    body: data,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to create transaction')
  return unwrapEnvelopeData(res.json)
}

export async function voidTransaction(id, reason, accessToken) {
  const res = await apiRequest(`/api/finance/transactions/${id}/void`, {
    method: 'POST',
    accessToken,
    body: { reason },
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to void transaction')
  return unwrapEnvelopeData(res.json)
}

// Loans
export async function getAllLoans(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/loans?${queryParams}` : '/api/finance/loans'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch loans')
  return unwrapEnvelopeData(res.json)
}

export async function getLoanById(id, accessToken) {
  const res = await apiRequest(`/api/finance/loans/${id}`, {
    method: 'GET',
    accessToken,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch loan')
  return unwrapEnvelopeData(res.json)
}

export async function approveLoan(id, accessToken) {
  const res = await apiRequest(`/api/finance/loans/${id}/approve`, {
    method: 'POST',
    accessToken,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to approve loan')
  return unwrapEnvelopeData(res.json)
}

export async function rejectLoan(id, reason, accessToken) {
  const res = await apiRequest(`/api/finance/loans/${id}/reject`, {
    method: 'POST',
    accessToken,
    body: { reason },
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to reject loan')
  return unwrapEnvelopeData(res.json)
}

export async function disburseLoan(id, accessToken) {
  const res = await apiRequest(`/api/finance/loans/${id}/disburse`, {
    method: 'POST',
    accessToken,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to disburse loan')
  return unwrapEnvelopeData(res.json)
}

// Shares
export async function getAllShares(accessToken) {
  const res = await apiRequest('/api/finance/shares', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch shares')
  return unwrapEnvelopeData(res.json)
}

export async function getMemberShares(memberId, accessToken) {
  const res = await apiRequest(`/api/finance/shares/member/${memberId}`, {
    method: 'GET',
    accessToken,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch member shares')
  return unwrapEnvelopeData(res.json)
}

export async function purchaseShares(data, accessToken) {
  const res = await apiRequest('/api/finance/shares', {
    method: 'POST',
    accessToken,
    body: data,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to purchase shares')
  return unwrapEnvelopeData(res.json)
}

// Dividends
export async function getAllDividends(accessToken) {
  const res = await apiRequest('/api/finance/dividends', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch dividends')
  return unwrapEnvelopeData(res.json)
}

export async function declareDividend(data, accessToken) {
  const res = await apiRequest('/api/finance/dividends', {
    method: 'POST',
    accessToken,
    body: data,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to declare dividend')
  return unwrapEnvelopeData(res.json)
}

// Deductions
export async function getAllDeductions(accessToken) {
  const res = await apiRequest('/api/finance/deductions', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch deductions')
  return unwrapEnvelopeData(res.json)
}

export async function createDeduction(data, accessToken) {
  const res = await apiRequest('/api/finance/deductions', {
    method: 'POST',
    accessToken,
    body: data,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to create deduction')
  return unwrapEnvelopeData(res.json)
}

export async function updateDeduction(id, data, accessToken) {
  const res = await apiRequest(`/api/finance/deductions/${id}`, {
    method: 'PUT',
    accessToken,
    body: data,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to update deduction')
  return unwrapEnvelopeData(res.json)
}
