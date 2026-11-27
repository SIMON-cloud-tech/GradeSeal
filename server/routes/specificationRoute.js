// routes/specificationRoutes.js
const express = require('express');
const router = express.Router();

// 1. Import the bouncers
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const {
  getSpecifications,
  createSpecification,
  updateSpecification,
  deleteSpecification
} = require('../controllers/specificationController');

// 2. Require a valid JWT for every route in this file
router.use(authMiddleware);

// 3. Define who can do what
router.route('/')
  // Any internal staff can VIEW specs (needed for dropdowns in batches)
  .get(requireRole('ceo', 'qa', 'operator'), getSpecifications)
  // ONLY CEO and QA can CREATE specs
  .post(requireRole('ceo', 'qa'), createSpecification);

router.route('/:id')
  // ONLY CEO and QA can UPDATE specs
  .put(requireRole('ceo', 'qa'), updateSpecification)
  // ONLY CEO and QA can DELETE specs
  .delete(requireRole('ceo', 'qa'), deleteSpecification);

module.exports = router;