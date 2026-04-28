// Admin feature services - member management, applications, system settings
import { apiRequest, unwrapEnvelopeData } from '../../lib/apiClient'

export async function getAllUsers(accessToken) {
  const res = await apiRequest('/api/admin/users', {
    method: 'GET',
    accessToken,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch users')
  return unwrapEnvelopeData(res.json)
}

export async function getUserById(id, accessToken) {
  const res = await apiRequest(`/api/admin/users/${id}`, {
    method: 'GET',
    accessToken,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch user')
  return unwrapEnvelopeData(res.json)
}

export async function updateUserRole(id, role, accessToken) {
  const res = await apiRequest(`/api/admin/users/${id}/role`, {
    method: 'PUT',
    accessToken,
    body: { role },
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to update user role')
  return unwrapEnvelopeData(res.json)
}

export async function toggleUserStatus(id, active, accessToken) {
  const res = await apiRequest(`/api/admin/users/${id}/status`, {
    method: 'PUT',
    accessToken,
    body: { active },
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to update user status')
  return unwrapEnvelopeData(res.json)
}

export async function getAllApplications(accessToken, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  const url = queryParams ? `/api/admin/applications?${queryParams}` : '/api/admin/applications'
  const res = await apiRequest(url, { method: 'GET', accessToken })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch applications')
  return unwrapEnvelopeData(res.json)
}

export async function reviewApplication(id, status, notes, accessToken) {
  const res = await apiRequest(`/api/admin/applications/${id}/review`, {
    method: 'POST',
    accessToken,
    body: { status, notes },
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to review application')
  return unwrapEnvelopeData(res.json)
}

export async function getSystemStats(accessToken) {
  const res = await apiRequest('/api/admin/stats', {
    method: 'GET',
    accessToken,
  })
  if (!res.ok) throw new Error(res.json?.message || 'Failed to fetch stats')
  return unwrapEnvelopeData(res.json)
}
