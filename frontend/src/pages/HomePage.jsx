import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchListings } from '../api'

export default function HomePage() {
  const [count, setCount] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCount = async () => {
      try {
        const listings = await fetchListings()
        setCount(listings.length)
      } catch (err) {
        setError(err.message)
      }
    }
    loadCount()
  }, [])

  return (
    <section>
      <div className="card">
        <h1>MSME Equity Platform</h1>
        <p>
          Empower local Indian businesses with fractional equity tokens, transparent ownership,
          KYC-backed investor access, and portfolio-grade discovery.
        </p>
        <div className="badge" style={{ marginTop: 18 }}>
          <span>SEBI sandbox ready</span>
          <span>Polygon-friendly</span>
          <span>₹100 minimum investment</span>
          <span>IPFS document storage</span>
        </div>
        <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/listings" className="button-primary">Browse listings</Link>
          <Link to="/onboard" className="button-secondary">List an MSME</Link>
        </div>
        <p style={{ marginTop: 18, color: '#cbd5e1' }}>
          {error
            ? `Unable to load listing count: ${error}`
            : count == null
            ? 'Loading listing count...'
            : `Active MSME listings: ${count}`}
        </p>
      </div>

      <div className="section-grid" style={{ marginTop: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="card">
          <h2>Why this platform?</h2>
          <ul style={{ paddingLeft: 18 }}>
            <li>Unlock equity capital for small-town MSMEs.</li>
            <li>Allow retail investors to invest ₹100–₹10,000.</li>
            <li>Track ownership on-chain with tokenized stakes.</li>
            <li>Enable exit and dividends through secondary market design.</li>
          </ul>
        </div>
        <div className="card">
          <h2>Featured modules</h2>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            <p>• MSME onboarding + IPFS-backed profile storage.</p>
            <p>• Investor onboarding with KYC and portfolio tracking.</p>
            <p>• Tokenized equity and transaction recording.</p>
            <p>• Risk scoring and business transparency.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
