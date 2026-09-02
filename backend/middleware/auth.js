'use strict';
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protectRoute — Verifies the JWT token in the Authorization header.
 * Attaches the decoded user to req.user.
 */
const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach full user document (without passwordHash)
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is inactive. Contact the administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

/**
 * requireRole — Role-based access guard.
 * Usage: requireRole('Admin') or requireRole('Admin', 'Midwife')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}.`,
      });
    }
    next();
  };
};

module.exports = { protectRoute, requireRole };
