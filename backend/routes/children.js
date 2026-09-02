'use strict';
const express = require('express');
const Child   = require('../models/Child');
const { protectRoute, requireRole } = require('../middleware/auth');
const { createAuditLog }            = require('../middleware/audit');

const router = express.Router();
router.use(protectRoute);

// ── GET /api/children ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ name: re }, { motherName: re }, { address: re }];
    }

    const total = await Child.countDocuments(filter);
    const records = await Child.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ records, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/children/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const record = await Child.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/children — Register child ───────────────────────
router.post('/', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.username };
    const record = await Child.create(data);

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'create', target: `Child: ${record.name}`,
      details: `Registered child for immunization tracking`,
    });

    res.status(201).json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/children/:id — Update record ─────────────────────
router.put('/:id', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const record = await Child.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!record) return res.status(404).json({ error: 'Record not found.' });

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'update', target: `Child: ${record.name}`,
      details: `Updated child details`,
    });

    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/children/:id ──────────────────────────────────
router.delete('/:id', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const record = await Child.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found.' });

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'delete', target: `Child: ${record.name}`,
      details: `Deleted child immunization record`,
    });

    res.json({ message: 'Record deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/children/:id/vaccines — Sync vaccine log ─────────
router.put('/:id/vaccines', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const record = await Child.findByIdAndUpdate(
      req.params.id,
      { vaccines: req.body.vaccines },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Child not found.' });

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'update', target: `Child Vaccines: ${record.name}`,
      details: `Updated immunization record`,
    });

    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
