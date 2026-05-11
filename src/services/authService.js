// Authentication service - handles all auth-related API calls
import { apiRequest, unwrapEnvelopeData } from '../lib/apiClient'

const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  VERIFY_LOGIN_OTP: '/api/auth/login/verify-otp',
  REGISTER: '/api/auth/register',
  VERIFY_OTP: '/api/auth/verify-otp',
  RESEND_OTP: '/api/auth/resend-otp',
  LOGOUT: '/api/auth/logout',
  SET_PASSWORD: '/api/auth/set-password',
  REFRESH: '/api/auth/refresh',
  ME: '/api/users/me',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  CHANGE_PASSWORD: '/api/auth/change-password',
  SESSIONS: '/api/auth/sessions',
}

/**
 * Verify an email OTP. Validation, expiry, and account verification live on the backend.
 */
export async function verifyOtp({ email, otp }) {
  const res = await apiRequest(AUTH_ENDPOINTS.VERIFY_OTP, {
    method: 'POST',
    body: { email, otp },
  })

  if (!res.ok) {
    const error = res.json?.message || `OTP verification failed (status ${res.status})`
    throw new Error(error)
  }

  return {
    message: res.json?.message || 'Email verified successfully',
    data: unwrapEnvelopeData(res.json),
  }
}

/**
 * Ask the backend to generate and send a fresh OTP.
 */
export async function resendOtp(email) {
  const res = await apiRequest(AUTH_ENDPOINTS.RESEND_OTP, {
    method: 'POST',
    body: { email },
  })

  if (!res.ok) {
    const error = res.json?.message || `OTP resend failed (status ${res.status})`
    throw new Error(error)
  }

  return {
    message: res.json?.message || 'OTP resent successfully',
    data: unwrapEnvelopeData(res.json),
  }
}

/**
 * Authenticate user with email and password
 * @returns {Promise<{user, tokens}>}
 */
export async function login({ email, password }) {
  const res = await apiRequest(AUTH_ENDPOINTS.LOGIN, {
    method: 'POST',
    body: { email, password },
  })

  if (!res.ok) {
    const error = res.json?.message || `Login failed (status ${res.status})`
    throw new Error(error)
  }

  const data = unwrapEnvelopeData(res.json)
  return data // { user, tokens: { accessToken, refreshToken } }
}

/**
 * Register a new user (typically for membership application)
 * @returns {Promise<{user, tokens}>}
 */
export async function register({ name, email, password, phone, role }) {
  const res = await apiRequest(AUTH_ENDPOINTS.REGISTER, {
    method: 'POST',
    body: { name, email, password, phone, role },
  })

  if (!res.ok) {
    const error = res.json?.message || `Registration failed (status ${res.status})`
    throw new Error(error)
  }

  const data = unwrapEnvelopeData(res.json)
  return data // { user, tokens }
}

/**
 * Set password after registration/invitation (one-time use)
 * @param {string} token - One-time token from email
 * @param {string} newPassword - New password to set
 */
export async function setPassword({ token, newPassword }) {
  const res = await apiRequest(AUTH_ENDPOINTS.SET_PASSWORD, {
    method: 'POST',
    body: { token, newPassword },
  })

  if (!res.ok) {
    const error = res.json?.message || `Set password failed (status ${res.status})`
    throw new Error(error)
  }

  const data = unwrapEnvelopeData(res.json)
  return data // { success: true, message: 'Password set successfully' }
}

/**
 * Logout user and invalidate refresh token on server
 */
export async function logout(refreshToken, accessToken) {
  try {
    await apiRequest(AUTH_ENDPOINTS.LOGOUT, {
      method: 'POST',
      body: refreshToken ? { refreshToken } : undefined,
      accessToken: accessToken || undefined,
    })
  } catch {
    // logout should not throw - we clear local state anyway
  }
}

/**
 * Refresh access token using refresh token
 * @returns {Promise<{accessToken, refreshToken}>}
 */
export async function refreshTokens(refreshToken) {
  const res = await apiRequest(AUTH_ENDPOINTS.REFRESH, {
    method: 'POST',
    body: { refreshToken },
  })

  if (!res.ok) {
    throw new Error(`Token refresh failed (status ${res.status})`)
  }

  const data = unwrapEnvelopeData(res.json)
  return data // { accessToken, refreshToken }
}

/**
 * Get current user profile using access token
 * @returns {Promise<User>}
 */
export async function getCurrentUser(accessToken) {
  const res = await apiRequest(AUTH_ENDPOINTS.ME, {
    method: 'GET',
    accessToken,
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch user (status ${res.status})`)
  }

  const data = unwrapEnvelopeData(res.json)
  return data // User object with role, profile info
}

/**
 * Request password reset email
 */
export async function forgotPassword(email) {
  const res = await apiRequest(AUTH_ENDPOINTS.FORGOT_PASSWORD, {
    method: 'POST',
    body: { email },
  })

  if (!res.ok) {
    const error = res.json?.message || `Request failed (status ${res.status})`
    throw new Error(error)
  }

  return {
    message: res.json?.message || 'If an account with that email exists, a reset link will be sent shortly.',
    data: unwrapEnvelopeData(res.json),
  }
}

/**
 * Reset password with token from email
 */
export async function resetPassword({ token, newPassword }) {
  const res = await apiRequest(AUTH_ENDPOINTS.RESET_PASSWORD, {
    method: 'POST',
    body: { token, newPassword },
  })

  if (!res.ok) {
    const error = res.json?.message || `Reset failed (status ${res.status})`
    throw new Error(error)
  }

  return {
    message: res.json?.message || 'Password reset successful',
    data: unwrapEnvelopeData(res.json),
  }
}

export async function verifyLoginOtp({ email, otp }) {
  const res = await apiRequest(AUTH_ENDPOINTS.VERIFY_LOGIN_OTP, {
    method: 'POST',
    body: { email, otp },
  })

  if (!res.ok) {
    const error = res.json?.message || `Login OTP verification failed (status ${res.status})`
    throw new Error(error)
  }

  return unwrapEnvelopeData(res.json)
}

/**
 * Change password while authenticated.
 */
export async function changePassword({ currentPassword, newPassword }, accessToken) {
  const res = await apiRequest(AUTH_ENDPOINTS.CHANGE_PASSWORD, {
    method: 'POST',
    accessToken,
    body: { currentPassword, newPassword },
  })

  if (!res.ok) {
    const error = res.json?.message || `Change password failed (status ${res.status})`
    throw new Error(error)
  }

  return {
    message: res.json?.message || 'Password changed successfully',
    data: unwrapEnvelopeData(res.json),
  }
}

export async function getAuthSessions(accessToken) {
  const res = await apiRequest(AUTH_ENDPOINTS.SESSIONS, {
    method: 'GET',
    accessToken,
  })

  if (!res.ok) {
    const error = res.json?.message || `Failed to fetch sessions (status ${res.status})`
    throw new Error(error)
  }

  return unwrapEnvelopeData(res.json)
}

export async function revokeAuthSession(sessionId, accessToken) {
  const res = await apiRequest(`/api/auth/sessions/${sessionId}/revoke`, {
    method: 'POST',
    accessToken,
  })

  if (!res.ok) {
    const error = res.json?.message || `Failed to revoke session (status ${res.status})`
    throw new Error(error)
  }

  return unwrapEnvelopeData(res.json)
}
