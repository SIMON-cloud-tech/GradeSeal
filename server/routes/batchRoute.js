// routes/batchRoute.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const { createBatch, getBatches, updateBatchStatus } = require('../controllers/batchController');
const { assignSampleBag, sampleBatch } = require('../controllers/sampleController');
const { approveBatch } = require('../controllers/approveController');
const { getPrintManifest, getLabelsPdf, getQrLabels, markPrinted } = require('../controllers/printController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Every route here requires auth
router.use(authMiddleware);

// ── Batches ──
router.route('/')
  .get(getBatches)                                            // anyone authenticated can read
  .post(requireRole('ceo', 'qa', 'operator'), createBatch);   // only staff can create

router.route('/:id/status')
  .put(requireRole('ceo', 'qa'), updateBatchStatus);          // only CEO/QA can recall

// ── Sampling ──
// FIX: Path comes FIRST, then middleware
router.post('/:id/assign-sample', requireRole('ceo', 'qa', 'operator'), assignSampleBag);
router.post('/:id/sample', requireRole('ceo', 'qa', 'operator'), upload.single('photo'), sampleBatch);

// ── Approvals ──
router.post('/:id/approve', requireRole('ceo', 'qa'), approveBatch);

// ── Printing ──
router.get('/:id/manifest', requireRole('ceo', 'qa', 'operator'), getPrintManifest);
router.get('/:id/labels', requireRole('ceo', 'qa', 'operator'), getLabelsPdf);
router.get('/:id/qr-labels', requireRole('ceo', 'qa', 'operator'), getQrLabels);
router.patch('/:id/printed', requireRole('ceo', 'qa', 'operator'), markPrinted);

module.exports = router;