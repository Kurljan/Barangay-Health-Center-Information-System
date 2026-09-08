'use strict';
const mongoose = require('mongoose');

const vaccineGivenSchema = new mongoose.Schema({
  vaccineId: { type: String, required: true },  // e.g. 'bcg', 'hepb', 'dpt'
  dose:      { type: Number, required: true },   // 1, 2, 3...
  date:      { type: String, required: true },   // ISO date given
  givenBy:   { type: String, default: '' },
}, { _id: true });

const childSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  dob:         { type: String, required: true },    // Date of birth (ISO date string)
  sex:         { type: String, required: true, enum: ['Male', 'Female'] },
  motherName:  { type: String, required: true, trim: true },
  address:     { type: String, default: '' },
  purok:       { type: String, default: '' },
  contact:     { type: String, default: '' },
  vaccines:    [vaccineGivenSchema],               // Array of doses actually given
  createdBy:   { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Child', childSchema);
