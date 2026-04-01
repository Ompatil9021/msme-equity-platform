import { useState } from 'react'
import { calculateRisk } from '../api'

const regions = ['Bengaluru', 'Surat', 'Hyderabad', 'Lucknow', 'Kolkata']
const sectors = ['Food & Beverage', 'Manufacturing', 'Healthcare', 'Retail', 'Technology']

export default function RiskPage() {
  const [inputs, setInputs] = useState({
    annualRevenue: 1200000,
    foundingYear: 2019,
    category: 'Food & Beverage',
    city: 'Bengaluru',
    employeeCount: 14,
    targetAmount: 2500000,
    equityPercentage: 12,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setInputs((prev) => ({
      ...prev,
      [name]: name === 'category' || name === 'city' ? value : Number(value),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const score = await calculateRisk(inputs)
      setResult(score)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="card">
        <h2>AI-powered risk scoring</h2>
        <p>Prototype a risk label for MSME fundraising based on revenue, age, sector, and location.</p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ marginTop: 24 }}>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label>
            Annual revenue
            <input type="number" name="annualRevenue" value={inputs.annualRevenue} onChange={handleChange} required />
          </label>
          <label>
            Founding year
            <input type="number" name="foundingYear" value={inputs.foundingYear} onChange={handleChange} required />
          </label>
          <label>
            Sector
            <select name="category" value={inputs.category} onChange={handleChange}>
              {sectors.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            City
            <select name="city" value={inputs.city} onChange={handleChange}>
              {regions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Employee count
            <input type="number" name="employeeCount" value={inputs.employeeCount} onChange={handleChange} required />
          </label>
          <label>
            Target amount
            <input type="number" name="targetAmount" value={inputs.targetAmount} onChange={handleChange} required />
          </label>
          <label>
            Equity percentage
            <input type="number" name="equityPercentage" value={inputs.equityPercentage} onChange={handleChange} required min="1" max="20" />
          </label>
        </div>

        <div style={{ marginTop: 22 }}>
          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? 'Scoring...' : 'Run risk score'}
          </button>
        </div>
      </form>

      {error && (
        <div className="card" style={{ marginTop: 24, borderColor: '#f87171' }}>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>Risk estimate</h3>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginTop: 18 }}>
            <div style={{ minWidth: 108, padding: 22, borderRadius: 18, background: 'rgba(59, 130, 246, 0.15)' }}>
              <p style={{ color: '#38bdf8', marginBottom: 8 }}>Score</p>
              <p style={{ fontSize: '2rem', fontWeight: 700 }}>{result.riskScore}</p>
            </div>
            <div>
              <h4>{result.riskLabel}</h4>
              <p>{result.riskDescription}</p>
              <div className="badge" style={{ marginTop: 12 }}>
                {result.reasons.slice(0, 4).map((reason) => (
                  <span key={reason}>{reason}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
