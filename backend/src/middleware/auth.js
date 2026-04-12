const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'msme-dev-only-secret-change-me';

const requireAuth = (req, res, next) => {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

	if (!token) {
		return res.status(401).json({ success: false, message: 'Authentication required' });
	}

	try {
		const payload = jwt.verify(token, getJwtSecret());
		req.user = {
			userId: payload.sub,
			email: payload.email,
			role: payload.role,
			name: payload.name,
		};
		return next();
	} catch (err) {
		return res.status(401).json({ success: false, message: 'Invalid or expired token' });
	}
};

const requireRole = (...roles) => {
	return (req, res, next) => {
		if (!req.user || !roles.includes(req.user.role)) {
			return res.status(403).json({ success: false, message: 'Forbidden for your role' });
		}
		return next();
	};
};

module.exports = { requireAuth, requireRole };

