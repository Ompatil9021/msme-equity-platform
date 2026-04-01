const validateMSMEListing = (req, res, next) => {
  const {
    businessName, category, city, gstNumber,
    foundingYear, targetAmount, equityPercentage,
    annualRevenue, founderWallet
  } = req.body;

  const errors = [];

  if (!businessName || businessName.trim().length < 3)
    errors.push("Business name must be at least 3 characters");

  const validCategories = [
    'Food & Beverage', 'Retail', 'Manufacturing',
    'Technology', 'Healthcare', 'Education',
    'Agriculture', 'Textile', 'Construction', 'Services'
  ];
  if (!validCategories.includes(category))
    errors.push(`Category must be one of: ${validCategories.join(', ')}`);

  if (!city || city.trim().length < 2)
    errors.push("City is required");

  // GST validation — 15 char alphanumeric
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstNumber || !gstRegex.test(gstNumber.toUpperCase()))
    errors.push("Invalid GST number format (e.g., 27AABCU9603R1ZX)");

  const year = parseInt(foundingYear);
  if (!foundingYear || year < 1950 || year > new Date().getFullYear())
    errors.push("Invalid founding year");

  const target = parseFloat(targetAmount);
  if (!targetAmount || target < 100000 || target > 5000000)
    errors.push("Target amount must be ₹1 lakh to ₹50 lakhs");

  const equity = parseFloat(equityPercentage);
  if (!equityPercentage || equity < 1 || equity > 20)
    errors.push("Equity percentage must be 1% to 20%");

  const revenue = parseFloat(annualRevenue);
  if (!annualRevenue || revenue < 0)
    errors.push("Annual revenue must be a positive number");

  const walletRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!founderWallet || !walletRegex.test(founderWallet))
    errors.push("Invalid Ethereum wallet address");

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validateKYC = (req, res, next) => {
  const { walletAddress, fullName, panNumber, aadhaarLast4 } = req.body;

  const errors = [];

  const walletRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!walletAddress || !walletRegex.test(walletAddress))
    errors.push("Invalid wallet address");

  if (!fullName || fullName.trim().length < 3)
    errors.push("Full name required");

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panNumber || !panRegex.test(panNumber.toUpperCase()))
    errors.push("Invalid PAN number format");

  if (!aadhaarLast4 || !/^\d{4}$/.test(aadhaarLast4))
    errors.push("Last 4 digits of Aadhaar required");

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

module.exports = { validateMSMEListing, validateKYC };