'use strict';
const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  date:          { type: String, required: true },   // ISO date string
  aog:           { type: Number },                    // Age of Gestation (weeks)
  bp:            { type: String },                    // Blood pressure e.g. "120/80"
  weight:        { type: Number },                    // kg
  fundalHeight:  { type: Number },                    // cm
  fhr:           { type: Number },                    // Fetal heart rate (bpm)
  remarks:       { type: String, default: '' },
}, { _id: true, timestamps: false });

const deliverySchema = new mongoose.Schema({
  date:        { type: String },
  type:        { type: String },   // e.g. "Normal Spontaneous Delivery"
  outcome:     { type: String },   // e.g. "Live Birth"
  birthWeight: { type: Number },   // kg
}, { _id: false });

const prenatalSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  age:          { type: Number, required: true },
  lmp:          { type: String, required: true },     // Last Menstrual Period (ISO date)
  edd:          { type: String },                     // Estimated Date of Delivery
  gravida:      { type: Number, default: 1 },
  para:         { type: Number, default: 0 },
  address:      { type: String, default: '' },
  contact:      { type: String, default: '' },
  status:       { type: String, default: 'Active', enum: ['Active', 'Delivered', 'High-Risk', 'Archived'] },
  highRisk:     { type: Boolean, default: false },
  highRiskNote: { type: String, default: '' },
  visits:       [visitSchema],
  delivery:     { type: deliverySchema, default: null },
  createdBy:    { type: String, required: true },
  archived:     { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('PrenatalPatient', prenatalSchema);
