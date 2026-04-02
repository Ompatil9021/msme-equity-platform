import { useEffect, useState } from 'react'
import { submitKYC, getKYCStatus } from '../api'
import { useWallet } from '../WalletContext'

const initialFormState = {
  walletAddress: '',
  fullName: '',
  panNumber: '',
  aadhaarLast4: '',
  email: '',
  city: '',
  incomeRange: '',
  photoFile: null,
}

export default function KYCPage() {
  const {
    account,
    isMetaMaskInstalled,
    isConnected,
    isCorrectNetwork,
    connectWallet,
    switchNetwork,
    truncateAddress,
  } = useWallet()

  const [form, setForm] = useState(initialFormState)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isConnected && account) {
      setForm((prev) => ({ ...prev, walletAddress: account }))
    }
  }, [account, isConnected])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    setForm((prev) => ({ ...prev, photoFile: file }))
  }

  const createMockPhotoHash = (file) => {
    if (!file) return null
    const encoded = btoa(`${file.name}:${file.size}:${file.lastModified}`)
    return `Qm${encoded.slice(0, 44)}`
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setStatus(null)

    if (!isMetaMaskInstalled) {
      setError('Please install MetaMask to complete KYC.')
      return
    }
    if (!isConnected || !account) {
      setError('Connect MetaMask before submitting KYC.')
      return
    }
    if (!isCorrectNetwork) {
      setError('Switch MetaMask to the correct network before submitting KYC.')
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
    if (!form.city) {
      setError('Select your city.')
      return
    }
    if (!form.incomeRange) {
      setError('Select your annual income range.')
      return
    }
    if (!form.photoFile) {
      setError('Upload a selfie or ID photo (max 2MB).')
      return
    }
    if (form.photoFile.size > 2 * 1024 * 1024) {
      setError('Photo must be 2MB or smaller.')
      return
    }

    setLoading(true)
    try {
      const photoIPFSHash = createMockPhotoHash(form.photoFile)
      const payload = {
        walletAddress: account,
        fullName: form.fullName,
        panNumber: form.panNumber,
        aadhaarLast4: form.aadhaarLast4,
        email: form.email,
        city: form.city,
        incomeRange: form.incomeRange,
        photoIPFSHash,
      }
      const result = await submitKYC(payload)
      setStatus(result)
      setForm(initialFormState)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckStatus = async () => {
    setError('')
    setStatus(null)

    if (!isMetaMaskInstalled) {
      setError('Please install MetaMask to check KYC status.')
      return
    }
    if (!isConnected || !account) {
      setError('Connect MetaMask before checking KYC status.')
      return
    }
    if (!isCorrectNetwork) {
      setError('Switch MetaMask to the correct network before checking status.')
      return
    }

    try {
      setLoading(true)
      const result = await getKYCStatus(account)
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
        <p>Submit KYC using your MetaMask wallet. The wallet address is read automatically.</p>
        <div style={{ marginTop: 16 }}>
          {!isMetaMaskInstalled ? (
            <a href="https://metamask.io/download.html" target="_blank" rel="noreferrer" className="button-secondary">
              Install MetaMask
            </a>
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
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <label>
            Wallet address
            <input
              name="walletAddress"
              value={account || form.walletAddress}
              readOnly
              disabled
              placeholder="Connect MetaMask to autofill"
            />
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
          <label>
            City
            <select name="city" value={form.city} onChange={handleChange} required>
              <option value="">Select city</option>
              {['Mumbai', 'Bengaluru', 'Delhi', 'Chennai', 'Kolkata', 'Hyderabad', 'Ahmedabad', 'Surat', 'Pune', 'Lucknow'].map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
          <label>
            Annual income range
            <select name="incomeRange" value={form.incomeRange} onChange={handleChange} required>
              <option value="">Select income range</option>
              <option value="<5 LPA">Below ₹5 LPA</option>
              <option value="5-12 LPA">₹5-12 LPA</option>
              <option value="12-25 LPA">₹12-25 LPA</option>
              <option value=">25 LPA">Above ₹25 LPA</option>
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Selfie / ID photo upload
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {form.photoFile && <p style={{ marginTop: 8 }}>{form.photoFile.name}</p>}
          </label>
        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="button-primary" type="submit" disabled={loading || !isConnected || !isCorrectNetwork}>
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
