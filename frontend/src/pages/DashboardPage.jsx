import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getKYCStatus, getPortfolio } from '../api'
import { useWallet } from '../WalletContext'

export default function DashboardPage() {
  const {
    account,
    isMetaMaskInstalled,
    isConnected,
    isCorrectNetwork,
    connectWallet,
    switchNetwork,
    truncateAddress,
  } = useWallet()
  const [kycStatus, setKYCStatus] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      if (!account || !isConnected || !isCorrectNetwork) return
      setLoading(true)
      setError('')
      setKYCStatus(null)
      setPortfolio(null)

      try {
        const [kyc, portfolioData] = await Promise.all([getKYCStatus(account), getPortfolio(account)])
        setKYCStatus(kyc)
        setPortfolio(portfolioData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [account, isConnected, isCorrectNetwork])

  const totalInvestments = portfolio?.allTransactions?.length || 0
  const totalInvested = portfolio?.holdings?.reduce((sum, item) => sum + (item.totalInvested || 0), 0) || 0
  const totalTokens = portfolio?.holdings?.reduce((sum, item) => sum + (item.tokensHeld || 0), 0) || 0
  const totalDividends = portfolio?.holdings?.reduce((sum, item) => sum + (item.dividendsReceived || 0), 0) || 0

  const kycLabel = kycStatus?.kycStatus === 'approved'
    ? '✅ Approved'
    : kycStatus?.kycStatus === 'pending'
    ? '⏳ Pending'
    : '❌ Not submitted'

  return (
    <section>
      <div className="card">
        <h2>Investor Dashboard</h2>
        <p>Use your connected wallet to see KYC status, investments, holdings, and dividends.</p>

        {!isMetaMaskInstalled && (
          <div style={{ marginTop: 16, color: '#fbbf24' }}>
            MetaMask is required. <a href="https://metamask.io/download.html" target="_blank" rel="noreferrer">Install MetaMask</a> and refresh.
          </div>
        )}

        {isMetaMaskInstalled && !isConnected && (
          <button className="button-secondary" type="button" onClick={connectWallet} style={{ marginTop: 16 }}>
            Connect MetaMask
          </button>
        )}

        {isMetaMaskInstalled && isConnected && !isCorrectNetwork && (
          <button className="button-secondary" type="button" onClick={switchNetwork} style={{ marginTop: 16 }}>
            Switch network
          </button>
        )}

        {isMetaMaskInstalled && isConnected && isCorrectNetwork && (
          <div style={{ marginTop: 16, color: '#a5f3fc' }}>
            Connected wallet: <strong>{truncateAddress(account)}</strong>
          </div>
        )}
      </div>

      {loading && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>Loading investor data...</h3>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginTop: 24, borderColor: '#f87171' }}>
          <p>{error}</p>
        </div>
      )}

      {!loading && isConnected && isCorrectNetwork && (
        <>
          <div className="card" style={{ marginTop: 24 }}>
            <h3>KYC status</h3>
            <p>{kycLabel}</p>
            {kycStatus?.walletAddress && <p>Wallet: <strong>{kycStatus.walletAddress}</strong></p>}
            {kycStatus?.kycStatus !== 'approved' && (
              <p>
                <Link to="/kyc" className="button-secondary">Complete KYC</Link>
              </p>
            )}
          </div>

          <div className="section-grid" style={{ marginTop: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div className="card">
              <h3>Total investments</h3>
              <p style={{ fontSize: '2rem', marginTop: 14 }}>{totalInvestments}</p>
            </div>
            <div className="card">
              <h3>Total invested</h3>
              <p style={{ fontSize: '2rem', marginTop: 14 }}>₹{totalInvested.toLocaleString()}</p>
            </div>
            <div className="card">
              <h3>Total tokens</h3>
              <p style={{ fontSize: '2rem', marginTop: 14 }}>{totalTokens}</p>
            </div>
            <div className="card">
              <h3>Dividends received</h3>
              <p style={{ fontSize: '2rem', marginTop: 14 }}>₹{totalDividends.toLocaleString()}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h3>Holdings</h3>
            {portfolio?.holdings?.length > 0 ? (
              <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                {portfolio.holdings.map((holding) => (
                  <div key={holding.msmeId} style={{ display: 'grid', gap: 10, padding: 16, background: 'rgba(148, 163, 184, 0.08)', borderRadius: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <strong>{holding.msmeId}</strong>
                        <p style={{ margin: 4, color: '#94a3b8' }}>{holding.contractAddress || 'No token contract'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p>{holding.tokensHeld} tokens</p>
                        <small>₹{holding.totalInvested.toLocaleString()} invested</small>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>Dividends: ₹{holding.dividendsReceived.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: 16 }}>No holdings found for this wallet yet.</p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
