// controllers/verifyController.js
// PUBLIC endpoint hit by the verify page when someone scans a QR code.
// It decides the result on the server, logs the scan, and returns only what a buyer may see.
const Batch = require('../models/Batch');
const ScanLog = require('../models/ScanLog');
const { listBagIds } = require('../utils/bagId');
const { verifyCoaSignature } = require('../utils/coaSigner');
const { asyncHandler } = require('../utils/errorHandler');

const clean = (v, max = 100) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// @route GET /api/verify/:coaId            (certificate QR)
// @route GET /api/verify/:coaId/:bagId     (bag QR)
exports.verifyScan = asyncHandler(async (req, res) => {
  const coaId = clean(req.params.coaId);
  const bagId = clean(req.params.bagId);

  const batch = await Batch.findOne({ 'coaDetails.coaId': coaId }).lean();

  let result = 'Unknown COA';
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

  // Log every scan (including fake ones). A logging failure must never break verification.
  try {
    await ScanLog.create({
      coaId,
      bagId,
      result,
      location: {
        city: 'Unknown',
        country: clean(req.get('cf-ipcountry'), 10) || 'Unknown', // only present behind Cloudflare
        ip: req.ip,
      },
      device: clean(req.get('user-agent'), 200) || 'Unknown Device',
    });
  } catch (err) {
    console.error('Scan log failed:', err.message);
  }

  res.set('Cache-Control', 'no-store');

  // Never reveal batch details for unknown or suspicious scans
  if (result !== 'Valid') {
    return res.status(200).json({ result, coaId, bagId: bagId || null });
  }

  const snap = batch.coaDetails.coaData || {};
  res.status(200).json({
    result,
    coaId,
    bagId: bagId || null,
    product: batch.productName,
    origin: batch.origin,
    batchNo: batch.batchNo,
    lotNo: batch.lotNo,
    verdict: batch.verdict,
    issuedAt: snap.issuedAt || batch.coaDetails.generatedAt || null,
    measurements: batch.measurements || {},
    pdfUrl: batch.coaDetails.pdfUrl || null,
    signatureValid: verifyCoaSignature(snap), // true | false | null (could not be checked)
  });
});
