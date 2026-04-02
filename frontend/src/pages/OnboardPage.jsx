import { useState } from 'react'
import { submitListing } from '../api'
import { useWallet } from '../WalletContext'

const initialState = {
  businessName: '',
  category: '',
  city: '',
  gstNumber: '',
  foundingYear: '',
  targetAmount: '',
  equityPercentage: '',
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

  const handleChange = (event) => {
    const { name, value } = event.target
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

    try {
      const payload = {
        ...form,
        founderWallet: account,
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

  return (
    <section>
      <div className="card">
        <h2>MSME Business Listing &amp; Onboarding</h2>
        <p>Register your business profile, fundraising target, equity terms, and documents for immutable access.</p>
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
          {isMetaMaskInstalled && isConnected && (
            <div style={{ marginTop: 10, color: '#a5f3fc' }}>
              Founder wallet: <strong>{truncateAddress(account)}</strong>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ marginTop: 24 }}>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <label>
            Business name
            <input name="businessName" value={form.businessName} onChange={handleChange} placeholder="Asha Textiles" required />
          </label>
          <label>
            Category
            <select name="category" value={form.category} onChange={handleChange} required>
              <option value="">Select category</option>
              {[
                'Food & Beverage',
                'Retail',
                'Manufacturing',
                'Technology',
                'Healthcare',
                'Education',
                'Agriculture',
                'Textile',
                'Construction',
                'Services',
              ].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            City
            <input name="city" value={form.city} onChange={handleChange} placeholder="Surat" required />
          </label>
          <label>
            GST number
            <input name="gstNumber" value={form.gstNumber} onChange={handleChange} placeholder="24AABPA1234M1Z1" required />
          </label>
          <label>
            Founding year
            <input name="foundingYear" value={form.foundingYear} type="number" onChange={handleChange} placeholder="2015" required />
          </label>
          <label>
            Annual revenue
            <input name="annualRevenue" value={form.annualRevenue} type="number" onChange={handleChange} placeholder="1200000" required />
          </label>
          <label>
            Fundraising target
            <input name="targetAmount" value={form.targetAmount} type="number" onChange={handleChange} placeholder="1000000" required />
          </label>
          <label>
            Equity offered (%)
            <input name="equityPercentage" value={form.equityPercentage} type="number" onChange={handleChange} placeholder="12" required min="1" max="20" />
          </label>
          <label>
            Employee count
            <input name="employeeCount" value={form.employeeCount} type="number" onChange={handleChange} placeholder="15" required />
          </label>
          <label>
            Founder name
            <input name="founderName" value={form.founderName} onChange={handleChange} placeholder="Asha Patel" required />
          </label>
          <label>
            Contact email
            <input name="contactEmail" value={form.contactEmail} type="email" onChange={handleChange} placeholder="founder@example.com" required />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Business summary
            <textarea name="businessDescription" value={form.businessDescription} onChange={handleChange} rows="4" placeholder="Short description for investor marketplace" required />
          </label>
        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="button-primary" type="submit" disabled={loading || !isConnected || !isCorrectNetwork || !isMetaMaskInstalled}>
            {loading ? 'Submitting...' : 'Submit listing request'}
          </button>
          <button className="button-secondary" type="button" onClick={() => setForm(initialState)}>
            Reset
          </button>
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
