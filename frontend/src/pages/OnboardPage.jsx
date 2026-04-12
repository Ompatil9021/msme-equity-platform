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

const categories = [
  'Manufacturing',
  'Retail',
  'Food & Beverage',
  'Technology',
  'Agriculture',
  'Textile',
  'Healthcare',
  'Education',
  'Service',
  'Other',
]

export default function OnboardPage() {
  const {
    account,
    isMetaMaskInstalled,
    isConnected,
    isCorrectNetwork,
    connectWallet,
    switchNetwork,
    truncateAddress,
  } = useWallet()

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

    if (companyValuation <= 0) {
      setError('Enter a valid company valuation.')
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
      <div className="section-grid" style={{ marginTop: 24, gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 24, alignItems: 'flex-start' }}>
        <div className="card" style={{ position: 'sticky', top: 24, display: 'grid', gap: 24 }}>
          <div>
            <h1 style={{ fontSize: '2.4rem', lineHeight: 1.1, marginBottom: 16, color: '#f8fafc' }}>
              Register your business profile, fundraising target, equity terms, and documents for immutable access.
            </h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
              Submit your MSME profile with GST details, funding goals, founder information, and investor-ready summary.
            </p>
          </div>

          <div className="badge" style={{ display: 'grid', gap: 12 }}>
            <span style={{ background: 'rgba(71,85,105,0.2)', color: '#e2e8f0' }}>Instant preview of fundraise value and equity.</span>
            <span style={{ background: 'rgba(71,85,105,0.2)', color: '#e2e8f0' }}>Auto-fill founder wallet from MetaMask.</span>
            <span style={{ background: 'rgba(71,85,105,0.2)', color: '#e2e8f0' }}>Fast, single-page MSME onboarding.</span>
          </div>

          <div className="card" style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.12)', padding: 20 }}>
            <h2 style={{ color: '#f8fafc', marginBottom: 14 }}>Live funding preview</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Fundraising target</span>
                <strong>₹{formattedValue(targetAmount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Equity offered</span>
                <strong>{equityPercentOffered}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Estimated token price</span>
                <strong>₹{formattedValue(Math.round(tokenPrice))}</strong>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ background: 'rgba(148,163,184,0.15)', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, equityPercentOffered)}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }} />
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: 8 }}>Equity share visualization</p>
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.12)', padding: 20 }}>
            <h2 style={{ color: '#f8fafc', marginBottom: 14 }}>Wallet status</h2>
            {!isMetaMaskInstalled ? (
              <p style={{ color: '#fbbf24' }}>MetaMask is required for onboarding.</p>
            ) : !isConnected ? (
              <button
                className="button-secondary"
                type="button"
                onClick={connectWallet}
                style={{ width: '100%' }}
              >
                Connect MetaMask
              </button>
            ) : !isCorrectNetwork ? (
              <button
                className="button-secondary"
                type="button"
                onClick={switchNetwork}
                style={{ width: '100%' }}
              >
                Switch network
              </button>
            ) : (
              <p style={{ color: '#e2e8f0' }}>
                Connected: <strong style={{ color: '#fff' }}>{truncateAddress(account)}</strong>
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 32, minWidth: 0 }}>
          <div className="grid" style={{ gap: 20, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">Business name</span>
              <input
                name="businessName"
                type="text"
                value={form.businessName}
                onChange={handleChange}
                placeholder="Asha Textiles"
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">Category</span>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">City</span>
              <input
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                placeholder="Surat"
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">GST number</span>
              <input
                name="gstNumber"
                type="text"
                value={form.gstNumber}
                onChange={handleChange}
                placeholder="24AABPA1234M1Z1"
                required
              />
            </label>
          </div>

          <div className="mt-6 grid" style={{ gap: 20, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">Founding year</span>
              <input
                name="foundingYear"
                type="number"
                value={form.foundingYear}
                onChange={handleChange}
                placeholder="2015"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">Annual revenue</span>
              <input
                name="annualRevenue"
                type="number"
                value={form.annualRevenue}
                onChange={handleChange}
                placeholder="1200000"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">Fundraising target</span>
              <input
                name="companyValuation"
                type="number"
                value={form.companyValuation}
                onChange={handleChange}
                placeholder="1000000"
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">Equity offered (%)</span>
              <input
                name="equityPercentOffered"
                type="number"
                min="1"
                max="20"
                value={form.equityPercentOffered}
                onChange={handleChange}
                placeholder="12"
                required
              />
            </label>
          </div>

          <div className="mt-6 grid" style={{ gap: 20, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">Employee count</span>
              <input
                name="employeeCount"
                type="number"
                value={form.employeeCount}
                onChange={handleChange}
                placeholder="15"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">Founder wallet</span>
              <input
                name="founderWallet"
                type="text"
                value={account ? truncateAddress(account) : ''}
                placeholder="0x..."
                readOnly
              />
              <small className="text-slate-400">Automatically filled from MetaMask when connected.</small>
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">Founder name</span>
              <input
                name="founderName"
                type="text"
                value={form.founderName}
                onChange={handleChange}
                placeholder="Asha Patel"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block font-medium">Contact email</span>
              <input
                name="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={handleChange}
                placeholder="founder@example.com"
              />
            </label>
          </div>

          <div className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-slate-200">Business summary</label>
            <textarea
              name="businessDescription"
              value={form.businessDescription}
              onChange={handleChange}
              placeholder="Short description for investor marketplace"
              rows="5"
            />
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="button-primary"
              type="submit"
              disabled={loading || !isMetaMaskInstalled || !isConnected || !isCorrectNetwork}
            >
              {loading ? 'Submitting...' : 'Submit listing request'}
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={() => setForm(initialState)}
            >
              Reset
            </button>
          </div>

          {status && (
            <div className="mt-6 rounded-2xl border border-emerald-500 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
              <p>{status.message || 'Listing request submitted successfully.'}</p>
              {status.ipfsCid && <p>IPFS CID: {status.ipfsCid}</p>}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-500 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
              {error}
            </div>
          )}
        </form>
      </div>
    </section>
  )
}
