'use strict';
const express = require('express');
const Report  = require('../models/Report');
const { protectRoute, requireRole } = require('../middleware/auth');
const { createAuditLog }            = require('../middleware/audit');

const router = express.Router();
router.use(protectRoute);

// ── GET /api/reports ──────────────────────────────────────────
// Query: type (generated|scanned)
router.get('/', async (req, res) => {
  try {
    const { type = 'generated' } = req.query;
    const reports = await Report.find({ type }).sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/reports — Save new report ───────────────────────
router.post('/', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const { type, title } = req.body;
    const data = { ...req.body, generatedBy: req.user.username };
    const report = await Report.create(data);

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: type === 'scanned' ? 'upload' : 'create',
      target: `Report: ${title}`,
      details: type === 'scanned' ? 'Uploaded scanned report' : 'Generated monthly report',
    });

    res.status(201).json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/reports/:id ───────────────────────────────────
router.delete('/:id', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'delete', target: `Report: ${report.title}`,
      details: `Deleted ${report.type} report`,
    });

    res.json({ message: 'Report deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
