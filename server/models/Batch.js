// models/Batch.js
const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  // ── Core Batch Info ──
  batchNo: { type: String, required: true, unique: true, trim: true },
  lotNo: { type: String, required: true, trim: true },
  productName: { type: String, required: true, trim: true },
  origin: { type: String, required: true, trim: true },
  palletNumber: { type: String, required: true, trim: true },
  startingBagId: { type: String, required: true, trim: true },
  numberOfBags: { type: Number, required: true, min: 1 },
  comments: { type: String, default: '' },

  // ── Lifecycle Status ──
  qcStatus: {
    type: String,
    enum: ['Awaiting Sample', 'Pending Approval', 'Approved', 'Recalled'],
    default: 'Awaiting Sample'
  },

  // ── References to specs (chosen when the batch is created) ──
  clientSpecId: { type: mongoose.Schema.Types.ObjectId, ref: 'Specification', required: true },
  standardId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Specification', required: true },

  // ── Sampling & Wet-Chem Results ──
  sampledBagId: { type: String },   // drawn at random by the server when "Sample" is clicked
  sampleImageUrl: { type: String },
  sampleComments: { type: String },
  measurements: {
    gelThickness: { type: String },
    impurity: { type: String },
    rotation: { type: String },
    colour: { type: String },
    moisture: { type: String },
    diameter: { type: String },
    ringTest: { type: String }
  },
  verdict: { type: String, enum: ['Pass', 'Fail'] },

  // ── COA & Print Assets (filled on Approve) ──
  // QR images are NOT stored. They are regenerated on demand from
  // coaId + verifyBaseUrl + startingBagId/numberOfBags/sampledBagId.
  coaDetails: {
    coaId: { type: String },
    pdfUrl: { type: String },
    qrCount: { type: Number },
    verifyBaseUrl: { type: String },                  // domain printed into the QRs at approval time
    coaData: { type: mongoose.Schema.Types.Mixed },   // signed COA object: signature + exact issuedAt
    status: { type: String, enum: ['Pending Signature', 'Approved', 'Printed'] },
    generatedAt: { type: Date },
    lastPrintedAt: { type: Date }                     // set by PATCH /api/batches/:id/printed
  }
}, { timestamps: true });

batchSchema.index({ 'coaDetails.coaId': 1 }, { sparse: true });
batchSchema.index({ qcStatus: 1, 'coaDetails.generatedAt': -1 });

module.exports = mongoose.model('Batch', batchSchema);