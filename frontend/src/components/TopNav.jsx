import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useWallet } from '../WalletContext'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const {
    account,
    isMetaMaskInstalled,
    isConnected,
    isCorrectNetwork,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    truncateAddress,
  } = useWallet()

  const renderWalletAction = () => {
    if (!isMetaMaskInstalled) {
      return (
        <a className="wallet-link" href="https://metamask.io/download.html" target="_blank" rel="noreferrer">
          Install MetaMask
        </a>
      )
    }

    if (!isConnected) {
      return (
        <button className="wallet-button" type="button" onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )
    }

    if (!isCorrectNetwork) {
      return (
        <button className="wallet-button warning" type="button" onClick={switchNetwork}>
          Switch to Mumbai
        </button>
      )
    }

    return (
      <div className="wallet-connected">
        <button
          className="wallet-button connected"
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {truncateAddress(account)}
        </button>
        {menuOpen && (
          <div className="wallet-dropdown">
            <button
              type="button"
              onClick={() => {
                disconnectWallet()
                setMenuOpen(false)
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

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
      <div className="wallet-actions">{renderWalletAction()}</div>
    </header>
  )
}
