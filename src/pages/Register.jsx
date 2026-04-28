import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext.jsx'

export default function Register() {
  const navigate = useNavigate()
  const { register, authError, isLoading } = useContext(AuthContext)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [formError, setFormError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) return setFormError('Name is required')
    if (!email.trim()) return setFormError('Email is required')
    if (!phone.trim()) return setFormError('Phone number is required')
    if (password.length < 8) return setFormError('Password must be at least 8 characters')
    if (password !== confirmPassword) return setFormError('Passwords do not match')

    try {
      await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, role: 'MEMBER' })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setFormError(err?.message || 'Registration failed')
    }
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
              Create your cooperative account
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
          Register
        </h1>
        <p style={{
          textAlign: 'center',
          color: 'var(--color-muted)',
          marginBottom: 32,
          fontSize: 15,
        }}>
          Join AYEDOS SACCO to access savings, loans, dividends, and cooperative oversight.
        </p>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="name" style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--color-text)',
            }}>
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email" style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--color-text)',
            }}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="phone" style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--color-text)',
            }}>
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="password" style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--color-text)',
            }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {(formError || authError) && (
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
              {formError || authError}
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
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>

          <p style={{
            marginTop: 20,
            textAlign: 'center',
            color: 'var(--color-muted)',
            fontSize: 14,
          }}>
            Already have an account?{' '}
            <a
              href="/login"
              style={{
                color: 'var(--color-accent)',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}