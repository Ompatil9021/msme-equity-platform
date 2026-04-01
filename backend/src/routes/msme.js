const express = require('express');
const router = express.Router();
const { validateMSMEListing } = require('../middleware/validation');
const {
  createMSMEListing, getAllListings, getMSMEById,
  updateContractAddress, getCities
} = require('../controllers/msmeController');

router.post('/list', validateMSMEListing, createMSMEListing);
router.get('/list', getAllListings);
router.get('/cities', getCities);
router.get('/:msmeId', getMSMEById);
router.patch('/:msmeId/contract', updateContractAddress);

module.exports = router;