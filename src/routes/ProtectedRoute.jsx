import { Navigate, useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'
import { getDashboardPath, getPostLoginPath, isMemberOnboardingComplete, normalizeDashboardRole } from '../utils/dashboardRoutes.js'

export default function ProtectedRoute({ element, allowedRoles }) {
  const { user, accessToken, isLoading } = useContext(AuthContext)
  const location = useLocation()
  const userRole = normalizeDashboardRole(user?.role)
  const normalizedAllowedRoles = allowedRoles?.map(normalizeDashboardRole)
  const redirect = (to, state) => (
    location.pathname === to
      ? element
      : <Navigate to={to} replace state={state} />
  )

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #0d3554 100%)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          color: 'var(--color-white)',
        }}>
          <div style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ margin: 0, fontSize: 16 }}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!accessToken || !user) {
    return redirect('/login')
  }

  if (normalizedAllowedRoles?.length && !normalizedAllowedRoles.includes(userRole)) {
    return redirect(getPostLoginPath(user))
  }

  if (
    user.mustChangePassword &&
    location.pathname !== getDashboardPath(userRole, 'security')
  ) {
    return redirect(getDashboardPath(userRole, 'security'), { forcePasswordChange: true })
  }

  if (
    ['MEMBER', 'EMPLOYEE'].includes(userRole) &&
    !isMemberOnboardingComplete(user) &&
    location.pathname !== '/onboarding'
  ) {
    return redirect('/onboarding')
  }

  return element
}
