// Admin feature services - member management, applications, audit, notifications, system settings
import { apiRequest, unwrapEnvelopeData } from '../../lib/apiClient'

// Users & Members
export async function getAllUsers(accessToken) {
  const res = await apiRequest('/api/admin/users', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch users')
  return unwrapEnvelopeData(res.json)
}

export async function getUserById(id, accessToken) {
  const res = await apiRequest(`/api/admin/users/${id}`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch user')
  return unwrapEnvelopeData(res.json)
}

export async function updateUserRole(id, role, accessToken) {
  const res = await apiRequest(`/api/admin/users/${id}/role`, { method: 'PUT', accessToken, body: { role } })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to update user role')
  return unwrapEnvelopeData(res.json)
}

export async function toggleUserStatus(id, active, accessToken) {
  const res = await apiRequest(`/api/admin/users/${id}/status`, { method: 'PUT', accessToken, body: { active } })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to update user status')
  return unwrapEnvelopeData(res.json)
}

export async function getArchivedMembers(accessToken) {
  const res = await apiRequest('/api/admin/members/archived', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch archived members')
  return unwrapEnvelopeData(res.json)
}

// Applications
export async function getAllApplications(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/admin/applications?${queryParams}` : '/api/admin/applications'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch applications')
  return unwrapEnvelopeData(res.json)
}

export async function reviewApplication(id, status, notes, accessToken) {
  const res = await apiRequest(`/api/admin/applications/${id}/review`, { method: 'POST', accessToken, body: { status, notes } })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to review application')
  return unwrapEnvelopeData(res.json)
}

// System Stats
export async function getSystemStats(accessToken) {
  const res = await apiRequest('/api/admin/stats', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch stats')
  return unwrapEnvelopeData(res.json)
}

// Member financial profile (read-only aggregate for admin drill-down)
export async function getMemberFinancialProfile(memberId, accessToken) {
  const res = await apiRequest(`/api/admin/members/${memberId}/full-profile`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch member profile')
  return unwrapEnvelopeData(res.json)
}

// Notifications - Admin engine
export async function getAdminNotifications(accessToken) {
  const res = await apiRequest('/api/admin/notifications', { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch notifications')
  return unwrapEnvelopeData(res.json)
}

export async function sendGlobalBroadcast(data, accessToken) {
  const res = await apiRequest('/api/admin/notifications/broadcast', { method: 'POST', accessToken, body: data })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to send broadcast')
  return unwrapEnvelopeData(res.json)
}

export async function sendDirectNotification(data, accessToken) {
  const res = await apiRequest('/api/admin/notifications/direct', { method: 'POST', accessToken, body: data })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to send notification')
  return unwrapEnvelopeData(res.json)
}

// Audit Logs
export async function getAuditLogs(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/admin/audit-logs?${queryParams}` : '/api/admin/audit-logs'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch audit logs')
  return unwrapEnvelopeData(res.json)
}

// Export
export async function exportTableCSV(tableName, filters, accessToken) {
  const queryParams = new URLSearchParams({ ...filters, format: 'csv' }).toString()
  const res = await apiRequest(`/api/admin/export/${tableName}?${queryParams}`, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to export data')
  return res
}

// Admin profile self-management
export async function updateAdminProfile(data, accessToken) {
  const res = await apiRequest('/api/admin/profile', { method: 'PUT', accessToken, body: data })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to update profile')
  return unwrapEnvelopeData(res.json)
}