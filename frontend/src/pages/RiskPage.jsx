import { useEffect, useMemo, useState } from 'react'
import { fetchListings, getRiskByMSME } from '../api'

const riskColor = (score) => {
  if (score <= 30) return '#22c55e'
  if (score <= 55) return '#eab308'
  if (score <= 75) return '#f97316'
  return '#ef4444'
}

const scoreLabel = (score) => {
  if (score <= 30) return 'Conservative'
  if (score <= 55) return 'Moderate'
  if (score <= 75) return 'High'
  return 'Speculative'
}

const renderProgressBar = (value, max, color) => {
  const width = Math.round((value / max) * 100)
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.93rem', color: '#cbd5e1' }}>
        <span>{value}/{max}</span>
        <span>{Math.round((value / max) * 100)}%</span>
      </div>
      <div style={{ background: 'rgba(148, 163, 184, 0.16)', borderRadius: 999, height: 12, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: color }} />
      </div>
    </div>
  )
}

export default function RiskPage() {
  const [msmes, setMsmEs] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [riskResult, setRiskResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingRisk, setLoadingRisk] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadMSMEs = async () => {
      setLoading(true)
      setError('')

      try {
        const listings = await fetchListings()
        setMsmEs(listings)
        if (listings.length > 0) {
          setSelectedId(listings[0].id || listings[0].msmeId)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadMSMEs()
  }, [])

  const selectedMSME = useMemo(() => {
    return msmes.find((item) => item.id === selectedId || item.msmeId === selectedId)
  }, [msmes, selectedId])

  const normalizeBreakdown = (input) => ({
    revenueScore: Number(input?.revenueScore) || 0,
    ageScore: Number(input?.ageScore) || 0,
    sectorScore: Number(input?.sectorScore) || 0,
    locationScore: Number(input?.locationScore) || 0,
  })

  const hasValidBreakdown = (breakdown) =>
    Object.values(breakdown).every((value) => typeof value === 'number' && value > 0)

  useEffect(() => {
    if (!selectedId) return
    const loadRisk = async () => {
      const listing = msmes.find((item) => item.id === selectedId || item.msmeId === selectedId)
      if (!listing) return

      setLoadingRisk(true)
      setError('')

      const listingBreakdown = normalizeBreakdown(listing.riskBreakdown || {
        revenueScore: listing.revenueScore,
        ageScore: listing.ageScore,
        sectorScore: listing.sectorScore,
        locationScore: listing.locationScore,
      })

      const fallbackRisk = {
        totalScore: listing.riskScore,
        riskScore: listing.riskScore,
        label: listing.riskLabel,
        color: listing.riskColor || riskColor(listing.riskScore),
        explanation: listing.riskExplanation || listing.riskDescription || '',
        breakdown: listingBreakdown,
      }

      try {
        if (listing.riskScore != null && listing.riskLabel && hasValidBreakdown(listingBreakdown)) {
          setRiskResult(fallbackRisk)
          return
        }

        const risk = await getRiskByMSME(listing.id || listing.msmeId)
        setRiskResult(risk)
        setMsmEs((prev) => prev.map((item) => {
          if (item.id !== selectedId && item.msmeId !== selectedId) return item
          return {
            ...item,
            riskScore: risk.totalScore,
            riskLabel: risk.label,
            riskColor: risk.color,
            riskExplanation: risk.explanation,
            riskBreakdown: risk.breakdown,
          }
        }))
      } catch (err) {
        setRiskResult(fallbackRisk)
        setError(err.message)
      } finally {
        setLoadingRisk(false)
      }
    }

    loadRisk()
  }, [selectedId, msmes])

  const handleSelection = (event) => {
    setSelectedId(event.target.value)
  }

  const selectedDetails = selectedMSME
    ? `${selectedMSME.businessName || selectedMSME.name} — ${selectedMSME.city || 'Unknown city'} • ${selectedMSME.category || 'Unknown category'}`
    : ''

  return (
    <section>
      <div className="card">
        <h2>MSME risk scoring</h2>
        <p>Score every MSME using revenue, age, sector and location data from Firestore — not hardcoded values.</p>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <label className="space-y-2 text-sm text-slate-200">
          <span>Select MSME to analyze</span>
          <select value={selectedId} onChange={handleSelection} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
            <option value="" disabled>Select MSME to analyze</option>
            {msmes.map((msme) => (
              <option key={msme.id || msme.msmeId} value={msme.id || msme.msmeId}>
                {msme.businessName || msme.name} ({msme.city || 'Unknown city'})
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <div className="card" style={{ marginTop: 24 }}>
          <p>Loading MSME listings…</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginTop: 24, borderColor: '#f87171' }}>
          <p>{error}</p>
        </div>
      )}

      {selectedMSME && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p className="text-sm text-slate-400">Analyzing</p>
              <h3>{selectedDetails}</h3>
            </div>
            {riskResult && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '8px 14px', background: `${riskResult.color}1A`, color: riskResult.color, fontWeight: 700 }}>
                {riskResult.label}
              </span>
            )}
          </div>

          <div style={{ marginTop: 24, display: 'grid', gap: 24, gridTemplateColumns: 'minmax(220px, 280px) 1fr' }}>
            <div style={{ display: 'grid', gap: 18, alignItems: 'center' }}>
              <div style={{ width: 180, height: 180, borderRadius: '50%', border: `12px solid ${riskResult ? riskResult.color : '#64748b'}`, display: 'grid', placeItems: 'center', margin: '0 auto' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', marginBottom: 8 }}>Total risk</p>
                  <p style={{ fontSize: '3rem', fontWeight: 800, color: riskResult ? riskResult.color : '#cbd5e1' }}>
                    {riskResult ? riskResult.totalScore : '--'}
                  </p>
                </div>
              </div>
              {riskResult && (
                <div style={{ textAlign: 'center', color: '#cbd5e1' }}>
                  <p style={{ fontWeight: 600, marginBottom: 6 }}>Risk label</p>
                  <p>{riskResult.label}</p>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: 18 }}>
              {riskResult ? (
                <>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Revenue Score</span>
                    </div>
                    {renderProgressBar(riskResult.breakdown.revenueScore, 25, riskColor(riskResult.breakdown.revenueScore))}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Age Score</span>
                    </div>
                    {renderProgressBar(riskResult.breakdown.ageScore, 25, riskColor(riskResult.breakdown.ageScore))}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Sector Score</span>
                    </div>
                    {renderProgressBar(riskResult.breakdown.sectorScore, 25, riskColor(riskResult.breakdown.sectorScore))}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Location Score</span>
                    </div>
                    {renderProgressBar(riskResult.breakdown.locationScore, 25, riskColor(riskResult.breakdown.locationScore))}
                  </div>
                </>
              ) : (
                <div className="card" style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148,163,184,0.12)', padding: 20 }}>
                  <p>{loadingRisk ? 'Computing risk score…' : 'Select an MSME to load risk details.'}</p>
                </div>
              )}
            </div>
          </div>

          {riskResult && (
            <div style={{ marginTop: 24, padding: 20, borderRadius: 18, background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148,163,184,0.12)' }}>
              <h4 style={{ marginBottom: 12, color: '#f8fafc' }}>Explanation</h4>
              <p style={{ color: '#cbd5e1', lineHeight: 1.8 }}>{riskResult.explanation}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
