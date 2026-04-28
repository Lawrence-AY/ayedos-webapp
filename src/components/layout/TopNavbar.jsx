import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext.jsx'

export default function TopNavbar() {
  const { user, logout } = useContext(AuthContext)

  async function handleLogout() {
    await logout()
    window.location.href = '/login'
  }

  return (
    <header className="topbar" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 20,
      padding: '28px 36px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
          flexShrink: 0,
        }}>
          A
        </div>
        <div>
          <p className="eyebrow" style={{ margin: 0, color: 'var(--color-muted)' }}>
            AYEDOS SACCO
          </p>
          <p style={{ margin: '2px 0 0', color: 'rgba(255, 255, 255, 0.72)', fontSize: 13 }}>
            Dashboard <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>({user?.role || 'MEMBER'})</span>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right', marginRight: 8 }}>
          <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: 0, fontSize: 15 }}>
            {user?.name || 'User'}
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, margin: 0 }}>
            {user?.email || ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            borderRadius: 14,
            border: 0,
            background: 'var(--color-secondary)',
            color: 'var(--color-white)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 300ms ease',
          }}
        >
          Log out
        </button>
      </div>
    </header>
  )
}
