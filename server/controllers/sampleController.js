// controllers/sampleController.js
const Batch = require('../models/Batch');
const uploadToCloudinary = require('../utils/cloudinaryUpload');
const { listBagIds, pickRandomBag } = require('../utils/bagId');
const { asyncHandler, throwError } = require('../utils/errorHandler');

const PARAMS = ['gelThickness', 'impurity', 'rotation', 'colour', 'moisture', 'diameter', 'ringTest'];
const EXACT = ['gelThickness', 'colour', 'ringTest'];
const RANGE = ['impurity', 'rotation', 'moisture', 'diameter'];
const has = (v) => v !== undefined && v !== null && v !== '';
const norm = (v) => String(v ?? '').trim().toLowerCase();

const withinSpec = (m, limits = {}) => {
  for (const k of EXACT) {
    if (has(limits[k]) && norm(m[k]) !== norm(limits[k])) return false;
  }
  for (const k of RANGE) {
    const l = limits[k];
    if (!l || (!has(l.min) && !has(l.max))) continue;
    const v = parseFloat(m[k]);
    if (Number.isNaN(v)) return false;
    if (has(l.min) && v < parseFloat(l.min)) return false;
    if (has(l.max) && v > parseFloat(l.max)) return false;
  }
  return true;
};

const withSpecs = (q) =>
  q.populate('clientSpecId', 'client product limits')
   .populate('standardId', 'authority region limits');

/**
 * STEP 1: user clicks "Sample" on the table row.
 * The SERVER draws one random bag from startingBagId + numberOfBags and saves it.
 * Calling it again returns the same bag (no re-rolling).
 */
exports.assignSampleBag = asyncHandler(async (req, res) => {
  const doc = await withSpecs(Batch.findById(req.params.id));
  if (!doc) throwError('Batch not found', 404);
  if (doc.qcStatus !== 'Awaiting Sample') throwError(`Cannot sample. Status: ${doc.qcStatus}`, 400);

  if (doc.sampledBagId) return res.status(200).json(doc);

  const bagId = pickRandomBag(listBagIds(doc.startingBagId, doc.numberOfBags));

  // Only the first request wins if two clicks race
  const updated = await withSpecs(
    Batch.findOneAndUpdate(
      { _id: doc._id, qcStatus: 'Awaiting Sample', sampledBagId: { $in: [null, ''] } },
      { $set: { sampledBagId: bagId } },
      { new: true }
    )
  );

  res.status(200).json(updated || (await withSpecs(Batch.findById(doc._id))));
});

/**
 * STEP 2: user fills the wet-chem form and clicks "Save Results".
 * The bag is the one drawn in step 1. The verdict is decided here, not by the client.
 */
exports.sampleBatch = asyncHandler(async (req, res) => {
  const doc = await withSpecs(Batch.findById(req.params.id));
  if (!doc) throwError('Batch not found', 404);
  if (doc.qcStatus !== 'Awaiting Sample') throwError(`Cannot sample. Status: ${doc.qcStatus}`, 400);

  const batch = doc.toObject();

  if (!batch.sampledBagId) throwError('Click Sample first to draw the bag', 400);

  // Parse + whitelist measurements
  let raw;
  try { raw = JSON.parse(req.body.measurements || '{}'); }
  catch { throwError('Invalid measurements', 400); }

  const measurements = {};
  PARAMS.forEach((k) => { measurements[k] = String(raw[k] ?? '').trim(); });
  if (PARAMS.some((k) => !measurements[k])) throwError('All measurements are required', 400);

  // Server decides the verdict
  const pass = withinSpec(measurements, batch.clientSpecId?.limits)
            && withinSpec(measurements, batch.standardId?.limits);
  if (!pass) throwError('One or more parameters are outside specs', 400);

  // Optional photo (multer memoryStorage puts it on req.file.buffer)
  const sampleImageUrl = req.file
    ? await uploadToCloudinary(req.file.buffer, 'gradeseal/samples')
    : undefined;

  // Atomic transition so a double-click can't save twice
  const updated = await Batch.findOneAndUpdate(
    { _id: doc._id, qcStatus: 'Awaiting Sample' },
    {
      $set: {
        sampleComments: req.body.comments || '',
        ...(sampleImageUrl && { sampleImageUrl }),
        measurements,
        verdict: 'Pass',
        qcStatus: 'Pending Approval',
      },
    },
    { new: true }
  );
  if (!updated) throwError('Batch was already sampled', 409);

  res.status(200).json(updated);
});
