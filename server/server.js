require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Ensure database is initialized
require('./config/db');

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Serve frontend static assets from public directory
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// API Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'online',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Mount REST API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// Catch API 404s
app.all('/api/*', notFoundHandler);

// Single Page Application (SPA) routing fallback for all client routes
app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralized error handler
app.use(errorHandler);

// Start server if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`===============================================`);
        console.log(`🚀 Blog Platform Server running on port ${PORT}`);
        console.log(`🌐 Web Client: http://localhost:${PORT}`);
        console.log(`📡 API Base:   http://localhost:${PORT}/api`);
        console.log(`===============================================`);
    });
}

module.exports = app;
