import { Routes, Route } from 'react-router-dom'
import TopNav from './components/TopNav'
import HomePage from './pages/HomePage'
import ListingPage from './pages/ListingPage'
import DashboardPage from './pages/DashboardPage'
import OnboardPage from './pages/OnboardPage'
import RiskPage from './pages/RiskPage'
import KYCPage from './pages/KYCPage'
import MSMEDetailPage from './pages/MSMEDetailPage'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/listings" element={<ListingPage />} />
          <Route path="/listings/:msmeId" element={<MSMEDetailPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/onboard" element={<OnboardPage />} />
          <Route path="/kyc" element={<KYCPage />} />
          <Route path="/risk" element={<RiskPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
