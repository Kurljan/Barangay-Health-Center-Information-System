'use strict';
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const connectDB = require('./config/db');

// ── Route Imports ──────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const usersRoutes    = require('./routes/users');
const prenatalRoutes = require('./routes/prenatal');
const childrenRoutes = require('./routes/children');
const auditRoutes    = require('./routes/audit');
const reportsRoutes  = require('./routes/reports');
const settingsRoutes = require('./routes/settings');

const app = express();

// ── Connect Database ──────────────────────────────────────────
connectDB();

// ── Global Middleware ─────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));   // large limit for base64 report images
app.use(express.urlencoded({ extended: true }));

// ── Debug Logging ──────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    usersRoutes);
app.use('/api/prenatal', prenatalRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/audit',    auditRoutes);
app.use('/api/reports',  reportsRoutes);
app.use('/api/settings', settingsRoutes);

// ── Serve Frontend Static Files ───────────────────────────────
// The frontend lives one directory up: c:\Combined\
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// SPA fallback — serve app.html for any non-API route (the actual BHIS application)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(FRONTEND_DIR, 'app.html'));
  } else {
    res.status(404).json({ error: 'API route not found' });
  }
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 BHIS API running at http://localhost:${PORT}`);
  console.log(`   Frontend served at  http://localhost:${PORT}`);
  console.log(`   API base:           http://localhost:${PORT}/api`);
});
