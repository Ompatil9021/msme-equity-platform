require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initFirebase } = require('./config/firebase');

const msmeRoutes = require('./routes/msme');
const investorRoutes = require('./routes/investor');
const riskRoutes = require('./routes/risk');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
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

// Start
initFirebase();
app.listen(PORT, () => {
  console.log(`\n🚀 MSME Equity Platform API running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`⚠️  HACKATHON PROTOTYPE — TESTNET ONLY\n`);
});