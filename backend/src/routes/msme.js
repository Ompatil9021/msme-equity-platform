const express = require('express');
const router = express.Router();
const { validateMSMEListing } = require('../middleware/validation');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  createMSMEListing, getAllListings, getMSMEById,
  updateContractAddress, getCities
} = require('../controllers/msmeController');

router.post('/list', requireAuth, requireRole('entrepreneur', 'admin'), validateMSMEListing, createMSMEListing);
router.get('/list', getAllListings);
router.get('/cities', getCities);
router.get('/:msmeId', getMSMEById);
router.patch('/:msmeId/contract', requireAuth, requireRole('admin', 'entrepreneur'), updateContractAddress);

module.exports = router;