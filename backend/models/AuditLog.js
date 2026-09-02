'use strict';
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  username: { type: String, required: true },
  role:     { type: String, required: true },
  action:   {
    type: String,
    required: true,
    enum: ['login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'archive', 'restore', 'reset_password', 'upload'],
  },
  target:   { type: String, required: true },    // e.g. "User: maria", "Prenatal: Liza Fernandez"
  details:  { type: String, default: '' },        // optional extra info
  timestamp: { type: Date, default: Date.now },
});

// Index for efficient filtering and time-range queries
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ username: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
