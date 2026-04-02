import { Link } from 'react-router-dom'

export default function MSMECard({ listing }) {
  const raised = listing.raised != null ? listing.raised : 0
  const target = listing.targetAmount != null ? listing.targetAmount : listing.target || 0
  const tokensForSale = listing.tokensForSale ?? 0
  const tokensSold = listing.tokensSold ?? 0
  const tokensRemaining = Math.max(0, tokensForSale - tokensSold)
  const progress = tokensForSale ? Math.min(100, Math.round((tokensSold / tokensForSale) * 100)) : 0
  const tokenPrice = listing.tokenPrice ?? 0
  const ownershipPerToken = listing.ownershipPerToken ?? (listing.equityPercentage && listing.totalTokenSupply ? listing.equityPercentage / listing.totalTokenSupply : 0)
  const tokenStatus = tokensRemaining === 0 ? 'Sold Out' : tokensRemaining === 1 ? '1 token remaining' : `${tokensRemaining} tokens remaining`
  const statusColor = tokensRemaining === 0 ? '#f87171' : tokensRemaining === 1 ? '#fbbf24' : '#34d399'

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
        <p>Company value: ₹{target.toLocaleString('en-IN')}</p>
        <p>Token price: ₹{tokenPrice.toLocaleString('en-IN')} per token</p>
        <p>Ownership/token: {ownershipPerToken.toFixed(2)}%</p>
        <p style={{ color: statusColor, fontWeight: 600 }}>{tokenStatus}</p>
        <div style={{ marginTop: 12, background: '#1e293b', borderRadius: 999, height: 10, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#818cf8' }} />
        </div>
        <p style={{ marginTop: 8 }}>{tokensSold} of {tokensForSale} tokens sold</p>
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
