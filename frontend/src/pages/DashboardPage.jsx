import { useState } from 'react'
import { getKYCStatus, getPortfolio } from '../api'

export default function DashboardPage() {
  const [wallet, setWallet] = useState('')
  const [kycStatus, setKYCStatus] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLookup = async () => {
    setError('')
    setKYCStatus(null)
    setPortfolio(null)

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setError('Enter a valid Ethereum wallet address.')
      return
    }

    try {
      setLoading(true)
      const [kyc, portfolioData] = await Promise.all([getKYCStatus(wallet), getPortfolio(wallet)])
      setKYCStatus(kyc)
      setPortfolio(portfolioData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="card">
        <h2>Investor Dashboard</h2>
        <p>Connect your wallet to check mock KYC status and portfolio holdings stored by the backend.</p>
        <div className="form-grid" style={{ marginTop: 20, gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
          <label>
            Wallet address
            <input
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              placeholder="0x..."
            />
          </label>
          <button className="button-primary" type="button" onClick={handleLookup} disabled={loading}>
            {loading ? 'Checking...' : 'Load portfolio'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 24, borderColor: '#f87171' }}>
          <p>{error}</p>
        </div>
      )}

      {kycStatus && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>KYC status</h3>
          <p>
            Wallet: <strong>{kycStatus.walletAddress}</strong>
          </p>
          <p>
            Status: <strong>{kycStatus.kycStatus}</strong>
          </p>
        </div>
      )}

      {portfolio && (
        <>
          <div className="section-grid" style={{ marginTop: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div className="card">
              <h3>Total investments</h3>
              <p style={{ fontSize: '2rem', marginTop: 14 }}>{portfolio.totalInvestments}</p>
            </div>
            <div className="card">
              <h3>Transactions</h3>
              <p style={{ fontSize: '2rem', marginTop: 14 }}>{portfolio.allTransactions.length}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h3>Holdings</h3>
            {portfolio.holdings.length > 0 ? (
              <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                {portfolio.holdings.map((holding) => (
                  <div key={holding.msmeId} style={{ display: 'grid', gap: 8, padding: 16, background: 'rgba(148, 163, 184, 0.08)', borderRadius: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <div>
                        <strong>{holding.msmeId}</strong>
                        <p style={{ margin: 4, color: '#94a3b8' }}>{holding.contractAddress || 'No token deployed yet'}</p>
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
