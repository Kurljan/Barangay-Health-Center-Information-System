'use strict';
const express = require('express');
const bcrypt  = require('bcryptjs');
const User    = require('../models/User');
const { protectRoute, requireRole } = require('../middleware/auth');
const { createAuditLog }            = require('../middleware/audit');

const router = express.Router();
// All user management routes are Admin-only
router.use(protectRoute, requireRole('Admin'));

// ── GET /api/users ────────────────────────────────────────────
// Query params: search, role, status, page, limit
router.get('/', async (req, res) => {
  try {
    const { search = '', role = 'all', status = 'all', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role   !== 'all') filter.role   = role;
    if (status !== 'all') filter.status = status;
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ name: re }, { username: re }];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users — Create user ─────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, username, password, role, contact } = req.body;
    if (!name || !username || !password || !role) {
      return res.status(400).json({ error: 'Name, username, password, and role are required.' });
    }

    const exists = await User.findOne({ username: username.toLowerCase().trim() });
    if (exists) return res.status(400).json({ error: 'Username already taken.' });

    const user = await User.create({
      name, username, passwordHash: password, role, contact: contact || '',
    });

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'create', target: `User: ${username}`,
      details: `Created ${role} account for ${name}`,
    });

    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/users/:id — Update user ──────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, contact, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, contact, role },
      { new: true, runValidators: true, select: '-passwordHash' }
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'update', target: `User: ${user.username}`,
      details: `Updated user details`,
    });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/users/:id/status — Toggle Active/Archived ────────
router.put('/:id/status', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot change your own status.' });
    }

    user.status = user.status === 'Active' ? 'Archived' : 'Active';
    await user.save({ validateBeforeSave: false });

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: user.status === 'Active' ? 'restore' : 'archive',
      target: `User: ${user.username}`,
      details: `User status changed to ${user.status}`,
    });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/users/:id/reset-password ─────────────────────────
router.put('/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.passwordHash = newPassword;   // pre('save') hashes it
    await user.save();

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'reset_password', target: `User: ${user.username}`,
      details: `Password reset by admin`,
    });

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/users/:id — Permanently delete ─────────────────
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    await user.deleteOne();

    await createAuditLog({
      userId: req.user._id, username: req.user.username, role: req.user.role,
      action: 'delete', target: `User: ${user.username}`,
      details: `Permanently deleted user account`,
    });

    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
