const jwt = require('jsonwebtoken');
const { queryOne } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_antigravity';

// Authenticate user via JWT in Authorization header: Bearer <token>
const requireAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = queryOne('SELECT id, username, email, bio, avatar_url, created_at FROM users WHERE id = ?', [decoded.id]);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User belonging to this token no longer exists.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Authentication token has expired. Please log in again.' });
        }
        return res.status(500).json({ success: false, message: 'Internal authentication error.' });
    }
};

// Optional auth - populates req.user if valid token provided, but doesn't block request
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = queryOne('SELECT id, username, email, bio, avatar_url, created_at FROM users WHERE id = ?', [decoded.id]);
            if (user) {
                req.user = user;
            }
        }
    } catch {
        // Ignore invalid token in optional auth
    }
    next();
};

module.exports = {
    requireAuth,
    optionalAuth
};
