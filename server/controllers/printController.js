// controllers/printController.js
// The print queue has no collection of its own: it is "Approved batches" read from the Batch model.
// QR codes are generated here on demand (manifest list, label sheet PDF) and never stored.
const PDFDocument = require('pdfkit');
const Batch = require('../models/Batch');
const { buildQrTargets, buildBatchQrManifest, generateQRBuffer } = require('../utils/qrGenerator');
const { asyncHandler, throwError } = require('../utils/errorHandler');

const clampInt = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
};

const loadApproved = async (id) => {
  const batch = await Batch.findById(id);
  if (!batch) throwError('Batch not found', 404);
  if (batch.qcStatus !== 'Approved' || !batch.coaDetails?.coaId) {
    throwError('This batch has no approved COA to print', 400);
  }
  if (!batch.coaDetails.verifyBaseUrl) throwError('Verify URL is missing on this COA', 500);
  return batch;
};

// @route GET /api/batches/:id/manifest
// Light list of what will be printed (identifiers only, no images).
exports.getPrintManifest = asyncHandler(async (req, res) => {
  const batch = await loadApproved(req.params.id);
  const { coaId, verifyBaseUrl, pdfUrl, status } = batch.coaDetails;

  const items = buildQrTargets(batch.toObject(), coaId, verifyBaseUrl).map(({ type, id }) => ({ type, id }));

  res.status(200).json({
    batchNo: batch.batchNo,
    coaId,
    pdfUrl,
    status,
    sampledBagId: batch.sampledBagId,
    verifyBaseUrl,
    // QRs approved against a localhost address only open on the developer's machine
    localUrlWarning: /localhost|127\.0\.0\.1/i.test(verifyBaseUrl),
    total: items.length,
    items,
  });
});

// @route GET /api/batches/:id/labels?cols=3&rows=8
// Streams an A4 sheet PDF of QR labels, generated on the fly. Nothing is saved.
// First label is the certificate QR, the rest are one per bag (sampled bag excluded).
exports.getLabelsPdf = asyncHandler(async (req, res) => {
  const batch = await loadApproved(req.params.id);
  const { coaId, verifyBaseUrl } = batch.coaDetails;

  const cols = clampInt(req.query.cols, 1, 6, 3);
  const rows = clampInt(req.query.rows, 1, 12, 8);
  const targets = buildQrTargets(batch.toObject(), coaId, verifyBaseUrl);

  const PAGE_W = 595.28; // A4 in points
  const PAGE_H = 841.89;
  const M = 20;          // outer margin
  const cellW = (PAGE_W - 2 * M) / cols;
  const cellH = (PAGE_H - 2 * M) / rows;
  const qrSize = Math.max(20, Math.min(cellW - 10, cellH - 28));
  const perPage = cols * rows;

  // margin: 0 so PDFKit never starts an automatic page break; we place everything ourselves
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="labels-${coaId}.pdf"`);
  doc.pipe(res);

  for (let start = 0; start < targets.length; start += perPage) {
    const pageItems = targets.slice(start, start + perPage);
    const images = await Promise.all(pageItems.map((t) => generateQRBuffer(t.qrUrl)));
    if (start > 0) doc.addPage();

    pageItems.forEach((t, i) => {
      const x = M + (i % cols) * cellW;
      const y = M + Math.floor(i / cols) * cellH;

      // faint dashed cut line
      doc.save().lineWidth(0.5).strokeColor('#bbbbbb').dash(2, { space: 2 })
        .rect(x, y, cellW, cellH).stroke().undash().restore();

      doc.image(images[i], x + (cellW - qrSize) / 2, y + 4, { width: qrSize, height: qrSize });

      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8)
        .text(t.type === 'COA' ? 'CERTIFICATE' : t.id, x, y + qrSize + 8, { width: cellW, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(6)
        .text(coaId, x, y + qrSize + 18, { width: cellW, align: 'center', lineBreak: false });
    });
  }

  doc.end();
});

// @route GET /api/batches/:id/qr-labels
// Same QRs as JSON data URLs (for a custom label printer). Not used by the dashboard.
exports.getQrLabels = asyncHandler(async (req, res) => {
  const batch = await loadApproved(req.params.id);
  const { coaId, verifyBaseUrl, pdfUrl } = batch.coaDetails;

  const { coaQr, bagQrs } = await buildBatchQrManifest(batch.toObject(), coaId, verifyBaseUrl);

  res.status(200).json({
    batchNo: batch.batchNo,
    coaId,
    pdfUrl,
    sampledBagId: batch.sampledBagId,
    total: bagQrs.length + 1,
    coaQr,
    bagQrs,
  });
});

// @route PATCH /api/batches/:id/printed
// Flips coaDetails.status to 'Printed'. Safe to call again on a reprint.
exports.markPrinted = asyncHandler(async (req, res) => {
  const updated = await Batch.findOneAndUpdate(
    { _id: req.params.id, qcStatus: 'Approved', 'coaDetails.coaId': { $exists: true } },
    { $set: { 'coaDetails.status': 'Printed', 'coaDetails.lastPrintedAt': new Date() } },
    { new: true }
  );
  if (!updated) throwError('Batch has no approved COA to mark as printed', 400);
  res.status(200).json(updated);
});