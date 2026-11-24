// routes/batchRoute.js
const express = require('express');
const multer = require('multer');
const router = express.Router();

const { createBatch, getBatches, updateBatchStatus } = require('../controllers/batchController');
const { assignSampleBag, sampleBatch } = require('../controllers/sampleController');
const { approveBatch } = require('../controllers/approveController');
const { getPrintManifest, getLabelsPdf, getQrLabels, markPrinted } = require('../controllers/printController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.route('/')
  .get(getBatches)
  .post(createBatch);

router.route('/:id/status')
  .put(updateBatchStatus);

router.post('/:id/assign-sample', assignSampleBag);              // click "Sample": draw the bag
router.post('/:id/sample', upload.single('photo'), sampleBatch); // click "Save Results"
router.post('/:id/approve', approveBatch);                       // click "Approve": COA PDF

router.get('/:id/manifest', getPrintManifest);                   // what will be printed (ids only)
router.get('/:id/labels', getLabelsPdf);                         // QR label sheet PDF, generated on the fly
router.get('/:id/qr-labels', getQrLabels);                       // same QRs as JSON (optional)
router.patch('/:id/printed', markPrinted);                       // after printing

module.exports = router;