const express = require('express');
const { login, register, me, listUsers } = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.get('/users', requireAuth, requireRole('admin'), listUsers);

module.exports = router;
