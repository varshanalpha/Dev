const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, execute } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_antigravity';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        let { username, email, password, bio, avatar_url } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required.'
            });
        }

        username = username.trim();
        email = email.trim().toLowerCase();

        // Validation rules
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({
                success: false,
                message: 'Username must be between 3 and 30 characters long.'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        // Check if user already exists
        const existingEmail = queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        const existingUsername = queryOne('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUsername) {
            return res.status(409).json({
                success: false,
                message: 'This username is already taken. Please choose another.'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Default avatar if none provided
        const defaultAvatar = avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(username)}`;

        // Insert new user
        const result = execute(
            `INSERT INTO users (username, email, password_hash, bio, avatar_url)
             VALUES (?, ?, ?, ?, ?)`,
            [username, email, passwordHash, bio || '', defaultAvatar]
        );

        const newUser = queryOne('SELECT id, username, email, bio, avatar_url, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
        const token = generateToken(newUser);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully!',
            user: newUser,
            token
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { identifier, email, password } = req.body;
        const loginId = (identifier || email || '').trim();

        if (!loginId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/username and password are required.'
            });
        }

        // Search by email or username
        const user = queryOne(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [loginId.toLowerCase(), loginId]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials. User not found.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials. Incorrect password.'
            });
        }

        // Safe user object
        const safeUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            bio: user.bio,
            avatar_url: user.avatar_url,
            created_at: user.created_at
        };

        const token = generateToken(safeUser);

        return res.status(200).json({
            success: true,
            message: 'Login successful!',
            user: safeUser,
            token
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/me
exports.getCurrentUser = async (req, res, next) => {
    try {
        const stats = queryOne(
            `SELECT 
                (SELECT COUNT(*) FROM posts WHERE author_id = ?) as post_count,
                (SELECT COUNT(*) FROM comments WHERE author_id = ?) as comment_count`,
            [req.user.id, req.user.id]
        );

        return res.status(200).json({
            success: true,
            user: {
                ...req.user,
                stats: {
                    posts: Number(stats?.post_count || 0),
                    comments: Number(stats?.comment_count || 0)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
    });
};
