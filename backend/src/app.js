const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const { UPLOADS_DIR } = require('./services/photoService');

const authRoutes = require('./routes/auth');
const wardsRoutes = require('./routes/wards');
const categoriesRoutes = require('./routes/categories');
const complaintsRoutes = require('./routes/complaints');
const statsRoutes = require('./routes/stats');
const mapRoutes = require('./routes/map');
const publicRoutes = require('./routes/public');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Base API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wards', wardsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'CivicTrack Nagpur API',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;

