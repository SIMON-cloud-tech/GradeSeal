// routes/verifyRoute.js — KEEP PUBLIC
const express = require('express');
const router = express.Router();
const { verifyScan } = require('../controllers/verifyController');

// No authMiddleware. No requireRole. This is intentional.
router.get('/:coaId', verifyScan);
router.get('/:coaId/:bagId', verifyScan);

module.exports = router;