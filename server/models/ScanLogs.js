// models/ScanLog.js
const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  // The COA number printed in the QR (e.g. "COA-B-1001"). A plain string, no COA collection exists.
  coaId: { type: String, required: true, trim: true, index: true },
  // Empty when someone scanned the certificate QR instead of a bag QR
  bagId: { type: String, default: '', trim: true },
  // Decided by the server at scan time
  result: {
    type: String,
    enum: ['Valid', 'Invalid Bag', 'Unknown COA', 'Recalled'],
    default: 'Valid'
  },
  location: {
    city: { type: String, default: 'Unknown' },
    country: { type: String, default: 'Unknown' },
    ip: { type: String }
  },
  device: { type: String, default: 'Unknown Device' },
  scannedAt: { type: Date, default: Date.now }
}, { timestamps: true });

scanLogSchema.index({ scannedAt: -1 });

module.exports = mongoose.model('ScanLog', scanLogSchema);