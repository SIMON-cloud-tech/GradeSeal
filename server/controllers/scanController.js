// controllers/scanLogController.js
const ScanLog = require('../models/ScanLog');
const Batch = require('../models/Batch');
const { listBagIds } = require('../utils/bagId');
const { asyncHandler, throwError } = require('../utils/errorHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// @desc    Get scan logs (admin dashboard)
// @route   GET /api/scanlogs?search=
exports.getScanLogs = asyncHandler(async (req, res) => {
  const search = clean(req.query.search);
  let query = {};

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    query = {
      $or: [
        { coaId: rx },
        { bagId: rx },
        { result: rx },
        { 'location.country': rx },
        { 'location.city': rx },
      ],
    };
  }

  const logs = await ScanLog.find(query)
    .sort({ scannedAt: -1 })
    .limit(500) // Security limit
    .lean();

  res.status(200).json(logs);
});

// @desc    Log a scan (Public: called by the verify page when a QR is opened)
// @route   POST /api/scanlogs
// Body: { coaId, bagId?, city?, country?, device? }
exports.createScanLog = asyncHandler(async (req, res) => {
  const coaId = clean(req.body.coaId, 100);
  const bagId = clean(req.body.bagId, 100);

  if (!coaId) throwError('COA ID is required', 400);

  // The server decides whether the scan is genuine. The client is never trusted for this.
  let result = 'Unknown COA';
  const batch = await Batch.findOne({ 'coaDetails.coaId': coaId })
    .select('qcStatus startingBagId numberOfBags sampledBagId');

  if (batch) {
    if (batch.qcStatus === 'Recalled') {
      result = 'Recalled';
    } else {
      result = 'Valid';
      if (bagId) {
        let inRange = false;
        try {
          inRange = listBagIds(batch.startingBagId, batch.numberOfBags).includes(bagId);
        } catch { /* malformed startingBagId: treat as not in range */ }
        // The sampled bag never gets a label, so a scan of it is suspicious too
        if (!inRange || bagId === batch.sampledBagId) result = 'Invalid Bag';
      }
    }
  }

  await ScanLog.create({
    coaId,
    bagId,
    result,
    location: {
      city: clean(req.body.city) || 'Unknown',
      country: clean(req.body.country) || 'Unknown',
      ip: req.ip, // set app.set('trust proxy', 1) in server.js if you sit behind a proxy
    },
    device: clean(req.body.device) || clean(req.get('user-agent')) || 'Unknown Device',
  });

  res.status(201).json({ message: 'Scan logged successfully', result });
});
