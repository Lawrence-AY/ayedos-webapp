import { Navigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ element }) {
  const { user, accessToken, isLoading } = useContext(AuthContext)

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
    return <Navigate to="/login" replace />
  }

  return element
}
