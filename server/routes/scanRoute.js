// routes/scanLogRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { getScanLogs, createScanLog } = require('../controllers/scanController');

// GET: only internal staff can read scan logs
router.get('/', authMiddleware, requireRole('ceo', 'qa', 'operator'), getScanLogs);

// POST: PUBLIC — the VerifyPage calls this from a phone with no login.
// Rate-limit this separately (see note below) to prevent spam.
router.post('/', createScanLog);

module.exports = router;