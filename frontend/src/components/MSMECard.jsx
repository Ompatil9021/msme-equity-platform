import { Link } from 'react-router-dom'

export default function MSMECard({ listing }) {
  const raised = listing.raised != null ? listing.raised : 0
  const target = listing.targetAmount != null ? listing.targetAmount : listing.target || 0
  const progress = target ? Math.min(100, Math.round((raised / target) * 100)) : 0

  return (
    <article className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3>{listing.businessName || listing.name}</h3>
          <p>{listing.businessDescription || listing.description}</p>
        </div>
        <span style={{ color: '#a5f3fc', fontWeight: 600 }}>{listing.riskLabel || 'Unknown'}</span>
      </div>
      <div className="badge">
        <span>{listing.category}</span>
        <span>{listing.city}</span>
        <span>{listing.foundingYear || listing.founded} founded</span>
      </div>
      <div style={{ marginTop: 16 }}>
        <p>Target: ₹{target.toLocaleString()}</p>
        <p>Equity offered: {listing.equityPercentage || listing.equityOffered}%</p>
        {listing.raised != null && <p>Raised: ₹{listing.raised.toLocaleString()}</p>}
        <div style={{ marginTop: 12, background: '#1e293b', borderRadius: 999, height: 10, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#818cf8' }} />
        </div>
      </div>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Link className="button-primary" to={`/listings/${listing.id || listing.msmeId}`}>
          View listing
        </Link>
        <Link className="button-secondary" to={`/listings/${listing.id || listing.msmeId}`}>
          Invest / Details
        </Link>
      </div>
    </article>
  )
}
