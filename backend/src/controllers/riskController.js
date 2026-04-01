// AI-powered risk scoring engine
const calculateRiskScore = (req, res) => {
  try {
    const {
      annualRevenue, foundingYear, category, city,
      employeeCount, targetAmount, equityPercentage
    } = req.body;

    const score = computeRiskScore({
      annualRevenue: parseFloat(annualRevenue),
      foundingYear: parseInt(foundingYear),
      category, city,
      employeeCount: parseInt(employeeCount) || 1,
      targetAmount: parseFloat(targetAmount),
      equityPercentage: parseFloat(equityPercentage),
    });

    res.json({ success: true, data: score });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Risk scoring failed', error: err.message });
  }
};

const computeRiskScore = ({
  annualRevenue, foundingYear, category, city,
  employeeCount, targetAmount, equityPercentage
}) => {
  let score = 0; // 0 = safest, 100 = riskiest
  const reasons = [];
  const currentYear = new Date().getFullYear();
  const businessAge = currentYear - foundingYear;

  // === BUSINESS AGE (0–20 points) ===
  if (businessAge < 1) { score += 20; reasons.push("Very new business (<1 year)"); }
  else if (businessAge < 3) { score += 15; reasons.push("Early stage business (<3 years)"); }
  else if (businessAge < 5) { score += 10; reasons.push("Growing business (3-5 years)"); }
  else if (businessAge < 10) { score += 5; reasons.push("Established business (5-10 years)"); }
  else { score += 0; reasons.push("Mature business (10+ years)"); }

  // === REVENUE vs TARGET (0–25 points) ===
  const revenueToTarget = annualRevenue / targetAmount;
  if (revenueToTarget < 0.5) { score += 25; reasons.push("Revenue much lower than target raise"); }
  else if (revenueToTarget < 1) { score += 18; reasons.push("Revenue below target raise amount"); }
  else if (revenueToTarget < 2) { score += 12; reasons.push("Revenue at par with target raise"); }
  else if (revenueToTarget < 5) { score += 6; reasons.push("Revenue significantly above target raise"); }
  else { score += 2; reasons.push("Revenue well above target raise"); }

  // === SECTOR RISK (0–20 points) ===
  const sectorRisk = {
    'Technology': 18, 'Food & Beverage': 12, 'Retail': 14,
    'Manufacturing': 10, 'Healthcare': 8, 'Education': 9,
    'Agriculture': 13, 'Textile': 12, 'Construction': 16, 'Services': 11
  };
  const sectorScore = sectorRisk[category] || 15;
  score += sectorScore;
  reasons.push(`${category} sector risk`);

  // === CITY/LOCATION RISK (0–15 points) ===
  const tier1Cities = ['Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune'];
  const tier2Cities = ['Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Visakhapatnam', 'Patna'];

  if (tier1Cities.some(c => city.toLowerCase().includes(c.toLowerCase()))) {
    score += 5; reasons.push("Tier-1 city — better market access");
  } else if (tier2Cities.some(c => city.toLowerCase().includes(c.toLowerCase()))) {
    score += 10; reasons.push("Tier-2 city — moderate market access");
  } else {
    score += 15; reasons.push("Tier-3/rural area — limited market access");
  }

  // === EQUITY DILUTION (0–10 points) ===
  if (equityPercentage > 15) { score += 10; reasons.push("High equity dilution (>15%)"); }
  else if (equityPercentage > 10) { score += 7; reasons.push("Moderate equity dilution"); }
  else { score += 3; reasons.push("Low equity dilution"); }

  // === EMPLOYEE SIZE (0–10 points) ===
  if (employeeCount < 5) { score += 10; reasons.push("Very small team (<5 employees)"); }
  else if (employeeCount < 20) { score += 6; reasons.push("Small team (5-20 employees)"); }
  else if (employeeCount < 100) { score += 3; reasons.push("Medium team (20-100 employees)"); }
  else { score += 1; reasons.push("Large team (100+ employees)"); }

  // === DETERMINE LABEL ===
  let riskLabel, riskColor, riskDescription;
  if (score <= 25) {
    riskLabel = 'Conservative';
    riskColor = '#22c55e';
    riskDescription = 'Low-risk investment with stable fundamentals';
  } else if (score <= 45) {
    riskLabel = 'Moderate';
    riskColor = '#f59e0b';
    riskDescription = 'Balanced risk with reasonable growth potential';
  } else if (score <= 65) {
    riskLabel = 'High';
    riskColor = '#f97316';
    riskDescription = 'Higher risk with significant growth upside';
  } else {
    riskLabel = 'Speculative';
    riskColor = '#ef4444';
    riskDescription = 'Very high risk — only for risk-tolerant investors';
  }

  return {
    riskScore: Math.min(score, 100),
    riskLabel,
    riskColor,
    riskDescription,
    breakdown: {
      businessAge: { score: businessAge < 1 ? 20 : businessAge < 3 ? 15 : businessAge < 5 ? 10 : businessAge < 10 ? 5 : 0, maxScore: 20 },
      revenueStrength: { score: 25 - (annualRevenue > targetAmount * 5 ? 2 : annualRevenue > targetAmount * 2 ? 6 : annualRevenue > targetAmount ? 12 : annualRevenue > targetAmount * 0.5 ? 18 : 25), maxScore: 25 },
      sectorRisk: { score: sectorScore, maxScore: 20 },
      locationRisk: { score: tier1Cities.some(c => city.toLowerCase().includes(c.toLowerCase())) ? 5 : 10, maxScore: 15 },
      equityDilution: { score: equityPercentage > 15 ? 10 : equityPercentage > 10 ? 7 : 3, maxScore: 10 },
      teamSize: { score: employeeCount < 5 ? 10 : employeeCount < 20 ? 6 : 3, maxScore: 10 },
    },
    reasons,
    disclaimer: 'EDUCATIONAL RISK MODEL ONLY. Not financial advice. Real investment decisions require SEBI-registered advisors.'
  };
};

// GET /api/risk/:msmeId — Get risk score for a specific MSME
const getMSMERisk = async (req, res) => {
  try {
    const { getDb } = require('../config/firebase');
    const db = getDb();
    const doc = await db.collection('msme_listings').doc(req.params.msmeId).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'MSME not found' });
    }

    const data = doc.data();
    const score = computeRiskScore(data);

    // Save risk score back to Firestore
    await db.collection('msme_listings').doc(req.params.msmeId).update({
      riskScore: score.riskScore,
      riskLabel: score.riskLabel,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, data: score });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { calculateRiskScore, getMSMERisk, computeRiskScore };