// routes/specificationRoutes.js
const express = require('express');
const router = express.Router();
const {
  getSpecifications,
  createSpecification,
  updateSpecification,
  deleteSpecification
} = require('../controllers/specificationController');

router.route('/')
  .get(getSpecifications)
  .post(createSpecification);

router.route('/:id')
  .put(updateSpecification)
  .delete(deleteSpecification);

module.exports = router;