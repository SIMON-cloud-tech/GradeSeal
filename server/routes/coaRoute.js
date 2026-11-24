// routes/coaRoutes.js
const express = require('express');
const router = express.Router();
const { getCOAs, getCOAById } = require('../controllers/coaController');

router.route('/').get(getCOAs);
router.route('/:id').get(getCOAById);

module.exports = router;