import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setPassword as setPasswordApi } from '../services/authService'

export default function SetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPasswordField] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Invalid or missing token. Please request a new password reset link.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      await setPasswordApi({ token, newPassword: password })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2500)
    } catch (err) {
      setError(err?.message || 'Failed to set password')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token && !success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #0d3554 100%)',
        padding: '20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--color-white)',
          borderRadius: 24,
          padding: 40,
          boxShadow: '0 24px 60px rgba(15, 34, 58, 0.2)',
          textAlign: 'center',
        }}>
          <h2 style={{ color: 'var(--color-text)', marginBottom: 16 }}>
            Invalid Link
          </h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: 24 }}>
            The password reset link is invalid or has expired.
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: 14,
              background: 'var(--color-secondary)',
              color: 'var(--color-white)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Back to Login
          </a>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #0d3554 100%)',
        padding: '20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--color-white)',
          borderRadius: 24,
          padding: 40,
          boxShadow: '0 24px 60px rgba(15, 34, 58, 0.2)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto 24px',
            borderRadius: 20,
            background: 'var(--color-accent)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--color-primary)',
            fontSize: 32,
          }}>
            ✓
          </div>
          <h2 style={{ color: 'var(--color-text)', marginBottom: 8 }}>
            Password Set!
          </h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: 24 }}>
            Your password has been successfully set. Redirecting you to login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--color-primary) 0%, #0d3554 100%)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'var(--color-white)',
        borderRadius: 24,
        padding: 40,
        boxShadow: '0 24px 60px rgba(15, 34, 58, 0.2)',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          marginBottom: 32,
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            color: 'var(--color-white)',
            fontWeight: 700,
            fontSize: 20,
            boxShadow: '0 18px 34px rgba(10, 42, 67, 0.22)',
          }}>
            A
          </div>
          <div>
            <p style={{
              margin: 0,
              color: 'var(--color-primary)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.12,
              textTransform: 'uppercase',
            }}>
              AYEDOS SACCO
            </p>
            <p style={{ margin: '2px 0 0', color: 'var(--color-muted)', fontSize: 14 }}>
              Set your password
            </p>
          </div>
        </div>

        <h1 style={{
          textAlign: 'center',
          fontSize: 28,
          fontWeight: 600,
          color: 'var(--color-text)',
          marginBottom: 8,
        }}>
          Create password
        </h1>
        <p style={{
          textAlign: 'center',
          color: 'var(--color-muted)',
          marginBottom: 32,
          fontSize: 15,
        }}>
          Your password must be at least 8 characters long.
        </p>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="password" style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--color-text)',
            }}>
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPasswordField(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                fontSize: 16,
                transition: 'all 300ms ease',
                background: 'white',
                color: 'var(--color-text)',
              }}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="confirmPassword" style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--color-text)',
            }}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                fontSize: 16,
                transition: 'all 300ms ease',
                background: 'white',
                color: 'var(--color-text)',
              }}
              required
            />
          </div>

          {error && (
            <div role="alert" style={{
              marginBottom: 20,
              padding: 12,
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontWeight: 600,
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 14,
              border: 0,
              background: 'var(--color-secondary)',
              color: 'var(--color-white)',
              fontWeight: 700,
              fontSize: 16,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 300ms ease',
            }}
          >
            {isLoading ? 'Setting password...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  )
}