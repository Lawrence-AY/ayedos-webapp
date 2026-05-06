import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import logo from '../assets/logo-light.png'
import DotSwarmCanvas from '../components/landing/DotTextCanvas.jsx'
import { resetPassword as resetPasswordApi } from '../services/authService'

const PASSWORD_RULES = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
  'One special character',
]

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!successMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      navigate('/login', { replace: true })
    }, 2500)

    return () => window.clearTimeout(timeoutId)
  }, [navigate, successMessage])

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError('Invalid or missing reset token. Please request a new reset link.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const response = await resetPasswordApi({ token, newPassword: password })
      setSuccessMessage(response?.message || 'Password reset successful. Redirecting to login...')
    } catch (err) {
      setError(err?.message || 'Unable to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <img
          src={logo}
          alt="Logo"
          style={{ height: 40, width: 'auto', objectFit: 'contain' }}
        />
      </div>

      <div style={titleStyle}>Choose a new password</div>
      <p style={descriptionStyle}>
        Set a strong password for your Ayedos account.
      </p>

      {!token && !successMessage ? (
        <div style={emptyStateStyle}>
          <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
            This reset link is missing a token or has been opened incorrectly.
          </p>
          <Link to="/forgot-password" style={{ ...linkStyle, marginTop: 18, display: 'inline-block' }}>
            Request a new link
          </Link>
        </div>
      ) : successMessage ? (
        <div role="status" style={successStyle}>
          {successMessage}
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="password" style={labelStyle}>New Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={inputStyle}
              placeholder="Create a strong password"
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              style={inputStyle}
              placeholder="Repeat your new password"
              required
            />
          </div>

          <div style={helperStyle}>
            {PASSWORD_RULES.join(' • ')}
          </div>

          {error && (
            <div role="alert" style={errorStyle}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...buttonStyle,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Resetting password...' : 'Reset password'}
          </button>

          <div style={footerTextStyle}>
            <Link to="/login" style={linkStyle}>Back to login</Link>
          </div>
        </form>
      )}
    </AuthShell>
  )
}

function AuthShell({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <DotSwarmCanvas textLine1="AYEDOS" textLine2="SACCO" color="#88cc63" />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 460,
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(4px)',
            borderRadius: 20,
            padding: '48px 40px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0,0,0,0.02)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

const titleStyle = {
  textAlign: 'center',
  fontSize: 24,
  fontWeight: 800,
  color: 'var(--color-primary, #1a202c)',
  marginBottom: 12,
}

const descriptionStyle = {
  margin: '0 0 28px',
  textAlign: 'center',
  color: '#64748b',
  fontSize: 14,
  lineHeight: 1.6,
}

const emptyStateStyle = {
  padding: 20,
  borderRadius: 14,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  textAlign: 'center',
}

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  fontWeight: 600,
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
  color: '#64748b',
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  fontSize: 15,
  background: '#f8fafc',
  color: '#1e293b',
  boxSizing: 'border-box',
}

const helperStyle = {
  marginBottom: 20,
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.6,
}

const buttonStyle = {
  width: '100%',
  padding: '16px 24px',
  borderRadius: 12,
  border: 0,
  background: 'var(--color-accent, #3b82f6)',
  color: 'white',
  fontWeight: 700,
  fontSize: 16,
  boxShadow: '0 4px 12px rgba(13, 184, 110, 0.25)',
}

const errorStyle = {
  marginBottom: 20,
  padding: 14,
  borderRadius: 12,
  background: '#fef2f2',
  border: '1px solid #fee2e2',
  color: '#b91c1c',
  fontWeight: 500,
  fontSize: 14,
}

const successStyle = {
  padding: 14,
  borderRadius: 12,
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
  color: '#166534',
  fontWeight: 500,
  fontSize: 14,
  textAlign: 'center',
}

const footerTextStyle = {
  marginTop: 24,
  textAlign: 'center',
  color: '#64748b',
  fontSize: 14,
}

const linkStyle = {
  color: 'var(--color-primary, #3b82f6)',
  fontWeight: 700,
  textDecoration: 'none',
}
