import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchMSMEDetails, getKYCStatus, recordTransaction } from '../api'
import { useWallet } from '../WalletContext'

const makeFakeTxHash = () => `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}`

export default function MSMEDetailPage() {
  const { msmeId } = useParams()
  const {
    account,
    isMetaMaskInstalled,
    isConnected,
    isCorrectNetwork,
    connectWallet,
    switchNetwork,
    truncateAddress,
  } = useWallet()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState(1000)
  const [tokens, setTokens] = useState(0)
  const [kycStatus, setKYCStatus] = useState(null)
  const [txStatus, setTxStatus] = useState(null)
  const [txLoading, setTxLoading] = useState(false)

  useEffect(() => {
    const loadListing = async () => {
      try {
        setLoading(true)
        const data = await fetchMSMEDetails(msmeId)
        setListing(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadListing()
  }, [msmeId])

  useEffect(() => {
    const checkKYC = async () => {
      if (!isConnected || !account || !isCorrectNetwork) return
      try {
        const result = await getKYCStatus(account)
        setKYCStatus(result)
      } catch (err) {
        setError(err.message)
      }
    }
    checkKYC()
  }, [account, isConnected, isCorrectNetwork])

  const handleCheckKYC = async () => {
    if (!isMetaMaskInstalled) {
      setError('Please install MetaMask to check KYC status.')
      return
    }
    if (!isConnected || !account) {
      setError('Connect MetaMask to check your KYC status.')
      return
    }
    if (!isCorrectNetwork) {
      setError('Switch MetaMask to the correct network to check KYC status.')
      return
    }

    try {
      setError('')
      const result = await getKYCStatus(account)
      setKYCStatus(result)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleInvest = async (event) => {
    event.preventDefault()
    if (!isMetaMaskInstalled) {
      setError('Please install MetaMask to invest.')
      return
    }
    if (!isConnected || !account) {
      setError('Connect MetaMask before investing.')
      return
    }
    if (!isCorrectNetwork) {
      setError('Switch MetaMask to the correct network to invest.')
      return
    }
    if (kycStatus?.kycStatus !== 'approved') {
      setError('Investor KYC must be approved before investing.')
      return
    }
    if (!listing) {
      setError('Listing not loaded yet.')
      return
    }

    try {
      setTxLoading(true)
      setError('')
      const result = await recordTransaction({
        txHash: makeFakeTxHash(),
        walletAddress: account,
        msmeId: listing.id || listing.msmeId,
        contractAddress: listing.contractAddress || '',
        type: 'buy_tokens',
        amount,
        tokens: tokens || Math.max(1, Math.round(amount / 100)),
      })
      setTxStatus(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setTxLoading(false)
    }
  }

  if (loading) {
    return (
      <section>
        <div className="card">
          <h2>Loading MSME details...</h2>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <div className="card" style={{ borderColor: '#f87171' }}>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="card">
        <h2>{listing.businessName}</h2>
        <p>{listing.businessDescription}</p>
        <div className="badge" style={{ marginTop: 16 }}>
          <span>{listing.category}</span>
          <span>{listing.city}</span>
          <span>{listing.foundingYear} founded</span>
          <span>{listing.status}</span>
        </div>
        <div style={{ marginTop: 18 }}>
          <p>Target raise: ₹{listing.targetAmount?.toLocaleString()}</p>
          <p>Equity offered: {listing.equityPercentage}%</p>
          <p>Founder wallet: <strong>{listing.founderWallet}</strong></p>
          {listing.contractAddress && (
            <p>Contract: <strong>{listing.contractAddress}</strong></p>
          )}
        </div>
      </div>

      <div className="section-grid" style={{ marginTop: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="card">
          <h3>Investor flow</h3>
          <p>Use your connected MetaMask wallet to confirm KYC and record a mock investment.</p>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
            <p>
              Wallet: <strong>{account ? truncateAddress(account) : 'Not connected'}</strong>
            </p>
            {!isMetaMaskInstalled && (
              <a href="https://metamask.io/download.html" target="_blank" rel="noreferrer" className="button-secondary">
                Install MetaMask
              </a>
            )}
            {!isMetaMaskInstalled && <p style={{ marginTop: 10, color: '#fbbf24' }}>MetaMask is required to invest.</p>}
            {isMetaMaskInstalled && !isConnected && (
              <button className="button-secondary" type="button" onClick={connectWallet}>
                Connect MetaMask
              </button>
            )}
            {isMetaMaskInstalled && isConnected && !isCorrectNetwork && (
              <button className="button-secondary" type="button" onClick={switchNetwork}>
                Switch Network
              </button>
            )}
            <button className="button-secondary" type="button" onClick={handleCheckKYC} disabled={!isConnected || !isCorrectNetwork || txLoading}>
              Check KYC status
            </button>
            {kycStatus && (
              <div style={{ marginTop: 8 }}>
                <p>Status: <strong>{kycStatus.kycStatus}</strong></p>
                {kycStatus.walletAddress && <p>Wallet: <strong>{truncateAddress(kycStatus.walletAddress)}</strong></p>}
              </div>
            )}
            <label>
              Investment amount (₹)
              <input type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} min="100" />
            </label>
            <label>
              Token count
              <input type="number" value={tokens} onChange={(event) => setTokens(Number(event.target.value))} placeholder="Auto if blank" />
            </label>
            <button className="button-primary" type="button" onClick={handleInvest} disabled={txLoading || !isConnected || !isCorrectNetwork}>
              {txLoading ? 'Processing...' : 'Record investment'}
            </button>
          </div>
          {txStatus && (
            <div style={{ marginTop: 18, color: '#86efac' }}>
              <p>Investment recorded.</p>
              <p>Transaction hash: <strong>{txStatus.txHash}</strong></p>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Entrepreneur summary</h3>
          <p>Founder name: <strong>{listing.founderName}</strong></p>
          <p>Founder wallet: <strong>{listing.founderWallet}</strong></p>
          <p>Contact: <strong>{listing.contactEmail}</strong></p>
          <p>GST: <strong>{listing.gstNumber}</strong></p>
          <p>Annual revenue: ₹{listing.annualRevenue?.toLocaleString()}</p>
          <p>Employee count: {listing.employeeCount}</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Listing data</h3>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(listing, null, 2)}</pre>
      </div>
    </section>
  )
}
