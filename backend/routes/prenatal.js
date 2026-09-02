'use strict';
const express = require('express');
const Prenatal = require('../models/PrenatalPatient');
const { protectRoute, requireRole } = require('../middleware/auth');
const { createAuditLog }            = require('../middleware/audit');

const router = express.Router();
router.use(protectRoute);

// ── GET /api/prenatal ─────────────────────────────────────────
// Query: search, status, archived, page, limit
router.get('/', async (req, res) => {
  try {
    const { search = '', status = 'all', archived = 'false', page = 1, limit = 20 } = req.query;
    const filter = { archived: archived === 'true' };
    if (status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { address: new RegExp(search, 'i') },
      ];
    }

    const total = await Prenatal.countDocuments(filter);
    const records = await Prenatal.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ records, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/prenatal/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const record = await Prenatal.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/prenatal — Register patient ─────────────────────
router.post('/', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.username };
    const record = await Prenatal.create(data);

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'create', target: `Prenatal: ${record.name}`,
      details: `Registered prenatal patient`,
    });

    res.status(201).json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/prenatal/:id — Update record ─────────────────────
router.put('/:id', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const record = await Prenatal.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!record) return res.status(404).json({ error: 'Record not found.' });

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'update', target: `Prenatal: ${record.name}`,
      details: `Updated prenatal record`,
    });

    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/prenatal/:id/visits — Add visit log ─────────────
router.post('/:id/visits', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const record = await Prenatal.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Patient not found.' });

    record.visits.push(req.body);
    await record.save();

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'create', target: `Prenatal Visit: ${record.name}`,
      details: `Added prenatal visit log`,
    });

    res.status(201).json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/prenatal/:id/visits/:visitId — Remove a visit ─
router.delete('/:id/visits/:visitId', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const record = await Prenatal.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Patient not found.' });

    record.visits = record.visits.filter(v => v._id.toString() !== req.params.visitId);
    await record.save();

    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/prenatal/:id/archive — Archive record ────────────
router.put('/:id/archive', requireRole('Midwife', 'Admin'), async (req, res) => {
  try {
    const record = await Prenatal.findByIdAndUpdate(
      req.params.id,
      { archived: true, status: 'Archived' },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Record not found.' });

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'archive', target: `Prenatal: ${record.name}`,
      details: `Archived prenatal record`,
    });

    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
