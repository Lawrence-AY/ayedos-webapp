import './App.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import SetPassword from './pages/SetPassword.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Onboarding from './pages/Onboarding.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import FinanceDashboard from './pages/FinanceDashboard.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import DashboardRedirect from './routes/DashboardRedirect.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import PublicRoute from './routes/PublicRoute.jsx'

export default function App() {
  return (
    <AuthProvider> 
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute element={<DashboardRedirect />} />} />
          <Route path="/login" element={<PublicRoute element={<Login />} />} />
          <Route path="/register" element={<PublicRoute element={<Register />} />} />
          <Route path="/forgot-password" element={<PublicRoute element={<ForgotPassword />} />} />
          <Route path="/reset-password" element={<PublicRoute element={<ResetPassword />} />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute
                allowedRoles={['MEMBER']}
                element={<Onboarding />}
              />
            }
          />
          <Route path="/set-password" element={<PublicRoute element={<SetPassword />} />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute element={<DashboardRedirect />} />}
          />
          <Route
            path="/dashboard/admin/*"
            element={
              <ProtectedRoute
                allowedRoles={['ADMIN']}
                element={<AdminDashboard />}
              />
            }
          />
          <Route
            path="/dashboard/finance/*"
            element={
              <ProtectedRoute
                allowedRoles={['FINANCE']}
                element={<FinanceDashboard />}
              />
            }
          />
          <Route
            path="/dashboard/user/*"
            element={
              <ProtectedRoute
                allowedRoles={['MEMBER']}
                element={<UserDashboard />}
              />
            }
          />
          <Route
            path="/dashboard/*"
            element={<ProtectedRoute element={<DashboardRedirect />} />}
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
