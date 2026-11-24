// routes/verifyRoute.js  (PUBLIC: no auth middleware here)
const express = require('express');
const router = express.Router();
const { verifyScan } = require('../controllers/verifyController');

router.get('/:coaId', verifyScan);        // certificate QR
router.get('/:coaId/:bagId', verifyScan); // bag QR

module.exports = router;