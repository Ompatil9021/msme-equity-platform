import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import TopNav from './components/TopNav'
import HomePage from './pages/HomePage'
import ListingPage from './pages/ListingPage'
import DashboardPage from './pages/DashboardPage'
import OnboardPage from './pages/OnboardPage'
import RiskPage from './pages/RiskPage'
import KYCPage from './pages/KYCPage'
import MSMEDetailPage from './pages/MSMEDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminPage from './pages/AdminPage'
import { useAuth } from './AuthContext'
import './App.css'

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

function RequireRole({ allowedRoles, children }) {
  const { currentUser } = useAuth()

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  const { isAuthenticated, authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="app-shell">
        <TopNav />
        <main className="app-main">
          <div className="card">
            <h3>Loading session...</h3>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-main">
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
          />

          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/listings"
            element={
              <RequireAuth>
                <ListingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/listings/:msmeId"
            element={
              <RequireAuth>
                <MSMEDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={['investor', 'entrepreneur', 'admin']}>
                  <DashboardPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/onboard"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={['entrepreneur', 'admin']}>
                  <OnboardPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/kyc"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={['investor', 'admin']}>
                  <KYCPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/risk"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={['investor', 'entrepreneur', 'admin']}>
                  <RiskPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireRole allowedRoles={['admin']}>
                  <AdminPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
