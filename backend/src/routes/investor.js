const express = require('express');
const router = express.Router();
const { validateKYC } = require('../middleware/validation');
const { submitKYC, getKYCStatus, recordTransaction, getPortfolio } = require('../controllers/investorController');

router.post('/kyc', validateKYC, submitKYC);
router.get('/kyc/:wallet', getKYCStatus);
router.post('/transaction', recordTransaction);
router.get('/portfolio/:wallet', getPortfolio);

module.exports = router;