// controllers/coaController.js
// There is no separate COA collection. A "COA" is an Approved batch with coaDetails,
// so this reads the Batch model and returns objects shaped for COAsManage / PrintQueue.
const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Specification = require('../models/Specifications');
const { asyncHandler, throwError } = require('../utils/errorHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const BASE_QUERY = { qcStatus: 'Approved', 'coaDetails.coaId': { $exists: true } };

// Card / table row
const toCoaView = (b) => ({
  _id: b._id, // batch id: also what /api/batches/:id/manifest, /labels and /printed take
  coaId: b.coaDetails.coaId,
  batch: {
    _id: b._id,
    batchNo: b.batchNo,
    lotNo: b.lotNo,
    client: b.clientSpecId?.client || null,
  },
  sampledBagId: b.sampledBagId,
  verdict: b.verdict,
  comments: b.sampleComments,
  photoUrl: b.sampleImageUrl,
  qrCount: b.coaDetails.qrCount,
  coaPdfUrl: b.coaDetails.pdfUrl,
  status: b.coaDetails.status, // 'Approved' | 'Printed'
  lastPrintedAt: b.coaDetails.lastPrintedAt || null,
  createdAt: b.coaDetails.generatedAt || b.updatedAt,
});

// Detail page: adds results and the spec limits that were certified at approval time
const toCoaDetail = (b) => {
  const snap = b.coaDetails.coaData || {};
  return {
    ...toCoaView(b),
    productName: b.productName,
    origin: b.origin,
    palletNumber: b.palletNumber,
    numberOfBags: b.numberOfBags,
    startingBagId: b.startingBagId,
    measurements: b.measurements || {},
    clientLimits: snap.clientSpec?.limits || b.clientSpecId?.limits || {},
    standardLimits: snap.govStandard?.limits || b.standardId?.limits || {},
    standardName: [snap.govStandard?.authority || b.standardId?.authority, snap.govStandard?.region || b.standardId?.region]
      .filter(Boolean).join(' - ') || null,
    issuedAt: snap.issuedAt || b.coaDetails.generatedAt || null,
    signature: snap.signature || null,
  };
};

// @route GET /api/coas?search=&status=Approved|Printed
exports.getCOAs = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const query = { ...BASE_QUERY };

  if (status) query['coaDetails.status'] = status;

  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    const clientIds = await Specification.find({ type: 'client', client: rx }).distinct('_id');
    query.$or = [
      { 'coaDetails.coaId': rx },
      { sampledBagId: rx },
      { batchNo: rx },
      { clientSpecId: { $in: clientIds } },
    ];
  }

  const batches = await Batch.find(query)
    .populate('clientSpecId', 'client product')
    .sort({ 'coaDetails.generatedAt': -1 })
    .limit(500)
    .lean();

  res.status(200).json(batches.map(toCoaView));
});

// @route GET /api/coas/:id   (id = batch id)
exports.getCOAById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throwError('COA not found', 404);

  const batch = await Batch.findOne({ _id: req.params.id, ...BASE_QUERY })
    .populate('clientSpecId', 'client product limits')
    .populate('standardId', 'authority region limits')
    .lean();

  if (!batch) throwError('COA not found', 404);
  res.status(200).json(toCoaDetail(batch));
});