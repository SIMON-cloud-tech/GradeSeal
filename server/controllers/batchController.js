// controllers/batchController.js
const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Specification = require('../models/Specifications');
const { listBagIds } = require('../utils/bagIds');
const { asyncHandler, throwError } = require('../utils/errorHandler');

const STATUSES = ['Awaiting Sample', 'Pending Approval', 'Approved', 'Recalled'];
const MAX_BAGS = 10000;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v) => (typeof v === 'string' ? v.trim() : '');

const populateSpecs = (q) =>
  q.populate('clientSpecId', 'client product limits')
   .populate('standardId', 'authority region limits');

// @desc    Create a batch (status always starts as "Awaiting Sample")
// @route   POST /api/batches
exports.createBatch = asyncHandler(async (req, res) => {
  const b = req.body || {};

  // Whitelist: qcStatus, sampledBagId, verdict etc. can never be set from the client here
  const data = {
    batchNo: str(b.batchNo),
    lotNo: str(b.lotNo),
    productName: str(b.productName),
    origin: str(b.origin),
    palletNumber: str(b.palletNumber),
    startingBagId: str(b.startingBagId),
    comments: str(b.comments),
    numberOfBags: Number(b.numberOfBags),
    clientSpecId: str(b.clientSpecId),
    standardId: str(b.standardId),
  };

  const missing = ['batchNo', 'lotNo', 'productName', 'origin', 'palletNumber', 'startingBagId']
    .filter((k) => !data[k]);
  if (missing.length) throwError(`Missing required field(s): ${missing.join(', ')}`, 400);

  if (!Number.isInteger(data.numberOfBags) || data.numberOfBags < 1 || data.numberOfBags > MAX_BAGS) {
    throwError(`Number of bags must be a whole number between 1 and ${MAX_BAGS}`, 400);
  }

  // The same helper that sampling and printing use, so a bad ID can never get saved
  try {
    listBagIds(data.startingBagId, data.numberOfBags);
  } catch {
    throwError('Starting Bag ID must end in a number, e.g. BAG-0001', 400);
  }

  if (!mongoose.isValidObjectId(data.clientSpecId) || !mongoose.isValidObjectId(data.standardId)) {
    throwError('Select a client specification and a government standard', 400);
  }

  const [clientSpec, standard] = await Promise.all([
    Specification.findOne({ _id: data.clientSpecId, type: 'client' }).select('_id'),
    Specification.findOne({ _id: data.standardId, type: 'government' }).select('_id'),
  ]);
  if (!clientSpec) throwError('Client specification not found', 400);
  if (!standard) throwError('Government standard not found', 400);

  // A duplicate batchNo is turned into a 409 by the global error handler
  const batch = await Batch.create(data);
  const saved = await populateSpecs(Batch.findById(batch._id)).lean();

  res.status(201).json(saved);
});

// @desc    List batches (search + optional status filter)
// @route   GET /api/batches?search=&status=Approved
exports.getBatches = asyncHandler(async (req, res) => {
  const search = str(req.query.search);
  const status = str(req.query.status);
  const query = {};

  if (status) {
    if (!STATUSES.includes(status)) throwError('Invalid status filter', 400);
    query.qcStatus = status;
  }

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const clientIds = await Specification.find({ type: 'client', client: rx }).distinct('_id');
    query.$or = [
      { batchNo: rx },
      { lotNo: rx },
      { productName: rx },
      { origin: rx },
      { sampledBagId: rx },
      { clientSpecId: { $in: clientIds } },
    ];
  }

  const batches = await populateSpecs(Batch.find(query))
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  res.status(200).json(batches);
});

// @desc    Recall an approved batch. Every other status change goes through
//          /assign-sample, /sample and /approve, which enforce the rules.
// @route   PUT /api/batches/:id/status   body: { qcStatus: 'Recalled' }
exports.updateBatchStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throwError('Batch not found', 404);

  if (str(req.body?.qcStatus) !== 'Recalled') {
    throwError("Only 'Recalled' can be set here. Use the sample and approve actions for other changes.", 400);
  }

  const updated = await populateSpecs(
    Batch.findOneAndUpdate(
      { _id: id, qcStatus: 'Approved' },
      { $set: { qcStatus: 'Recalled' } },
      { new: true }
    )
  );

  if (!updated) {
    const exists = await Batch.exists({ _id: id });
    throwError(exists ? 'Only approved batches can be recalled' : 'Batch not found', exists ? 400 : 404);
  }

  res.status(200).json(updated);
});