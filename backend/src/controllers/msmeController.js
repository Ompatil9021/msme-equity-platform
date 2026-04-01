const { getDb } = require('../config/firebase');
const { uploadToIPFS } = require('../config/ipfs');
const { v4: uuidv4 } = require('uuid');

// POST /api/msme/list — Create new MSME listing
const createMSMEListing = async (req, res) => {
  try {
    const db = getDb();
    const {
      businessName, category, city, gstNumber, foundingYear,
      targetAmount, equityPercentage, annualRevenue,
      employeeCount, businessDescription, founderWallet,
      founderName, contactEmail
    } = req.body;

    const msmeId = `msme_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    // Build MSME data object
    const msmeData = {
      msmeId,
      businessName: businessName.trim(),
      category,
      city: city.trim(),
      gstNumber: gstNumber.toUpperCase(),
      foundingYear: parseInt(foundingYear),
      targetAmount: parseFloat(targetAmount),
      equityPercentage: parseFloat(equityPercentage),
      annualRevenue: parseFloat(annualRevenue),
      employeeCount: parseInt(employeeCount) || 0,
      businessDescription: businessDescription?.trim() || '',
      founderWallet: founderWallet.toLowerCase(),
      founderName: founderName?.trim() || '',
      contactEmail: contactEmail?.trim() || '',
      status: 'pending_review',     // pending_review | active | funded | failed
      contractAddress: null,        // Will be set after blockchain deploy
      tokenSymbol: null,
      ipfsCid: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Upload to IPFS
    const ipfsResult = await uploadToIPFS(msmeData, `${msmeId}.json`);
    msmeData.ipfsCid = ipfsResult.cid;
    msmeData.ipfsUrl = ipfsResult.url;

    // Save to Firestore
    await db.collection('msme_listings').doc(msmeId).set(msmeData);

    res.status(201).json({
      success: true,
      message: 'MSME listing created successfully',
      data: {
        msmeId,
        ipfsCid: ipfsResult.cid,
        ipfsUrl: ipfsResult.url,
        status: 'pending_review',
      }
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

    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    const listings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
    const { contractAddress, tokenSymbol, txHash } = req.body;

    if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid contract address' });
    }

    await db.collection('msme_listings').doc(msmeId).update({
      contractAddress,
      tokenSymbol,
      deployTxHash: txHash,
      status: 'active',
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Contract address updated',
      polygonscanUrl: `https://mumbai.polygonscan.com/address/${contractAddress}`
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
    const cities = [...new Set(snapshot.docs.map(d => d.data().city).filter(Boolean))].sort();
    res.json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createMSMEListing, getAllListings, getMSMEById, updateContractAddress, getCities };