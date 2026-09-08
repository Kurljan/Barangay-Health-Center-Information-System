'use strict';
const express = require('express');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const User    = require('../models/User');
const { protectRoute }  = require('../middleware/auth');
const { createAuditLog } = require('../middleware/audit');

const router = express.Router();

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is inactive. Contact the administrator.' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Update last login — use updateOne to bypass pre-save hook overhead
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Audit log — fire-and-forget so it doesn't delay the login response
    createAuditLog({
      userId:   user._id,
      username: user.username,
      role:     user.role,
      action:   'login',
      target:   `User: ${user.username}`,
      details:  'User logged in successfully',
    }).catch(err => console.error('Audit log failed:', err.message));

    res.json({
      token,
      user: {
        id:       user._id,
        name:     user.name,
        username: user.username,
        role:     user.role,
        contact:  user.contact,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', protectRoute, async (req, res) => {
  await createAuditLog({
    userId:   req.user._id,
    username: req.user.username,
    role:     req.user.role,
    action:   'logout',
    target:   `User: ${req.user.username}`,
    details:  'User logged out',
  });
  res.json({ message: 'Logged out successfully.' });
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', protectRoute, (req, res) => {
  res.json({ user: req.user });
});

// ── PUT /api/auth/change-username ─────────────────────────────
router.put('/change-username', protectRoute, async (req, res) => {
  try {
    const { newUsername, password } = req.body;
    if (!newUsername || !password) return res.status(400).json({ error: 'Username and password are required.' });
    
    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect.' });

    const exists = await User.findOne({ username: newUsername.toLowerCase().trim() });
    if (exists && exists._id.toString() !== user._id.toString()) {
      return res.status(400).json({ error: 'That username is already taken.' });
    }

    const old = user.username;
    user.username = newUsername.toLowerCase().trim();
    await user.save();

    await createAuditLog({
      userId: user._id, username: user.username, role: user.role,
      action: 'update', target: `User: ${old}`,
      details: `Changed username to ${user.username}`,
    });

    res.json({ message: 'Username updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/auth/change-password ─────────────────────────────
router.put('/change-password', protectRoute, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    user.passwordHash = newPassword;   // pre('save') will hash it
    await user.save();

    await createAuditLog({
      userId:   user._id,
      username: user.username,
      role:     user.role,
      action:   'update',
      target:   `User: ${user.username}`,
      details:  'Password changed by user',
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
