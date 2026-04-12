const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');

const VALID_ROLES = ['entrepreneur', 'investor', 'admin'];
const DEFAULT_ADMIN_EMAIL = 'admin@msme.local';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DEFAULT_ADMIN_NAME = 'Platform Admin';

const getJwtSecret = () => process.env.JWT_SECRET || 'msme-dev-only-secret-change-me';

const issueToken = (user) => {
  return jwt.sign(
    {
      sub: user.userId,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    getJwtSecret(),
    { expiresIn: '7d' },
  );
};

const findUserByEmail = async (db, email) => {
  const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
  if (!snapshot.docs.length) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

const sanitizeUser = (user) => ({
  userId: user.userId,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const register = async (req, res) => {
  try {
    const db = getDb();
    const { name, email, password, role } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedRole = String(role || '').trim().toLowerCase();

    if (!String(name || '').trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!password || String(password).length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
    }
    if (!VALID_ROLES.includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role selected' });
    }

    const existing = await findUserByEmail(db, normalizedEmail);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Account already exists for this email' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    const userDoc = {
      userId,
      name: String(name).trim(),
      email: normalizedEmail,
      role: normalizedRole,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('users').doc(userId).set(userDoc);

    const token = issueToken(userDoc);
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: sanitizeUser(userDoc),
      },
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const db = getDb();
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await findUserByEmail(db, normalizedEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash || '');
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = issueToken(user);
    return res.json({
      success: true,
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const me = async (req, res) => {
  try {
    return res.json({ success: true, data: { user: req.user } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listUsers = async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map((doc) => sanitizeUser(doc.data()));
    return res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const seedDefaultAdmin = async () => {
  const db = getDb();
  const existing = await findUserByEmail(db, DEFAULT_ADMIN_EMAIL);
  if (existing) return;

  const now = new Date().toISOString();
  const adminUserId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  await db.collection('users').doc(adminUserId).set({
    userId: adminUserId,
    name: DEFAULT_ADMIN_NAME,
    email: DEFAULT_ADMIN_EMAIL,
    role: 'admin',
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  console.log('✅ Seeded default admin account: admin@msme.local');
};

module.exports = {
  register,
  login,
  me,
  listUsers,
  seedDefaultAdmin,
};
