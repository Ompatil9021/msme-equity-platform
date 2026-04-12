const { getDb } = require('../config/firebase')

const getRiskColor = (score) => {
  if (score <= 30) return '#22c55e'
  if (score <= 55) return '#eab308'
  if (score <= 75) return '#f97316'
  return '#ef4444'
}

const getRiskLabel = (score) => {
  if (score <= 30) return 'Conservative'
  if (score <= 55) return 'Moderate'
  if (score <= 75) return 'High'
  return 'Speculative'
}

const computeRiskScore = ({ annualRevenue = 0, foundingYear, category = '', city = '' }) => {
  const revenue = Number(annualRevenue) || 0
  const currentYear = new Date().getFullYear()
  const age = foundingYear ? currentYear - Number(foundingYear) : 0
  const normalizedCategory = String(category).trim().toLowerCase()
  const normalizedCity = String(city).trim().toLowerCase()

  const revenueScore = revenue > 5000000 ? 5
    : revenue >= 2000000 ? 8
    : revenue >= 1000000 ? 12
    : revenue >= 500000 ? 18
    : 25

  const ageScore = age > 10 ? 5
    : age >= 5 ? 8
    : age >= 3 ? 12
    : age >= 1 ? 18
    : 25

  const sectorScore = normalizedCategory === 'technology' || normalizedCategory === 'healthcare'
    ? 8
    : normalizedCategory === 'manufacturing'
    ? 12
    : normalizedCategory === 'retail' || normalizedCategory === 'food & beverage' || normalizedCategory === 'food and beverage' || normalizedCategory === 'textile'
    ? 18
    : 15

  const metroCities = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'hyderabad', 'kolkata', 'pune']
  const tier2Cities = ['ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur', 'indore', 'bhopal', 'visakhapatnam', 'patna']
  const tier3Cities = ['varanasi', 'coimbatore', 'nagpur', 'vadodara', 'rajkot', 'meerut', 'nashik', 'thiruvananthapuram', 'mangalore', 'dharwad']

  const locationScore = metroCities.some((cityName) => normalizedCity.includes(cityName))
    ? 8
    : tier2Cities.some((cityName) => normalizedCity.includes(cityName))
    ? 12
    : tier3Cities.some((cityName) => normalizedCity.includes(cityName))
    ? 18
    : 20

  const totalScore = Math.min(revenueScore + ageScore + sectorScore + locationScore, 100)
  const label = getRiskLabel(totalScore)
  const color = getRiskColor(totalScore)

  const revenueLabel = revenue > 5000000 ? 'high revenue' : revenue >= 2000000 ? 'moderate revenue' : revenue >= 1000000 ? 'mid revenue' : revenue >= 500000 ? 'low revenue' : 'very low revenue'
  const ageLabel = age > 10 ? 'mature business' : age >= 5 ? 'well established business' : age >= 3 ? 'growth-stage business' : age >= 1 ? 'young business' : 'very new business'
  const sectorLabel = normalizedCategory === 'technology' ? 'technology' : normalizedCategory === 'healthcare' ? 'healthcare' : normalizedCategory === 'manufacturing' ? 'manufacturing' : normalizedCategory === 'retail' ? 'retail' : normalizedCategory === 'food & beverage' || normalizedCategory === 'food and beverage' ? 'food & beverage' : normalizedCategory === 'textile' ? 'textile' : 'other sector'
  const locationLabel = metroCities.some((cityName) => normalizedCity.includes(cityName))
    ? 'metro city'
    : tier2Cities.some((cityName) => normalizedCity.includes(cityName))
    ? 'Tier-2 city'
    : tier3Cities.some((cityName) => normalizedCity.includes(cityName))
    ? 'Tier-3 city'
    : 'other city'

  const explanation = `${ageLabel} with ${revenueLabel} in ${sectorLabel} operating from a ${locationLabel}.`

  return {
    totalScore,
    revenueScore,
    ageScore,
    sectorScore,
    locationScore,
    label,
    color,
    explanation,
    breakdown: {
      revenueScore,
      ageScore,
      sectorScore,
      locationScore,
    },
  }
}

const calculateRiskScore = (req, res) => {
  try {
    const { annualRevenue, foundingYear, category, city } = req.body

    const score = computeRiskScore({
      annualRevenue: parseFloat(annualRevenue),
      foundingYear: parseInt(foundingYear, 10),
      category,
      city,
    })

    res.json({ success: true, data: score })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Risk scoring failed', error: err.message })
  }
}

const getMSMERisk = async (req, res) => {
  try {
    const db = getDb()
    const doc = await db.collection('msme_listings').doc(req.params.msmeId).get()

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'MSME not found' })
    }

    const data = doc.data()

    const hasSavedRisk = data?.riskScore != null && data?.riskLabel
  const breakdown = data?.riskBreakdown || {
    revenueScore: data?.revenueScore,
    ageScore: data?.ageScore,
    sectorScore: data?.sectorScore,
    locationScore: data?.locationScore,
  }
  const hasValidBreakdown = Object.values(breakdown).every((value) => typeof value === 'number' && value > 0)
  let result

  if (hasSavedRisk && hasValidBreakdown) {
    result = {
      totalScore: data.riskScore,
      riskScore: data.riskScore,
      label: data.riskLabel,
      color: data.riskColor || getRiskColor(data.riskScore),
      explanation: data.riskExplanation || data.riskDescription || '',
      breakdown,
    }
  } else {
    result = computeRiskScore(data)
    await db.collection('msme_listings').doc(req.params.msmeId).update({
      riskScore: result.totalScore,
      riskLabel: result.label,
      riskColor: result.color,
      riskDescription: result.explanation,
      riskExplanation: result.explanation,
      riskBreakdown: result.breakdown,
      revenueScore: result.revenueScore,
      ageScore: result.ageScore,
      sectorScore: result.sectorScore,
      locationScore: result.locationScore,
      updatedAt: new Date().toISOString(),
    })
  }

  res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

module.exports = { calculateRiskScore, getMSMERisk, computeRiskScore }
