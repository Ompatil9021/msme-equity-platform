import { useEffect, useMemo, useState } from 'react'
import MSMECard from '../components/MSMECard'
import { fetchCities, fetchListings } from '../api'

export default function ListingPage() {
  const [listings, setListings] = useState([])
  const [cities, setCities] = useState([])
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [items, cityList] = await Promise.all([fetchListings(), fetchCities()])
        setListings(items)
        setCities(cityList)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const categories = useMemo(() => [...new Set(listings.map((item) => item.category))].sort(), [listings])
  const filtered = useMemo(() => {
    return listings.filter((item) => {
      return (city ? item.city === city : true) && (category ? item.category === category : true)
    })
  }, [listings, city, category])

  return (
    <section>
      <div className="card">
        <h2>Browse MSME listings</h2>
        <p>Filter by city, sector and risk label to find the right opportunity for your portfolio.</p>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 20 }}>
          <label>
            City
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="">All cities</option>
              {cities.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Sector
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All sectors</option>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 24, borderColor: '#f87171' }}>
          <h3>Error loading listings</h3>
          <p>{error}</p>
        </div>
      )}

      <div className="section-grid" style={{ marginTop: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {loading ? (
          <div className="card">
            <h3>Loading listings...</h3>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((listing) => <MSMECard key={listing.id} listing={listing} />)
        ) : (
          <div className="card">
            <h3>No listings match your filters.</h3>
            <p>Try a different city or sector, or check back after new MSMEs are onboarded.</p>
          </div>
        )}
      </div>
    </section>
  )
}
