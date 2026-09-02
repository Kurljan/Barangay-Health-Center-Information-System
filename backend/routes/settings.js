'use strict';
const express = require('express');
const Settings = require('../models/Settings');
const { protectRoute, requireRole } = require('../middleware/auth');
const { createAuditLog }            = require('../middleware/audit');

const router = express.Router();
router.use(protectRoute);

// ── GET /api/settings ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/settings ─────────────────────────────────────────
router.put('/', requireRole('Admin'), async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'update', target: 'System Settings',
      details: 'Updated barangay configuration',
    });

    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
