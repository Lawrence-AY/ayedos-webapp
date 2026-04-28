import { NavLink } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext.jsx'

const navItems = {
  ADMIN: [
    { label: 'Overview', to: '/dashboard', exact: true },
    { label: 'Members', to: '/dashboard/members' },
    { label: 'Applications', to: '/dashboard/applications' },
    { label: 'Loans', to: '/dashboard/loans' },
    { label: 'Shares', to: '/dashboard/shares' },
    { label: 'Deductions', to: '/dashboard/deductions' },
    { label: 'Settings', to: '/dashboard/settings' },
  ],
  FINANCE: [
    { label: 'Overview', to: '/dashboard', exact: true },
    { label: 'Transactions', to: '/dashboard/transactions' },
    { label: 'Loans', to: '/dashboard/loans' },
    { label: 'Shares', to: '/dashboard/shares' },
    { label: 'Dividends', to: '/dashboard/dividends' },
    { label: 'Deductions', to: '/dashboard/deductions' },
  ],
  MEMBER: [
    { label: 'Overview', to: '/dashboard', exact: true },
    { label: 'My Loans', to: '/dashboard/loans' },
    { label: 'My Shares', to: '/dashboard/shares' },
    { label: 'Transactions', to: '/dashboard/transactions' },
    { label: 'Guarantees', to: '/dashboard/guarantees' },
    { label: 'Profile', to: '/dashboard/profile' },
  ],
}

export default function Sidebar() {
  const { user } = useContext(AuthContext)
  const role = user?.role || 'MEMBER'
  const items = navItems[role] || navItems.MEMBER

  return (
    <aside className="sidebar" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 8,
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
          flexShrink: 0,
        }}>
          A
        </div>
        <div>
          <p className="eyebrow" style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>
            AYEDOS SACCO
          </p>
          <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: 500 }}>
            {role === 'ADMIN' ? 'Administrator' : role === 'FINANCE' ? 'Finance Officer' : 'Member Portal'}
          </p>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              borderRadius: 14,
              color: isActive ? 'var(--color-white)' : 'rgba(255, 255, 255, 0.82)',
              background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
              fontWeight: isActive ? 700 : 400,
              textDecoration: 'none',
              fontSize: 15,
              transition: 'all 180ms ease',
              borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
              paddingLeft: isActive ? 13 : 16,
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{
        marginTop: 'auto',
        padding: 18,
        borderRadius: 18,
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
          © 2024 AYEDOS SACCO
        </p>
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
          v1.0.0
        </p>
      </div>
    </aside>
  )
}
