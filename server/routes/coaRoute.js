// routes/coaRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { getCOAs, getCOAById } = require('../controllers/coaController');

router.use(authMiddleware);

// All four roles can READ COAs.
// The controller must filter by req.user.role so buyers only see their own.
router.route('/')
  .get(requireRole('ceo', 'qa', 'operator', 'buyer'), getCOAs);

router.route('/:id')
  .get(requireRole('ceo', 'qa', 'operator', 'buyer'), getCOAById);

module.exports = router;