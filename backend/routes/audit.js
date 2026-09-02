'use strict';
const express = require('express');
const AuditLog = require('../models/AuditLog');
const { protectRoute, requireRole } = require('../middleware/auth');
const { createAuditLog }            = require('../middleware/audit');

const router = express.Router();
// Audit log is strictly Admin-only
router.use(protectRoute, requireRole('Admin'));

// ── GET /api/audit ────────────────────────────────────────────
// Query: search, action, dateFrom, dateTo, page, limit
router.get('/', async (req, res) => {
  try {
    const { search = '', action = 'all', dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (action !== 'all') filter.action = action;
    
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ username: re }, { target: re }, { details: re }];
    }

    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = toDate;
      }
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/audit/clear — Clear old logs ──────────────────
router.delete('/clear', async (req, res) => {
  try {
    const { beforeDate } = req.body;
    if (!beforeDate) return res.status(400).json({ error: 'beforeDate is required.' });

    const result = await AuditLog.deleteMany({ timestamp: { $lt: new Date(beforeDate) } });

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'delete', target: 'Audit Logs',
      details: `Cleared ${result.deletedCount} logs older than ${beforeDate}`,
    });

    res.json({ message: `Cleared ${result.deletedCount} logs.`, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
