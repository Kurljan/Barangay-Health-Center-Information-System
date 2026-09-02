'use strict';
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // 'generated' = auto-generated from data | 'scanned' = uploaded photo/PDF
  type:         { type: String, required: true, enum: ['generated', 'scanned'] },
  title:        { type: String, required: true },
  program:      { type: String, enum: ['Prenatal', 'Immunization', 'Senior/Chronic', 'Other', ''] },
  month:        { type: Number, min: 1, max: 12, default: null },
  year:         { type: Number, default: null },
  // For generated reports — raw data snapshot (JSON)
  dataSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  // For scanned uploads — base64 data URL and file metadata
  fileType:     { type: String, default: '' },
  fileName:     { type: String, default: '' },
  dataUrl:      { type: String, default: '' },   // base64 encoded
  docType:      { type: String, default: '' },   // "Prenatal Report", "FHSIS Form", etc.
  generatedBy:  { type: String, required: true },
}, { timestamps: true });

// Index for report history queries
reportSchema.index({ createdAt: -1 });
reportSchema.index({ type: 1, program: 1, year: -1, month: -1 });

module.exports = mongoose.model('Report', reportSchema);
