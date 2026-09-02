'use strict';
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  barangayName:     { type: String, default: 'Barangay San Jose' },
  municipality:     { type: String, default: 'Municipality of San Pedro, Laguna' },
  healthCenterName: { type: String, default: 'San Jose Barangay Health Center' },
  address:          { type: String, default: 'Brgy. San Jose, San Pedro, Laguna 4023' },
  contact:          { type: String, default: '(049) 561-2345' },
}, { timestamps: true });

// Only ever one settings document in the collection (singleton pattern)
module.exports = mongoose.model('Settings', settingsSchema);
