'use strict';
const AuditLog = require('../models/AuditLog');

/**
 * createAuditLog — Helper to manually log an action.
 * Called directly in route handlers for fine-grained control.
 */
const createAuditLog = async ({ userId, username, role, action, target, details }) => {
  try {
    await AuditLog.create({ userId, username, role, action, target, details });
  } catch (err) {
    // Audit failures should never crash the main request
    console.error('Audit log error:', err.message);
  }
};

/**
 * auditLog — Express middleware factory.
 * Usage: router.post('/...', protectRoute, auditLog('create', 'User'), handler)
 *
 * The action and target are static strings; you can also call createAuditLog()
 * directly inside route handlers when you need dynamic targets.
 */
const auditLog = (action, target) => {
  return async (req, res, next) => {
    // Run after the response is sent
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Only log successful mutations (2xx responses)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        await createAuditLog({
          userId:   req.user._id,
          username: req.user.username,
          role:     req.user.role,
          action,
          target,
          details: `${req.method} ${req.originalUrl}`,
        });
      }
      return originalJson(body);
    };
    next();
  };
};

module.exports = { auditLog, createAuditLog };
