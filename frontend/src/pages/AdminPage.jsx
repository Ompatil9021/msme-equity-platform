import { useEffect, useMemo, useState } from 'react'
import { fetchAdminUsers, fetchListings } from '../api'

const formatINR = (value) => Number(value || 0).toLocaleString('en-IN')

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [data, userData] = await Promise.all([
          fetchListings({ limit: 100 }),
          fetchAdminUsers(),
        ])
        setListings(data)
        setUsers(userData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const stats = useMemo(() => {
    const totalTarget = listings.reduce((sum, item) => sum + Number(item.targetAmount || 0), 0)
    const totalRaised = listings.reduce((sum, item) => sum + Number(item.tokenPrice || 0) * Number(item.tokensSold || 0), 0)
    const funded = listings.filter((item) => Number(item.tokensSold || 0) > 0).length

    const usersByRole = users.reduce(
      (acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      },
      { entrepreneur: 0, investor: 0, admin: 0 },
    )

    return {
      totalListings: listings.length,
      totalTarget,
      totalRaised,
      funded,
      usersByRole,
    }
  }, [listings, users])

  return (
    <section>
      <div className="card">
        <h2>Admin Control Center</h2>
        <p>Platform-wide view for users, listings, fundraising, and risk snapshot.</p>
      </div>

      <div className="section-grid" style={{ marginTop: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card">
          <h3>Total users</h3>
          <p style={{ fontSize: '2rem' }}>{users.length}</p>
        </div>
        <div className="card">
          <h3>Total listings</h3>
          <p style={{ fontSize: '2rem' }}>{stats.totalListings}</p>
        </div>
        <div className="card">
          <h3>Raised amount</h3>
          <p style={{ fontSize: '2rem' }}>₹{formatINR(stats.totalRaised)}</p>
        </div>
        <div className="card">
          <h3>Target amount</h3>
          <p style={{ fontSize: '2rem' }}>₹{formatINR(stats.totalTarget)}</p>
        </div>
      </div>

      <div className="section-grid" style={{ marginTop: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card">
          <h3>Entrepreneurs</h3>
          <p style={{ fontSize: '2rem' }}>{stats.usersByRole.entrepreneur || 0}</p>
        </div>
        <div className="card">
          <h3>Investors</h3>
          <p style={{ fontSize: '2rem' }}>{stats.usersByRole.investor || 0}</p>
        </div>
        <div className="card">
          <h3>Admins</h3>
          <p style={{ fontSize: '2rem' }}>{stats.usersByRole.admin || 0}</p>
        </div>
        <div className="card">
          <h3>Funded listings</h3>
          <p style={{ fontSize: '2rem' }}>{stats.funded}</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Listings overview</h3>
        {loading && <p style={{ marginTop: 10 }}>Loading listings...</p>}
        {error && <p style={{ marginTop: 10, color: '#f87171' }}>{error}</p>}

        {!loading && !error && listings.length === 0 && <p style={{ marginTop: 10 }}>No listings found.</p>}

        {!loading && !error && listings.length > 0 && (
          <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
            {listings.map((item) => (
              <div key={item.id || item.msmeId} style={{ background: 'rgba(148, 163, 184, 0.08)', borderRadius: 12, padding: 14 }}>
                <strong>{item.businessName}</strong>
                <p style={{ marginTop: 4, color: '#94a3b8' }}>{item.category} • {item.city}</p>
                <p style={{ marginTop: 4 }}>
                  Sold {item.tokensSold || 0} / {item.tokensForSale || 0} tokens • Risk {item.riskLabel || 'N/A'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
