require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initFirebase, getDb } = require('./config/firebase');

const msmeRoutes = require('./routes/msme');
const investorRoutes = require('./routes/investor');
const riskRoutes = require('./routes/risk');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MSME Equity Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    disclaimer: 'HACKATHON PROTOTYPE — TESTNET ONLY — NOT A REAL SECURITIES OFFERING'
  });
});

// Routes
app.use('/api/msme', msmeRoutes);
app.use('/api/investor', investorRoutes);
app.use('/api/risk', riskRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const seedLocalData = async () => {
  if (process.env.FIREBASE_PROJECT_ID) return;

  try {
    const db = getDb();
    const snapshot = await db.collection('msme_listings').get();
    if (snapshot.docs.length > 0) return;

    const sampleListings = [
      {
        msmeId: 'msme_demo_01',
        businessName: 'Asha Textiles',
        category: 'Manufacturing',
        city: 'Surat',
        gstNumber: '24AABPA1234M1Z1',
        foundingYear: 2015,
        targetAmount: 4000000,
        equityPercentage: 15,
        annualRevenue: 2800000,
        employeeCount: 28,
        businessDescription: 'Women-led apparel exporter with local artisans and low-cost manufacturing.',
        founderWallet: '0x0000000000000000000000000000000000000002',
        founderName: 'Asha Patel',
        contactEmail: 'asha@textiles.com',
        status: 'active',
        contractAddress: '0x0000000000000000000000000000000000000003',
        tokenSymbol: 'ATH',
        ipfsCid: 'QmSampleCid01',
        ipfsUrl: 'https://ipfs.io/ipfs/QmSampleCid01',
        riskLabel: 'Moderate',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        msmeId: 'msme_demo_02',
        businessName: 'CityFresh Organics',
        category: 'Food & Beverage',
        city: 'Bengaluru',
        gstNumber: '29AAEPM1234Q1ZB',
        foundingYear: 2019,
        targetAmount: 2500000,
        equityPercentage: 12,
        annualRevenue: 1900000,
        employeeCount: 16,
        businessDescription: 'Farm-to-table grocery microbrand selling fresh produce through neighbourhood delivery.',
        founderWallet: '0x0000000000000000000000000000000000000004',
        founderName: 'Ramesh Kumar',
        contactEmail: 'ramesh@cityfresh.com',
        status: 'active',
        contractAddress: '0x0000000000000000000000000000000000000005',
        tokenSymbol: 'CFO',
        ipfsCid: 'QmSampleCid02',
        ipfsUrl: 'https://ipfs.io/ipfs/QmSampleCid02',
        riskLabel: 'High',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const item of sampleListings) {
      await db.collection('msme_listings').doc(item.msmeId).set(item);
    }

    console.log('✅ Seeded local sample MSME listings for development.');
  } catch (err) {
    console.warn('Failed to seed local sample data:', err.message || err);
  }
};

// Start
initFirebase();
seedLocalData().catch((err) => console.warn('seedLocalData error:', err));
app.listen(PORT, () => {
  console.log(`\n🚀 MSME Equity Platform API running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`⚠️  HACKATHON PROTOTYPE — TESTNET ONLY\n`);
});