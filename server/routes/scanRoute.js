// routes/scanLogRoutes.js
const express = require('express');
const router = express.Router();
const { getScanLogs, createScanLog } = require('../controllers/scanController');

router.route('/')
  .get(getScanLogs)
  .post(createScanLog);

module.exports = router;