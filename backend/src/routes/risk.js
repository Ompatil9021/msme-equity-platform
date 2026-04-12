const express = require('express');
const router = express.Router();
const { calculateRiskScore, getMSMERisk } = require('../controllers/riskController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/calculate', requireAuth, requireRole('entrepreneur', 'admin', 'investor'), calculateRiskScore);
router.get('/:msmeId', requireAuth, requireRole('entrepreneur', 'admin', 'investor'), getMSMERisk);

module.exports = router;