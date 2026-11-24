// models/Specification.js
const mongoose = require('mongoose');

// Sub-schema for the 8 parameter limits
const limitsSchema = new mongoose.Schema({
  gelThickness: { type: String, default: '' }, // '+++', '++', '+'
  impurity:  { min: String, max: String },
  rotation:  { min: String, max: String },
  colour:    { type: String, default: '' },
  moisture:  { min: String, max: String },
  diameter:  { min: String, max: String },
  ringTest:  { type: String, default: '' } // 'Pass', 'Fail'
}, { _id: false });

const specSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['client', 'government'], // Distinguishes the two tabs
    required: true
  },
  
  // ── Client Spec Fields ──
  client: { 
    type: String, 
    trim: true 
  }, // e.g. "Acme EU"
  
  // ── Government Standard Fields ──
  authority: { 
    type: String, 
    trim: true 
  }, // e.g. "KEBS"
  region: { 
    type: String, 
    trim: true 
  }, // e.g. "Kenya"
  
  // ── Shared Fields ──
  product: { 
    type: String, 
    required: true, 
    trim: true 
  }, // e.g. "Gum Arabic"
  
  limits: { 
    type: limitsSchema, 
    required: true 
  }
  
}, { timestamps: true });

// Optional: Add an index for faster lookups
specSchema.index({ type: 1, product: 1 });

module.exports = mongoose.model('Specification', specSchema);