import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { useParams } from 'react-router-dom'
import { fetchMSMEDetails, getKYCStatus, recordTransaction } from '../api'
import { useWallet } from '../WalletContext'

const tokenAbi = [
  'function getAvailableTokens(uint256) view returns (uint256)',
  'function buyTokens(uint256,uint256) payable',
]

const formatINR = (value) => Number(value || 0).toLocaleString('en-IN')
const formatPercent = (value) => Number(value || 0).toFixed(2)

export default function MSMEDetailPage() {
  const { msmeId } = useParams()
  const {
    account,
    signer,
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
  const [kycStatus, setKYCStatus] = useState(null)
  const [txStatus, setTxStatus] = useState(null)
  const [txLoading, setTxLoading] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [purchaseQuantity, setPurchaseQuantity] = useState(1)
  const [buyError, setBuyError] = useState('')

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

  const availableTokens = useMemo(() => {
    if (!listing) return 0
    return Math.max(0, (listing.tokensForSale || 0) - (listing.tokensSold || 0))
  }, [listing])

  const tokenPriceINR = listing?.tokenPrice || 0
  const tokenPriceMATIC = tokenPriceINR ? tokenPriceINR / 80 : 0
  const ownershipPerToken = listing?.ownershipPerToken ?? ((listing?.equityPercentage || 0) / (listing?.totalTokenSupply || 1))
  const maxQuantity = availableTokens

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

  const handleOpenModal = () => {
    setBuyError('')
    setPurchaseQuantity(1)
    setShowBuyModal(true)
  }

  const handleBuyConfirm = async () => {
    if (!listing) {
      setBuyError('Listing not loaded yet.')
      return
    }
    if (!isMetaMaskInstalled) {
      setBuyError('MetaMask is required to buy tokens.')
      return
    }
    if (!isConnected || !account) {
      setBuyError('Connect MetaMask before buying tokens.')
      return
    }
    if (!isCorrectNetwork) {
      setBuyError('Switch MetaMask to the correct network to buy tokens.')
      return
    }
    if (kycStatus?.kycStatus !== 'approved') {
      setBuyError('Investor KYC must be approved to buy tokens.')
      return
    }
    if (!listing.contractAddress) {
      setBuyError('Smart contract not connected for this MSME yet.')
      return
    }
    if (purchaseQuantity < 1 || purchaseQuantity > availableTokens) {
      setBuyError('Select a quantity within the available token limit.')
      return
    }

    try {
      setTxLoading(true)
      setBuyError('')

      const onChainId = listing.onChainId != null ? Number(listing.onChainId) : Number(listing.msmeId)
      if (!Number.isInteger(onChainId) || onChainId <= 0) {
        setBuyError('On-chain listing ID is missing or invalid.')
        return
      }

      const contract = new ethers.Contract(listing.contractAddress, tokenAbi, signer)
      const availableOnChain = await contract.getAvailableTokens(onChainId)

      if (availableOnChain === 0) {
        setBuyError('Sorry, this listing is sold out on-chain.')
        return
      }
      if (BigInt(purchaseQuantity) > availableOnChain) {
        setBuyError(`Only ${availableOnChain.toString()} tokens available on-chain.`)
        return
      }

      const totalCostMatic = ethers.parseEther((tokenPriceMATIC * purchaseQuantity).toString())
      const tx = await contract.buyTokens(onChainId, purchaseQuantity, { value: totalCostMatic })
      const receipt = await tx.wait()

      await recordTransaction({
        txHash: receipt.transactionHash,
        walletAddress: account,
        msmeId: listing.id || listing.msmeId,
        contractAddress: listing.contractAddress,
        type: 'buy_tokens',
        amount: tokenPriceINR * purchaseQuantity,
        tokens: purchaseQuantity,
      })

      setTxStatus({ txHash: receipt.transactionHash })
      setListing((prev) => prev ? { ...prev, tokensSold: (prev.tokensSold || 0) + purchaseQuantity } : prev)
      setShowBuyModal(false)
    } catch (err) {
      setBuyError(err?.message || 'Transaction failed.')
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
          <p>Company value: ₹{formatINR(listing.companyValuation)}</p>
          <p>Equity offered: {listing.equityPercentOffered || listing.equityPercentage}%</p>
          <p>Total tokens created: {listing.totalTokenSupply}</p>
          <p>Tokens for sale now: {listing.tokensForSale}</p>
          <p>Tokens sold: {listing.tokensSold}</p>
          <p>Token price: ₹{formatINR(listing.tokenPrice)} ({tokenPriceMATIC.toFixed(4)} MATIC)</p>
          <p>Ownership per token: {formatPercent(ownershipPerToken)}%</p>
          <p>Tokens remaining: {availableTokens}</p>
          {listing.contractAddress && <p>Contract: <strong>{listing.contractAddress}</strong></p>}
        </div>
      </div>

      <div className="section-grid" style={{ marginTop: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="card">
          <h3>Investor purchase</h3>
          <p>Buy tokens with quantity controls and strict availability enforcement.</p>
          <div style={{ marginTop: 16 }}>
            {!isMetaMaskInstalled && <p style={{ color: '#fbbf24' }}>MetaMask is required to buy tokens.</p>}
            {isMetaMaskInstalled && !isConnected && (
              <button className="button-secondary" type="button" onClick={connectWallet}>Connect MetaMask</button>
            )}
            {isMetaMaskInstalled && isConnected && !isCorrectNetwork && (
              <button className="button-secondary" type="button" onClick={switchNetwork}>Switch Network</button>
            )}
            {isMetaMaskInstalled && isConnected && isCorrectNetwork && (
              <div style={{ marginTop: 12, color: '#a5f3fc' }}>
                Wallet: <strong>{truncateAddress(account)}</strong>
              </div>
            )}
            <button
              className="button-primary"
              type="button"
              onClick={handleOpenModal}
              disabled={!isConnected || !isCorrectNetwork || availableTokens === 0}
              style={{ marginTop: 16 }}
            >
              {availableTokens === 0 ? 'Sold Out' : 'Buy Tokens'}
            </button>
            {availableTokens === 0 && <p style={{ marginTop: 12, color: '#f87171' }}>This offering is sold out.</p>}
            {kycStatus && (
              <p style={{ marginTop: 12 }}>KYC status: <strong>{kycStatus.kycStatus}</strong></p>
            )}
          </div>
          <div style={{ marginTop: 20 }}>
            <p>Token availability is enforced on both front-end and smart contract.</p>
          </div>
        </div>

        <div className="card">
          <h3>Entrepreneur summary</h3>
          <p>Founder name: <strong>{listing.founderName}</strong></p>
          <p>Founder wallet: <strong>{listing.founderWallet}</strong></p>
          <p>Contact: <strong>{listing.contactEmail}</strong></p>
          <p>GST: <strong>{listing.gstNumber}</strong></p>
          <p>Annual revenue: ₹{formatINR(listing.annualRevenue)}</p>
          <p>Employee count: {listing.employeeCount}</p>
        </div>
      </div>

      {txStatus && (
        <div className="card" style={{ marginTop: 24, color: '#86efac' }}>
          <h3>Purchase successful</h3>
          <p>Transaction hash: <strong>{txStatus.txHash}</strong></p>
        </div>
      )}

      {showBuyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.88)', padding: 20, overflowY: 'auto', zIndex: 50 }}>
          <div style={{ maxWidth: 560, margin: '0 auto', background: '#0f172a', borderRadius: 20, padding: 24, color: '#f8fafc' }}>
            <h3>Buy Tokens — {listing.businessName}</h3>
            <p>Token price: ₹{formatINR(tokenPriceINR)} ({tokenPriceMATIC.toFixed(4)} MATIC)</p>
            <p>Available: {availableTokens} token(s) remaining</p>
            <p>Ownership per token: {formatPercent(ownershipPerToken)}%</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                disabled={purchaseQuantity <= 1}
              >
                −
              </button>
              <input
                type="number"
                value={purchaseQuantity}
                min="1"
                max={maxQuantity}
                onChange={(event) => setPurchaseQuantity(Math.min(Math.max(Number(event.target.value) || 1, 1), maxQuantity))}
                style={{ width: 80, textAlign: 'center' }}
              />
              <button
                className="button-secondary"
                type="button"
                onClick={() => setPurchaseQuantity(Math.min(purchaseQuantity + 1, maxQuantity))}
                disabled={purchaseQuantity >= maxQuantity}
              >
                +
              </button>
            </div>
            <div style={{ marginTop: 16 }}>
              <p>You will pay: ₹{formatINR(tokenPriceINR * purchaseQuantity)}</p>
              <p>You will own: {formatPercent(purchaseQuantity * ownershipPerToken)}% of the company</p>
              <p>In MATIC: {((tokenPriceMATIC * purchaseQuantity) || 0).toFixed(4)} MATIC</p>
            </div>
            {buyError && <p style={{ marginTop: 12, color: '#f87171' }}>{buyError}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
              <button
                className="button-primary"
                type="button"
                onClick={handleBuyConfirm}
                disabled={txLoading || purchaseQuantity < 1 || purchaseQuantity > maxQuantity}
              >
                {txLoading ? 'Processing...' : 'Confirm Purchase'}
              </button>
              <button className="button-secondary" type="button" onClick={() => setShowBuyModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Listing data</h3>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(listing, null, 2)}</pre>
      </div>
    </section>
  )
}
