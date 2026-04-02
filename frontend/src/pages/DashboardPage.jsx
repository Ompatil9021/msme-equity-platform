import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getKYCStatus, getPortfolio } from '../api'
import { useWallet } from '../WalletContext'

const formatINR = (value) => Number(value || 0).toLocaleString('en-IN')

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
  const totalShares = portfolio?.holdings?.reduce((sum, item) => sum + (item.tokensHeld || 0), 0) || 0
  const totalDividends = portfolio?.holdings?.reduce((sum, item) => sum + (item.dividendsReceived || 0), 0) || 0
  const portfolioValue = portfolio?.holdings?.reduce((sum, item) => sum + (item.currentValue || 0), 0) || 0

  const kycLabel = kycStatus?.kycStatus === 'approved'
    ? '✅ Approved'
    : kycStatus?.kycStatus === 'pending'
    ? '⏳ Pending'
    : '❌ Not submitted'

  return (
    <section>
      <div className="card">
        <h2>Investor Dashboard</h2>
        <p>See your portfolio, share ownership, dividends and token holdings.</p>

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
          <div className="section-grid" style={{ marginTop: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div className="card">
              <h3>Total companies</h3>
              <p style={{ fontSize: '2rem', marginTop: 14 }}>{totalInvestments}</p>
            </div>
            <div className="card">
              <h3>Total invested</h3>
              <p style={{ fontSize: '2rem', marginTop: 14 }}>₹{formatINR(totalInvested)}</p>
            </div>
            <div className="card">
              <h3>Total shares</h3>
              <p style={{ fontSize: '2rem', marginTop: 14 }}>{totalShares}</p>
            </div>
            <div className="card">
              <h3>Dividends received</h3>
              <p style={{ fontSize: '2rem', marginTop: 14 }}>₹{formatINR(totalDividends)}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h3>Portfolio value</h3>
            <p style={{ fontSize: '2rem', marginTop: 14 }}>₹{formatINR(portfolioValue)}</p>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h3>Your holdings</h3>
            {portfolio?.holdings?.length > 0 ? (
              <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
                {portfolio.holdings.map((holding) => {
                  const ownership = holding.ownershipPerToken
                    ? (holding.tokensHeld || 0) * holding.ownershipPerToken
                    : null
                  return (
                    <div key={holding.msmeId} style={{ padding: 16, background: 'rgba(148, 163, 184, 0.08)', borderRadius: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <strong>{holding.businessName || `MSME ${holding.msmeId}`}</strong>
                          <p style={{ margin: 4, color: '#94a3b8' }}>{holding.contractAddress || 'No token contract'}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p>{holding.tokensHeld} shares</p>
                          <small>₹{formatINR(holding.totalInvested)}</small>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                        <span>Ownership: <strong>{ownership != null ? `${ownership.toFixed(2)}%` : 'N/A'}</strong></span>
                        <span>Share price: ₹{formatINR(holding.tokenPrice)}</span>
                        <span>Investment value: ₹{formatINR(holding.currentValue || 0)}</span>
                        <span>1 share = {holding.ownershipPerToken?.toFixed(2) ?? '0.00'}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ marginTop: 16 }}>You do not have any share holdings yet.</p>
            )}
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h3>Integrity check</h3>
            <p>Token holdings are shown as shares, not just token counts.</p>
            <p>If on-chain data is available, it is verified against your portfolio records.</p>
          </div>
        </>
      )}
    </section>
  )
}
