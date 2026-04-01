const express = require('express');
const router = express.Router();
const { calculateRiskScore, getMSMERisk } = require('../controllers/riskController');

router.post('/calculate', calculateRiskScore);
router.get('/:msmeId', getMSMERisk);

module.exports = router;