import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { useParams } from 'react-router-dom'
import { fetchMSMEDetails, getKYCStatus, recordTransaction } from '../api'
import { useWallet } from '../WalletContext'

const tokenAbi = [
  'function getAvailableTokens(uint256) view returns (uint256)',
  'function buyTokens(uint256,uint256) payable',
  'function whitelisted(address) view returns (bool)',
]

const formatINR = (value) => Number(value || 0).toLocaleString('en-IN')
const formatPercent = (value) => Number(value || 0).toFixed(2)

export default function MSMEDetailPage() {
  const { msmeId } = useParams()
  const {
    account,
    provider,
    signer,
    chainId,
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

  // ── FIX 1: Simple contract address finder — no blocking logic ──
  const effectiveContractAddress = (() => {
    const candidates = [
      listing?.contractAddress,
      import.meta.env.VITE_CONTRACT_ADDRESS,
      import.meta.env.DEFAULT_CONTRACT_ADDRESS,
      '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    ]
    return (
      candidates.find(
        (addr) =>
          typeof addr === 'string' &&
          /^0x[a-fA-F0-9]{40}$/.test(addr.trim()) &&
          addr.trim() !== 'YOUR_CONTRACT_ADDRESS'
      )?.trim() || ''
    )
  })()

  const isContractReady = effectiveContractAddress.length === 42
  const contractUsageNote = listing?.contractAddress
    ? 'listing contract'
    : 'environment contract'

  // ── Load MSME listing from backend ──
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

  // ── FIX 2: KYC checks BOTH backend AND blockchain ──
  useEffect(() => {
    const checkKYC = async () => {
      if (!isConnected || !account || !isCorrectNetwork) return
      if (!effectiveContractAddress) return

      try {
        // Step 1 — check backend first
        const result = await getKYCStatus(account)
        if (result?.kycStatus === 'approved') {
          setKYCStatus({ kycStatus: 'approved' })
          return
        }

        // Step 2 — check blockchain directly
        const ethProvider = new ethers.BrowserProvider(window.ethereum)
        const contract = new ethers.Contract(
          effectiveContractAddress,
          ['function whitelisted(address) view returns (bool)'],
          ethProvider
        )
        const onChainApproved = await contract.whitelisted(account)
        console.log('On-chain KYC approved:', onChainApproved)

        if (onChainApproved) {
          setKYCStatus({ kycStatus: 'approved' })
        } else {
          setKYCStatus(result || { kycStatus: 'not_submitted' })
        }
      } catch (err) {
        console.error('KYC check error:', err)
        // Last resort — try contract only
        try {
          const ethProvider = new ethers.BrowserProvider(window.ethereum)
          const contract = new ethers.Contract(
            effectiveContractAddress,
            ['function whitelisted(address) view returns (bool)'],
            ethProvider
          )
          const approved = await contract.whitelisted(account)
          setKYCStatus({ kycStatus: approved ? 'approved' : 'not_submitted' })
        } catch {
          setKYCStatus({ kycStatus: 'not_submitted' })
        }
      }
    }
    checkKYC()
  }, [account, isConnected, isCorrectNetwork, effectiveContractAddress])

  const availableTokens = useMemo(() => {
    if (!listing) return 0
    return Math.max(0, (listing.tokensForSale || 0) - (listing.tokensSold || 0))
  }, [listing])

  const tokenPriceINR = listing?.tokenPrice || 0
  const tokenPriceMATIC = tokenPriceINR ? tokenPriceINR / 80 : 0
  const ownershipPerToken =
    listing?.ownershipPerToken ??
    (listing?.equityPercentage || 0) / (listing?.totalTokenSupply || 1)
  const maxQuantity = availableTokens

  const handleOpenModal = () => {
    setBuyError('')
    setPurchaseQuantity(1)
    setShowBuyModal(true)
  }

  const handleBuyConfirm = async () => {
    if (!listing) { setBuyError('Listing not loaded yet.'); return }
    if (!isMetaMaskInstalled) { setBuyError('MetaMask is required to buy tokens.'); return }
    if (!isConnected || !account) { setBuyError('Connect MetaMask before buying tokens.'); return }
    if (!isCorrectNetwork) { setBuyError('Switch MetaMask to the correct network.'); return }
    if (kycStatus?.kycStatus !== 'approved') { setBuyError('Investor KYC must be approved to buy tokens.'); return }
    if (!isContractReady) { setBuyError('Smart contract not configured. Check frontend/.env'); return }
    if (purchaseQuantity < 1 || purchaseQuantity > availableTokens) {
      setBuyError('Select a quantity within the available token limit.')
      return
    }

    try {
      setTxLoading(true)
      setBuyError('')

      const onChainId = Number(listing?.onChainId)
      if (!Number.isInteger(onChainId) || onChainId <= 0) {
        setBuyError('On-chain listing ID is missing for this MSME. Update backend listing metadata with a valid onChainId.')
        return
      }

      const contract = new ethers.Contract(
        effectiveContractAddress,
        tokenAbi,
        signer
      )

      // Check available tokens on-chain
      const availableOnChain = await contract.getAvailableTokens(onChainId)

      if (availableOnChain === 0n) {
        setBuyError('Sorry, this listing is sold out on-chain.')
        return
      }
      if (BigInt(purchaseQuantity) > availableOnChain) {
        setBuyError(`Only ${availableOnChain.toString()} tokens available on-chain.`)
        return
      }

      const totalCostMatic = ethers.parseEther(
        (tokenPriceMATIC * purchaseQuantity).toFixed(6)
      )
      const tx = await contract.buyTokens(onChainId, purchaseQuantity, {
        value: totalCostMatic,
      })
      const receipt = await tx.wait()

      await recordTransaction({
        txHash: receipt.hash,
        walletAddress: account,
        msmeId: listing.id || listing.msmeId,
        contractAddress: effectiveContractAddress,
        type: 'buy_tokens',
        amount: tokenPriceINR * purchaseQuantity,
        tokens: purchaseQuantity,
      })

      setTxStatus({ txHash: receipt.hash })
      setListing((prev) =>
        prev
          ? { ...prev, tokensSold: (prev.tokensSold || 0) + purchaseQuantity }
          : prev
      )
      setShowBuyModal(false)
    } catch (err) {
      console.error('Buy confirm error:', err)
      if (err.code === 'ACTION_REJECTED') {
        setBuyError('Transaction cancelled in MetaMask.')
      } else if (err.code === 'BAD_DATA' || String(err?.message || '').toLowerCase().includes('could not decode result data')) {
        setBuyError('Contract response could not be decoded. This usually means the contract address is wrong for this network or this listing has no valid on-chain mapping.')
      } else if (err.code === 'CALL_EXCEPTION') {
        setBuyError(
          `Contract rejected: ${err.reason || 'Check onChainId and MATIC amount'}`
        )
      } else {
        setBuyError(err?.reason || err?.shortMessage || err?.message || 'Transaction failed.')
      }
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
          {effectiveContractAddress && (
            <p>
              Contract: <strong>{effectiveContractAddress}</strong>{' '}
              <em>({contractUsageNote})</em>
            </p>
          )}
        </div>
      </div>

      <div
        className="section-grid"
        style={{
          marginTop: 24,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}
      >
        <div className="card">
          <h3>Investor purchase</h3>
          <p>Buy tokens with quantity controls and strict availability enforcement.</p>

          <div style={{ marginTop: 16 }}>
            {!isMetaMaskInstalled && (
              <p style={{ color: '#fbbf24' }}>MetaMask is required to buy tokens.</p>
            )}
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
            {isMetaMaskInstalled && isConnected && isCorrectNetwork && (
              <div style={{ marginTop: 12, color: '#a5f3fc' }}>
                Wallet: <strong>{truncateAddress(account)}</strong>
              </div>
            )}

            {/* ── FIX 3: Button uses isContractReady not isContractDeployed ── */}
            <button
              className="button-primary"
              type="button"
              onClick={handleOpenModal}
              disabled={
                !isConnected ||
                !isCorrectNetwork ||
                availableTokens === 0 ||
                !isContractReady
              }
              style={{ marginTop: 16 }}
            >
              {availableTokens === 0
                ? 'Sold Out'
                : !isContractReady
                ? 'Contract not ready'
                : 'Buy Tokens'}
            </button>

            {availableTokens === 0 && (
              <p style={{ marginTop: 12, color: '#f87171' }}>
                This offering is sold out.
              </p>
            )}

            {kycStatus && (
              <p style={{ marginTop: 12 }}>
                KYC status: <strong>{kycStatus.kycStatus}</strong>
              </p>
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
          <p>
            Transaction hash: <strong>{txStatus.txHash}</strong>
          </p>
        </div>
      )}

      {showBuyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.88)',
            padding: 20,
            overflowY: 'auto',
            zIndex: 50,
          }}
        >
          <div
            style={{
              maxWidth: 560,
              margin: '0 auto',
              background: '#0f172a',
              borderRadius: 20,
              padding: 24,
              color: '#f8fafc',
            }}
          >
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
                onChange={(e) =>
                  setPurchaseQuantity(
                    Math.min(Math.max(Number(e.target.value) || 1, 1), maxQuantity)
                  )
                }
                style={{ width: 80, textAlign: 'center' }}
              />
              <button
                className="button-secondary"
                type="button"
                onClick={() =>
                  setPurchaseQuantity(Math.min(purchaseQuantity + 1, maxQuantity))
                }
                disabled={purchaseQuantity >= maxQuantity}
              >
                +
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <p>You will pay: ₹{formatINR(tokenPriceINR * purchaseQuantity)}</p>
              <p>
                You will own:{' '}
                {formatPercent(purchaseQuantity * ownershipPerToken)}% of the company
              </p>
              <p>
                In MATIC:{' '}
                {((tokenPriceMATIC * purchaseQuantity) || 0).toFixed(4)} MATIC
              </p>
            </div>

            {buyError && (
              <p style={{ marginTop: 12, color: '#f87171' }}>{buyError}</p>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
              <button
                className="button-primary"
                type="button"
                onClick={handleBuyConfirm}
                disabled={
                  txLoading ||
                  purchaseQuantity < 1 ||
                  purchaseQuantity > maxQuantity
                }
              >
                {txLoading ? 'Processing...' : 'Confirm Purchase'}
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setShowBuyModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Listing data</h3>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(listing, null, 2)}
        </pre>
      </div>
    </section>
  )
}