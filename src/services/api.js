// Centralized API service for all backend communication
// This file wraps the low-level apiClient with higher-level service methods
// All API calls should go through these service functions

import { apiRequest, unwrapEnvelopeData } from '../lib/apiClient'

// Generic CRUD helpers
export async function fetchAll(endpoint, accessToken) {
  const res = await apiRequest(endpoint, { accessToken, method: 'GET' })
  if (!res.ok) throw new Error(res.json?.message || `Failed to fetch ${endpoint}`)
  return unwrapEnvelopeData(res.json)
}

export async function fetchById(endpoint, id, accessToken) {
  const res = await apiRequest(`${endpoint}/${id}`, { accessToken, method: 'GET' })
  if (!res.ok) throw new Error(res.json?.message || `Failed to fetch ${endpoint}/${id}`)
  return unwrapEnvelopeData(res.json)
}

export async function createItem(endpoint, data, accessToken) {
  const res = await apiRequest(endpoint, { accessToken, method: 'POST', body: data })
  if (!res.ok) throw new Error(res.json?.message || `Failed to create ${endpoint}`)
  return unwrapEnvelopeData(res.json)
}

export async function updateItem(endpoint, id, data, accessToken) {
  const res = await apiRequest(`${endpoint}/${id}`, { accessToken, method: 'PUT', body: data })
  if (!res.ok) throw new Error(res.json?.message || `Failed to update ${endpoint}/${id}`)
  return unwrapEnvelopeData(res.json)
}

export async function deleteItem(endpoint, id, accessToken) {
  const res = await apiRequest(`${endpoint}/${id}`, { accessToken, method: 'DELETE' })
  if (!res.ok) throw new Error(res.json?.message || `Failed to delete ${endpoint}/${id}`)
  return unwrapEnvelopeData(res.json)
}

// Specific service functions for SACCO domain

// Transactions
export async function getTransactions(accessToken) {
  return fetchAll('transactions', accessToken)
}

export async function getTransaction(id, accessToken) {
  return fetchById('transactions', id, accessToken)
}

// Loans
export async function getLoans(accessToken) {
  return fetchAll('loans', accessToken)
}

export async function getLoan(id, accessToken) {
  return fetchById('loans', id, accessToken)
}

export async function applyForLoan(data, accessToken) {
  return createItem('loans', data, accessToken)
}

export async function updateLoanApplication(id, data, accessToken) {
  return updateItem('loans', id, data, accessToken)
}

// Shares
export async function getShares(accessToken) {
  return fetchAll('shares', accessToken)
}

export async function purchaseShares(data, accessToken) {
  return createItem('shares', data, accessToken)
}

// Dividends
export async function getDividends(accessToken) {
  return fetchAll('dividends', accessToken)
}

// Membership Applications (Admin/Finance)
export async function getApplications(accessToken) {
  return fetchAll('applications', accessToken)
}

export async function getApplication(id, accessToken) {
  return fetchById('applications', id, accessToken)
}

export async function reviewApplication(id, status, notes, accessToken) {
  return updateItem('applications', id, { status, notes }, accessToken)
}

// Deductions (Finance/Admin)
export async function getDeductions(accessToken) {
  return fetchAll('deductions', accessToken)
}

export async function createDeduction(data, accessToken) {
  return createItem('deductions', data, accessToken)
}
