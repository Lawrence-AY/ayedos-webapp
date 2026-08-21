// Finance feature services - comprehensive SACCO financial management
import { apiRequest, unwrapEnvelopeData } from '../../lib/apiClient'

// ============================================================
// TRANSACTIONS
// ============================================================
export async function getAllTransactions(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/transactions?${queryParams}` : '/api/finance/transactions'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch transactions')
  return unwrapEnvelopeData(res.json)
}

export async function getTransactionById(id, accessToken) {
  const res = await apiRequest(`/api/finance/transactions/${id}`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch transaction')
  return unwrapEnvelopeData(res.json)
}

export async function createTransaction(data, accessToken) {
  const res = await apiRequest('/api/finance/transactions', { method: 'POST', accessToken, body: data })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to create transaction')
  return unwrapEnvelopeData(res.json)
}

export async function voidTransaction(id, reason, accessToken) {
  const res = await apiRequest(`/api/finance/transactions/${id}/void`, { method: 'POST', accessToken, body: { reason } })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to void transaction')
  return unwrapEnvelopeData(res.json)
}

export async function verifyTransaction(id, accessToken) {
  const res = await apiRequest(`/api/finance/transactions/${id}/verify`, { method: 'POST', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to verify transaction')
  return unwrapEnvelopeData(res.json)
}

export async function getTransactionAuditLog(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/transactions/audit?${queryParams}` : '/api/finance/transactions/audit'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch audit log')
  return unwrapEnvelopeData(res.json)
}

// ============================================================
// LOANS - Full lifecycle management
// ============================================================
export async function getAllLoans(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/loans?${queryParams}` : '/api/finance/loans'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch loans')
  return unwrapEnvelopeData(res.json)
}

export async function getLoanById(id, accessToken) {
  const res = await apiRequest(`/api/finance/loans/${id}`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch loan')
  return unwrapEnvelopeData(res.json)
}

export async function approveLoan(id, accessToken) {
  const res = await apiRequest(`/api/finance/loans/${id}/approve`, {
    method: 'POST',
    accessToken,
    body: {},
    cache: false,
    timeoutMs: 60000,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to approve loan')
  return unwrapEnvelopeData(res.json)
}

export async function previewFinancialCsvImport(csv, accessToken) {
  const res = await apiRequest('/api/finance/financial-import/preview', {
    method: 'POST',
    accessToken,
    body: { csv },
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to preview financial import')
  return unwrapEnvelopeData(res.json)
}

export async function commitFinancialCsvImport(csv, accessToken) {
  const res = await apiRequest('/api/finance/financial-import/commit', {
    method: 'POST',
    accessToken,
    body: { csv },
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to import financial records')
  return unwrapEnvelopeData(res.json)
}

export async function rejectLoan(id, reason, accessToken) {
  const res = await apiRequest(`/api/finance/loans/${id}/reject`, { method: 'POST', accessToken, body: { reason }, cache: false, timeoutMs: 60000 })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to reject loan')
  return unwrapEnvelopeData(res.json)
}

export async function disburseLoan(id, accessToken) {
  const res = await apiRequest(`/api/finance/loans/${id}/disburse`, { method: 'POST', accessToken, cache: false, timeoutMs: 60000 })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to disburse loan')
  return unwrapEnvelopeData(res.json)
}

export async function writeOffLoan(id, reason, accessToken) {
  const res = await apiRequest(`/api/finance/loans/${id}/write-off`, { method: 'POST', accessToken, body: { reason } })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to write off loan')
  return unwrapEnvelopeData(res.json)
}

export async function getLoanArrears(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/loans/arrears?${queryParams}` : '/api/finance/loans/arrears'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch arrears')
  return unwrapEnvelopeData(res.json)
}

