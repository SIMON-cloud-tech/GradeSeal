// controllers/approveController.js
const Batch = require('../models/Batch');
const PDFDocument = require('pdfkit');
const { generateQR } = require('../utils/qrGenerator');
const { signCoa } = require('../utils/coaSigner');
const { uploadPdfToCloudinary } = require('../utils/uploadToCloudinary');
const { asyncHandler, throwError } = require('../utils/errorHandler');

// Fixed order + labels, so blank values print as "—" instead of "undefined"
const PARAMS = [
  ['gelThickness', 'Gel Thickness'],
  ['impurity', 'Impurity'],
  ['rotation', 'Rotation'],
  ['colour', 'Colour'],
  ['moisture', 'Moisture'],
  ['diameter', 'Diameter'],
  ['ringTest', 'Ring Test'],
];

exports.approveBatch = asyncHandler(async (req, res) => {
  const doc = await Batch.findById(req.params.id)
    .populate('clientSpecId', 'client product limits')
    .populate('standardId', 'authority region limits');

  if (!doc) throwError('Batch not found', 404);
  if (doc.qcStatus !== 'Pending Approval') throwError(`Cannot approve. Status: ${doc.qcStatus}`, 400);
  if (doc.verdict !== 'Pass') throwError('Cannot approve a failed sample', 400);
  if (!doc.sampledBagId) throwError('No sampled bag recorded for this batch', 400);

  const baseUrl = process.env.PUBLIC_URL || (process.env.NODE_ENV === 'production' ? null : 'http://localhost:5173');
  if (!baseUrl) throwError('PUBLIC_URL is not configured', 500);

  const batch = doc.toObject(); // plain object: safe to sign, print and store
  const coaId = `COA-${batch.batchNo}`;

  // 1. Structured COA data
  const coaData = {
    coaId,
    issuedAt: new Date().toISOString(),
    product: batch.productName,
    origin: batch.origin,
    batchNo: batch.batchNo,
    lotNo: batch.lotNo,
    sampledBagId: batch.sampledBagId,
    measurements: batch.measurements || {},
    verdict: batch.verdict,
    clientSpec: batch.clientSpecId,
    govStandard: batch.standardId,
  };

  // 2. Sign (never issue an unsigned COA)
  coaData.signature = signCoa(coaData);
  if (!coaData.signature) throwError('Signing key not configured', 500);

  // 3. Single QR for the certificate itself (bag QRs are generated at print time)
  const coaQrBuf = Buffer.from(
    (await generateQR(`${baseUrl}/verify/${coaId}`)).split(',')[1],
    'base64'
  );

  // 4. Build the PDF in memory
  const pdfBuffer = await new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    pdf.fontSize(20).text('Certificate of Analysis', { align: 'center' });
    pdf.moveDown();
    pdf.fontSize(12).text(`COA ID: ${coaData.coaId}`);
    pdf.text(`Batch: ${coaData.batchNo} | Lot: ${coaData.lotNo}`);
    pdf.text(`Product: ${coaData.product} | Origin: ${coaData.origin}`);
    pdf.text(`Sampled Bag: ${coaData.sampledBagId}`);
    pdf.moveDown();
    pdf.text(`Verdict: ${coaData.verdict}`);
    pdf.text(`Issued: ${coaData.issuedAt}`);
    pdf.moveDown();
    pdf.text('Measurements:', { underline: true });
    PARAMS.forEach(([key, label]) => {
      pdf.text(`  ${label}: ${coaData.measurements[key] ?? '—'}`);
    });
    pdf.moveDown();
    pdf.text('Scan to verify:');
    pdf.image(coaQrBuf, pdf.x, pdf.y, { fit: [110, 110] });
    pdf.moveDown(8); // move the cursor below the image
    pdf.fontSize(9).text(`Digital Signature (Ed25519): ${coaData.signature}`, { width: 495 });

    pdf.end();
  });

  // 5. Upload the PDF
  const pdfUrl = await uploadPdfToCloudinary(pdfBuffer, coaId);

  // 6. Atomic save: only succeeds if still Pending Approval (blocks double-click races)
  const updated = await Batch.findOneAndUpdate(
    { _id: doc._id, qcStatus: 'Pending Approval' },
    {
      $set: {
        qcStatus: 'Approved',
        coaDetails: {
          coaId,
          pdfUrl,
          verifyBaseUrl: baseUrl,
          coaData,
          qrCount: batch.numberOfBags, // (bags - sampled bag) + 1 COA QR
          status: 'Approved',
          generatedAt: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!updated) throwError('Batch was already approved', 409);

  res.status(200).json(updated);
});
