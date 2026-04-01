import { useState } from 'react'
import { submitKYC, getKYCStatus } from '../api'

export default function KYCPage() {
  const [form, setForm] = useState({
    walletAddress: '',
    fullName: '',
    panNumber: '',
    aadhaarLast4: '',
    email: '',
  })
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

    if (!form.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(form.walletAddress)) {
      setError('Enter a valid investor wallet address.')
      return
    }
    if (!form.fullName || form.fullName.trim().length < 3) {
      setError('Enter the investor full name.')
      return
    }
    if (!form.panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(form.panNumber)) {
      setError('Enter a valid PAN number in format ABCDE1234F.')
      return
    }
    if (!form.aadhaarLast4 || !/^[0-9]{4}$/.test(form.aadhaarLast4)) {
      setError('Enter the last 4 digits of Aadhaar.')
      return
    }
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError('Enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const result = await submitKYC(form)
      setStatus(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckStatus = async () => {
    setError('')
    setStatus(null)
    if (!form.walletAddress) {
      setError('Enter a wallet address to check status.')
      return
    }
    try {
      setLoading(true)
      const result = await getKYCStatus(form.walletAddress)
      setStatus(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="card">
        <h2>Investor KYC</h2>
        <p>Submit mock KYC for wallet approval. This is the investor onboarding entry point.</p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ marginTop: 24 }}>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <label>
            Wallet address
            <input name="walletAddress" value={form.walletAddress} onChange={handleChange} placeholder="0x..." required />
          </label>
          <label>
            Full name
            <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Asha Patel" required />
          </label>
          <label>
            PAN number
            <input name="panNumber" value={form.panNumber} onChange={handleChange} placeholder="ABCDE1234F" required />
          </label>
          <label>
            Aadhaar last 4
            <input name="aadhaarLast4" value={form.aadhaarLast4} onChange={handleChange} placeholder="1234" required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="investor@example.com" required />
          </label>
        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit KYC'}
          </button>
          <button className="button-secondary" type="button" onClick={handleCheckStatus} disabled={loading}>
            Check status
          </button>
        </div>
      </form>

      {status && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>KYC result</h3>
          <p>Wallet: <strong>{status.walletAddress}</strong></p>
          <p>Status: <strong>{status.kycStatus}</strong></p>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginTop: 24, borderColor: '#f87171' }}>
          <p>{error}</p>
        </div>
      )}
    </section>
  )
}
