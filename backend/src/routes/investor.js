const express = require('express');
const router = express.Router();
const { validateKYC } = require('../middleware/validation');
const { requireAuth, requireRole } = require('../middleware/auth');
const { submitKYC, getKYCStatus, recordTransaction, getPortfolio } = require('../controllers/investorController');

router.post('/kyc', requireAuth, requireRole('investor', 'admin'), validateKYC, submitKYC);
router.get('/kyc/:wallet', requireAuth, requireRole('investor', 'admin'), getKYCStatus);
router.post('/transaction', requireAuth, requireRole('investor', 'admin'), recordTransaction);
router.get('/portfolio/:wallet', requireAuth, requireRole('investor', 'admin'), getPortfolio);

module.exports = router;