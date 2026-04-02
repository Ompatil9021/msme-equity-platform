import { useEffect, useState } from 'react'
import { submitListing } from '../api'
import { useWallet } from '../WalletContext'

const initialState = {
  businessName: '',
  category: '',
  city: '',
  gstNumber: '',
  foundingYear: '',
  companyValuation: '',
  equityPercentOffered: '20',
  totalTokenSupply: '100',
  tokensForSale: '1',
  annualRevenue: '',
  employeeCount: '',
  businessDescription: '',
  founderName: '',
  contactEmail: '',
}

export default function OnboardPage() {
  const { account, isMetaMaskInstalled, isConnected, isCorrectNetwork, connectWallet, switchNetwork, truncateAddress } = useWallet()
  const [form, setForm] = useState(initialState)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const companyValuation = Number(form.companyValuation) || 0
  const equityPercentOffered = Number(form.equityPercentOffered) || 0
  const totalTokenSupply = Number(form.totalTokenSupply) || 100
  const tokensForSale = Number(form.tokensForSale) || 0
  const maxTokensForSale = totalTokenSupply && equityPercentOffered ? Math.max(1, Math.floor(totalTokenSupply * equityPercentOffered / 100)) : 1
  const targetAmount = Math.round(companyValuation * equityPercentOffered / 100)
  const tokenPrice = totalTokenSupply ? targetAmount / totalTokenSupply : 0
  const totalRaiseNow = tokensForSale * tokenPrice
  const ownershipPerToken = totalTokenSupply ? equityPercentOffered / totalTokenSupply : 0
  const founderTokens = Math.max(0, totalTokenSupply - tokensForSale)
  const maxInvestorOwnership = tokensForSale * ownershipPerToken

  useEffect(() => {
    if (tokensForSale > maxTokensForSale) {
      setForm((prev) => ({ ...prev, tokensForSale: String(maxTokensForSale) }))
    }
  }, [maxTokensForSale, tokensForSale])

  const handleChange = (event) => {
    const { name, value } = event.target
    if (name === 'tokensForSale') {
      const sanitized = Math.max(1, Math.min(Number(value) || 1, maxTokensForSale))
      setForm((prev) => ({ ...prev, [name]: String(sanitized) }))
      return
    }

    if (name === 'totalTokenSupply') {
      const sanitized = Math.max(10, Math.min(Number(value) || 10, 10000))
      setForm((prev) => ({ ...prev, [name]: String(sanitized) }))
      return
    }

    if (name === 'equityPercentOffered') {
      const sanitized = Math.max(1, Math.min(Number(value) || 1, 20))
      setForm((prev) => ({ ...prev, [name]: String(sanitized) }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setStatus(null)
    setLoading(true)

    if (!isMetaMaskInstalled) {
      setError('Please install MetaMask to onboard your MSME.')
      setLoading(false)
      return
    }

    if (!isConnected || !account) {
      setError('Please connect MetaMask before submitting your business.')
      setLoading(false)
      return
    }

    if (!isCorrectNetwork) {
      setError('Please switch MetaMask to the correct network before submitting.')
      setLoading(false)
      return
    }

    if (!form.businessName.trim()) {
      setError('Enter the business name.')
      setLoading(false)
      return
    }

    if (!form.category) {
      setError('Select a valid category.')
      setLoading(false)
      return
    }

    if (companyValuation < 100000) {
      setError('Company valuation must be at least ₹1,00,000.')
      setLoading(false)
      return
    }

    if (equityPercentOffered < 1 || equityPercentOffered > 20) {
      setError('Equity offered must be between 1% and 20%.')
      setLoading(false)
      return
    }

    if (totalTokenSupply < 10 || totalTokenSupply > 10000) {
      setError('Total tokens must be between 10 and 10,000.')
      setLoading(false)
      return
    }

    if (tokensForSale < 1 || tokensForSale > maxTokensForSale) {
      setError(`Tokens for sale must be between 1 and ${maxTokensForSale}.`)
      setLoading(false)
      return
    }

    if (!form.city.trim()) {
      setError('Enter the city where your business operates.')
      setLoading(false)
      return
    }

    try {
      const payload = {
        businessName: form.businessName.trim(),
        category: form.category,
        city: form.city.trim(),
        gstNumber: form.gstNumber.trim(),
        foundingYear: parseInt(form.foundingYear, 10) || undefined,
        companyValuation: companyValuation,
        equityPercentOffered: equityPercentOffered,
        totalTokenSupply: totalTokenSupply,
        tokensForSale: tokensForSale,
        targetAmount: targetAmount,
        tokenPrice: Math.round(tokenPrice),
        ownershipPerToken: Number(ownershipPerToken.toFixed(4)),
        founderTokens,
        tokensSold: 0,
        vestingEnd: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        annualRevenue: parseFloat(form.annualRevenue) || 0,
        employeeCount: parseInt(form.employeeCount, 10) || 0,
        businessDescription: form.businessDescription.trim(),
        founderWallet: account,
        founderName: form.founderName.trim(),
        contactEmail: form.contactEmail.trim(),
        equityPercentage: equityPercentOffered,
      }

      const result = await submitListing(payload)
      setStatus(result)
      setForm(initialState)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formattedValue = (value) => Number(value || 0).toLocaleString('en-IN')

  return (
    <section>
      <div className="card">
        <h2>MSME Business Listing & Onboarding</h2>
        <p>Register your business, token economics, and fundraising terms on the platform.</p>
        <div style={{ marginTop: 16 }}>
          {!isMetaMaskInstalled ? (
            <div style={{ color: '#fbbf24' }}>MetaMask is required for onboarding. Install it and refresh.</div>
          ) : !isConnected ? (
            <button className="button-secondary" type="button" onClick={connectWallet}>
              Connect MetaMask
            </button>
          ) : !isCorrectNetwork ? (
            <button className="button-secondary" type="button" onClick={switchNetwork}>
              Switch network
            </button>
          ) : (
            <div style={{ marginTop: 10, color: '#a5f3fc' }}>
              Connected as <strong>{truncateAddress(account)}</strong>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ marginTop: 24 }}>
        <h3>Step 1: Company Valuation</h3>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <label>
            What is your company's total value? (₹)
            <input
              name="companyValuation"
              type="number"
              min="100000"
              value={form.companyValuation}
              onChange={handleChange}
              placeholder="e.g. ₹10,00,000"
              required
            />
            <small>This is what you believe your entire business is worth today.</small>
          </label>
          <label>
            What % of your company are you selling to investors? (%)
            <input
              name="equityPercentOffered"
              type="range"
              min="1"
              max="20"
              value={form.equityPercentOffered}
              onChange={handleChange}
            />
            <input
              name="equityPercentOffered"
              type="number"
              min="1"
              max="20"
              value={form.equityPercentOffered}
              onChange={handleChange}
              style={{ marginTop: 8, width: '100%' }}
            />
            <small>e.g. 20% means investors will own 20% of your company.</small>
          </label>
          <div style={{ gridColumn: '1 / -1', padding: 16, background: '#0f172a', borderRadius: 12, color: '#e2e8f0' }}>
            <strong>You will raise: ₹{formattedValue(targetAmount)}</strong>
          </div>
        </div>

        <h3 style={{ marginTop: 24 }}>Step 2: Token Creation</h3>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <label>
            How many total tokens do you want to create?
            <input
              name="totalTokenSupply"
              type="number"
              min="10"
              max="10000"
              value={form.totalTokenSupply}
              onChange={handleChange}
              placeholder="e.g. 100"
              required
            />
            <small>Think of these as shares in your company. More tokens = smaller price per token.</small>
          </label>
          <label>
            How many tokens will you sell to investors?
            <input
              name="tokensForSale"
              type="number"
              min="1"
              max={maxTokensForSale}
              value={form.tokensForSale}
              onChange={handleChange}
              placeholder="e.g. 3"
              required
            />
            <small>You can sell fewer tokens now and list more later.</small>
          </label>
          <div style={{ gridColumn: '1 / -1', padding: 16, background: '#0f172a', borderRadius: 12, color: '#e2e8f0' }}>
            <h4>📊 Token Economics Preview</h4>
            <p>Company Valuation: ₹{formattedValue(companyValuation)}</p>
            <p>Equity for sale: {equityPercentOffered}%</p>
            <p>Total tokens created: {formattedValue(totalTokenSupply)}</p>
            <p>Tokens for sale: {formattedValue(tokensForSale)}</p>
            <p>✅ Price per token: ₹{formattedValue(Math.round(tokenPrice))}</p>
            <p>✅ Total you will raise: ₹{formattedValue(Math.round(totalRaiseNow))}</p>
            <p>✅ Each token = {ownershipPerToken.toFixed(2)}% ownership</p>
            <p>✅ Founder keeps: {formattedValue(founderTokens)} tokens (locked 6 mo)</p>
            <p>✅ Max investor ownership: {maxInvestorOwnership.toFixed(2)}%</p>
          </div>
        </div>

        <h3 style={{ marginTop: 24 }}>Step 3: Review before submit</h3>
        <div style={{ padding: 20, background: '#111827', borderRadius: 16, color: '#f8fafc' }}>
          <h4>🏪 {form.businessName || 'Your MSME'} — Token Review</h4>
          <p>Company Value: ₹{formattedValue(companyValuation)}</p>
          <p>You are selling: {equityPercentOffered}% equity</p>
          <p>Total tokens: {formattedValue(totalTokenSupply)} (like shares)</p>
          <p>Selling now: {formattedValue(tokensForSale)} tokens</p>
          <p>Price per token: ₹{formattedValue(Math.round(tokenPrice))}</p>
          <p>Money to raise: ₹{formattedValue(Math.round(totalRaiseNow))}</p>
          <p>Your tokens (locked 6 months): {formattedValue(founderTokens)}</p>
          <p>Investor max share: {maxInvestorOwnership.toFixed(2)}%</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="button-primary" type="submit" disabled={loading || !isConnected || !isCorrectNetwork || !isMetaMaskInstalled}>
              {loading ? 'Submitting...' : '✅ Confirm & List'}
            </button>
            <button className="button-secondary" type="button" onClick={() => setForm(initialState)}>
              ✏️ Edit
            </button>
          </div>
        </div>

        {status && (
          <div style={{ marginTop: 20, color: '#86efac' }}>
            <p>{status.message || 'Listing request submitted successfully.'}</p>
            {status.ipfsCid && <p>IPFS CID: {status.ipfsCid}</p>}
          </div>
        )}

        {error && (
          <p style={{ marginTop: 20, color: '#fca5a5' }}>{error}</p>
        )}
      </form>
    </section>
  )
}
