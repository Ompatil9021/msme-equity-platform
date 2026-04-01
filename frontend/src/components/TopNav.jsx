import { NavLink } from 'react-router-dom'
import './TopNav.css'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Listings', to: '/listings' },
  { label: 'Investor Dashboard', to: '/dashboard' },
  { label: 'Investor KYC', to: '/kyc' },
  { label: 'Onboard MSME', to: '/onboard' },
  { label: 'Risk Scoring', to: '/risk' },
]

export default function TopNav() {
  return (
    <header className="topnav">
      <div className="brand">
        <div className="brand-mark">MSME</div>
        <div>
          <strong>Equity Platform</strong>
          <p>India-first MSME fractional equity marketplace</p>
        </div>
      </div>
      <nav className="nav-links">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