export async function getLoanRepaymentSchedule(id, accessToken) {
  const res = await apiRequest(`/api/finance/loans/${id}/schedule`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch repayment schedule')
  return unwrapEnvelopeData(res.json)
}

export async function getLoanStatistics(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/loans/statistics?${queryParams}` : '/api/finance/loans/statistics'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch loan statistics')
  return unwrapEnvelopeData(res.json)
}

// ============================================================
// SHARES
// ============================================================
export async function getAllShares(accessToken) {
  const res = await apiRequest('/api/finance/shares', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch shares')
  return unwrapEnvelopeData(res.json)
}

export async function getMemberShares(memberId, accessToken) {
  const res = await apiRequest(`/api/finance/shares/member/${memberId}`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch member shares')
  return unwrapEnvelopeData(res.json)
}

export async function purchaseShares(data, accessToken) {
  const res = await apiRequest('/api/finance/shares', { method: 'POST', accessToken, body: data })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to purchase shares')
  return unwrapEnvelopeData(res.json)
}

// ============================================================
// DIVIDENDS
// ============================================================
export async function getAllDividends(accessToken) {
  const res = await apiRequest('/api/finance/dividends', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch dividends')
  return unwrapEnvelopeData(res.json)
}

export async function declareDividend(data, accessToken) {
  const res = await apiRequest('/api/finance/dividends', { method: 'POST', accessToken, body: data })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to declare dividend')
  return unwrapEnvelopeData(res.json)
}

export async function getDividendHistory(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/dividends/history?${queryParams}` : '/api/finance/dividends/history'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch dividend history')
  return unwrapEnvelopeData(res.json)
}

// ============================================================
// DEDUCTIONS - Salary Deduction Module
// ============================================================
export async function getAllDeductions(accessToken) {
  const res = await apiRequest('/api/finance/deductions', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch deductions')
  return unwrapEnvelopeData(res.json)
}

export async function getDeductionsByCompany(companyId, accessToken) {
  const res = await apiRequest(`/api/finance/deductions/company/${companyId}`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch company deductions')
  return unwrapEnvelopeData(res.json)
}

export async function createDeduction(data, accessToken) {
  const res = await apiRequest('/api/finance/deductions', { method: 'POST', accessToken, body: data })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to create deduction')
  return unwrapEnvelopeData(res.json)
}

export async function updateDeduction(id, data, accessToken) {
  const res = await apiRequest(`/api/finance/deductions/${id}`, { method: 'PUT', accessToken, body: data })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to update deduction')
  return unwrapEnvelopeData(res.json)
}

export async function deleteDeduction(id, accessToken) {
  const res = await apiRequest(`/api/finance/deductions/${id}`, { method: 'DELETE', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to delete deduction')
  return unwrapEnvelopeData(res.json)
}

export async function getDeductionAuditLog(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/deductions/audit?${queryParams}` : '/api/finance/deductions/audit'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch deduction audit log')
  return unwrapEnvelopeData(res.json)
}

// ============================================================
// MEMBER PROFILES - Comprehensive financial profiles
// ============================================================
export async function getAllMembers(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/members?${queryParams}` : '/api/finance/members'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch members')
  return unwrapEnvelopeData(res.json)
}

export async function getMemberFinancialProfile(memberId, accessToken) {
  const res = await apiRequest(`/api/finance/members/${memberId}/profile`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch member profile')
  return unwrapEnvelopeData(res.json)
}

export async function searchMembers(query, accessToken) {
  const res = await apiRequest(`/api/finance/members/search?q=${encodeURIComponent(query)}`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to search members')
  return unwrapEnvelopeData(res.json)
}

export async function updateMemberEmployment(id, data, accessToken) {
  const res = await apiRequest(`/api/finance/members/${id}/employment`, { method: 'POST', accessToken, body: data })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to update member employment')
  return unwrapEnvelopeData(res.json)
}

export async function getMemberTransactionHistory(memberId, accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/members/${memberId}/transactions?${queryParams}` : `/api/finance/members/${memberId}/transactions`
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch member transactions')
  return unwrapEnvelopeData(res.json)
}

// ============================================================
// COMPANIES - Employer/Company management
// ============================================================
export async function getAllCompanies(accessToken) {
  const res = await apiRequest('/api/finance/companies', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch companies')
  return unwrapEnvelopeData(res.json)
}

export async function getCompanyMembers(companyId, accessToken) {
  const res = await apiRequest(`/api/finance/companies/${companyId}/members`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch company members')
  return unwrapEnvelopeData(res.json)
}

export async function createCompany(data, accessToken) {
  const res = await apiRequest('/api/finance/companies', { method: 'POST', accessToken, body: data })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to create company')
  return unwrapEnvelopeData(res.json)
}

// ============================================================
// FINANCIAL REPORTS - Analytics & time-series data
// ============================================================
export async function getFinancialReports(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/reports?${queryParams}` : '/api/finance/reports'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch reports')
  return unwrapEnvelopeData(res.json)
}

export async function getActiveGroupLoans(accessToken) {
  const res = await apiRequest('/api/finance/group-loans/active', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to load active group loans')
  return unwrapEnvelopeData(res.json)
}

export async function getGroupBorrowingOverview(accessToken) {
  const res = await apiRequest('/api/finance/group-borrowing', { method: 'GET', accessToken, cache: false })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to load group borrowing overview')
  return unwrapEnvelopeData(res.json)
}

export async function dismantleBorrowingGroup(groupId, accessToken) {
  const res = await apiRequest(`/api/finance/group-borrowing/${groupId}`, { method: 'DELETE', accessToken, cache: false, idempotencyKey: `dismantle-group:${groupId}` })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to dismantle borrowing group')
  return unwrapEnvelopeData(res.json)
}

export async function getFinancialAnalytics(accessToken, filters = {}) {
  const queryParams = new URLSearchParams({ ...filters, type: 'analytics' }).toString()
  const url = `/api/finance/reports/analytics?${queryParams}`
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch analytics')
  return unwrapEnvelopeData(res.json)
}

export async function getDashboardSummary(accessToken) {
  const res = await apiRequest('/api/finance/dashboard/summary', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch dashboard summary')
  return unwrapEnvelopeData(res.json)
}

export async function getRepaymentPerformance(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/finance/loans/repayment-performance?${queryParams}` : '/api/finance/loans/repayment-performance'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch repayment performance')
  return unwrapEnvelopeData(res.json)
}

export async function getFinanceNotifications(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/notifications?${queryParams}` : '/api/notifications'
  const res = await apiRequest(url, { method: 'GET', accessToken, cache: false })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch notifications')
  return unwrapEnvelopeData(res.json)
}

export async function markFinanceNotificationRead(id, accessToken) {
  const res = await apiRequest(`/api/notifications/${id}/read`, { method: 'POST', accessToken, cache: false })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to mark notification as read')
  return unwrapEnvelopeData(res.json)
}

export async function markAllFinanceNotificationsRead(accessToken) {
  const res = await apiRequest('/api/notifications/read-all', { method: 'POST', accessToken, cache: false })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to mark notifications as read')
  return unwrapEnvelopeData(res.json)
}

export async function sendFinanceNotification(data, accessToken) {
  const res = await apiRequest('/api/notifications/send', {
    method: 'POST',
    accessToken,
    body: data,
    cache: false,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to send notification')
  return unwrapEnvelopeData(res.json)
}
