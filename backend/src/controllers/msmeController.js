const { getDb } = require('../config/firebase');
const { uploadToIPFS } = require('../config/ipfs');
const { v4: uuidv4 } = require('uuid');
const { computeRiskScore } = require('./riskController');

// POST /api/msme/list — Create new MSME listing
const createMSMEListing = async (req, res) => {
  try {
    const db = getDb();
    const {
      businessName,
      category,
      city,
      gstNumber,
      foundingYear,
      companyValuation,
      equityPercentOffered,
      totalTokenSupply,
      tokensForSale,
      annualRevenue,
      employeeCount,
      businessDescription,
      founderWallet,
      founderName,
      contactEmail,
    } = req.body;

    const companyValuationNum = parseFloat(companyValuation);
    const equityPercentOfferedNum = parseFloat(equityPercentOffered);
    const totalTokenSupplyNum = parseInt(totalTokenSupply, 10);
    const tokensForSaleNum = parseInt(tokensForSale, 10);

    const maxTokensForSale = Math.floor(totalTokenSupplyNum * equityPercentOfferedNum / 100);

    if (!businessName?.trim()) {
      return res.status(400).json({ success: false, message: 'Business name is required' });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }
    if (!city?.trim()) {
      return res.status(400).json({ success: false, message: 'City is required' });
    }
    if (isNaN(companyValuationNum) || companyValuationNum < 100000) {
      return res.status(400).json({ success: false, message: 'Company valuation must be at least ₹1,00,000' });
    }
    if (isNaN(equityPercentOfferedNum) || equityPercentOfferedNum < 1 || equityPercentOfferedNum > 20) {
      return res.status(400).json({ success: false, message: 'Equity percent must be between 1 and 20' });
    }
    if (isNaN(totalTokenSupplyNum) || totalTokenSupplyNum < 10 || totalTokenSupplyNum > 10000) {
      return res.status(400).json({ success: false, message: 'Total token supply must be between 10 and 10,000' });
    }
    if (isNaN(tokensForSaleNum) || tokensForSaleNum < 1 || tokensForSaleNum > maxTokensForSale) {
      return res.status(400).json({ success: false, message: `Tokens for sale must be between 1 and ${maxTokensForSale}` });
    }

    const targetAmount = Math.round(companyValuationNum * equityPercentOfferedNum / 100);
    const tokenPrice = totalTokenSupplyNum ? Math.round(targetAmount / totalTokenSupplyNum) : 0;
    const ownershipPerToken = totalTokenSupplyNum ? Number((equityPercentOfferedNum / totalTokenSupplyNum).toFixed(4)) : 0;
    const founderTokens = totalTokenSupplyNum - tokensForSaleNum;
    const vestingEnd = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    const msmeId = `msme_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    const riskInfo = computeRiskScore({
      annualRevenue: parseFloat(annualRevenue),
      foundingYear: parseInt(foundingYear, 10),
      category,
      city,
      employeeCount: parseInt(employeeCount, 10) || 0,
      targetAmount: targetAmount,
      equityPercentage: equityPercentOfferedNum,
    });

    const msmeData = {
      msmeId,
      businessName: businessName.trim(),
      category,
      city: city.trim(),
      gstNumber: gstNumber?.toUpperCase() || '',
      foundingYear: parseInt(foundingYear, 10) || null,
      companyValuation: companyValuationNum,
      targetAmount,
      equityPercentage: equityPercentOfferedNum,
      equityPercentOffered: equityPercentOfferedNum,
      totalTokenSupply: totalTokenSupplyNum,
      tokensForSale: tokensForSaleNum,
      tokensSold: 0,
      tokenPrice,
      ownershipPerToken,
      founderTokens,
      annualRevenue: parseFloat(annualRevenue) || 0,
      employeeCount: parseInt(employeeCount, 10) || 0,
      businessDescription: businessDescription?.trim() || '',
      founderWallet: founderWallet?.toLowerCase() || '',
      founderName: founderName?.trim() || '',
      contactEmail: contactEmail?.trim() || '',
      status: 'active',
      contractAddress: null,
      onChainId: null,
      tokenSymbol: null,
      ipfsCid: null,
      ipfsUrl: null,
      riskLabel: riskInfo.riskLabel,
      riskScore: riskInfo.riskScore,
      riskDescription: riskInfo.riskDescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vestingEnd,
    };

    const ipfsResult = await uploadToIPFS(msmeData, `${msmeId}.json`);
    msmeData.ipfsCid = ipfsResult.cid;
    msmeData.ipfsUrl = ipfsResult.url;

    await db.collection('msme_listings').doc(msmeId).set(msmeData);

    res.status(201).json({
      success: true,
      message: 'MSME listing created successfully',
      data: {
        msmeId,
        ipfsCid: ipfsResult.cid,
        ipfsUrl: ipfsResult.url,
        status: 'active',
      },
    });
  } catch (err) {
    console.error('createMSMEListing error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/msme/list — Get all active listings (with filters)
const getAllListings = async (req, res) => {
  try {
    const db = getDb();
    const { city, category, riskLevel, status, limit = 20 } = req.query;

    let query = db.collection('msme_listings');

    if (status) {
      query = query.where('status', '==', status);
    } else {
      query = query.where('status', '==', 'active');
    }

    if (city) query = query.where('city', '==', city);
    if (category) query = query.where('category', '==', category);
    if (riskLevel) query = query.where('riskLevel', '==', riskLevel);

    query = query.limit(parseInt(limit, 10));

    const snapshot = await query.get();
    const listings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, count: listings.length, data: listings });
  } catch (err) {
    console.error('getAllListings error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/msme/:msmeId — Get single listing
const getMSMEById = async (req, res) => {
  try {
    const db = getDb();
    const { msmeId } = req.params;
    const doc = await db.collection('msme_listings').doc(msmeId).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'MSME not found' });
    }

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// PATCH /api/msme/:msmeId/contract — Update contract address after deployment
const updateContractAddress = async (req, res) => {
  try {
    const db = getDb();
    const { msmeId } = req.params;
    const { contractAddress, tokenSymbol, txHash, onChainId } = req.body;

    if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid contract address' });
    }

    const updates = {
      contractAddress,
      tokenSymbol,
      deployTxHash: txHash,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    if (onChainId != null) {
      updates.onChainId = onChainId;
    }

    await db.collection('msme_listings').doc(msmeId).update(updates);

    res.json({
      success: true,
      message: 'Contract address updated',
      polygonscanUrl: `https://mumbai.polygonscan.com/address/${contractAddress}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/msme/cities — Get unique cities for filter
const getCities = async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('msme_listings').get();
    const cities = [...new Set(snapshot.docs.map((d) => d.data().city).filter(Boolean))].sort();
    res.json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createMSMEListing, getAllListings, getMSMEById, updateContractAddress, getCities };
