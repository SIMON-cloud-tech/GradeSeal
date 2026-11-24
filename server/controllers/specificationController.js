// controllers/specificationController.js
const Specification = require('../models/Specifications');
const { asyncHandler, throwError } = require('../utils/errorHandler');

// @desc    Get all specifications (filtered by type: 'client' or 'government')
// @route   GET /api/specifications?type=government
exports.getSpecifications = asyncHandler(async (req, res) => {
  const { type, search } = req.query;
  
  if (!type) throwError('Please specify a type (client or government)', 400);

  let query = { type };

  if (search) {
    query.$or = [
      { client: { $regex: search, $options: 'i' } },
      { authority: { $regex: search, $options: 'i' } },
      { product: { $regex: search, $options: 'i' } }
    ];
  }

  const specs = await Specification.find(query).sort({ createdAt: -1 });
  res.status(200).json(specs);
});

// @desc    Create a new spec (Client or Gov)
// @route   POST /api/specifications
exports.createSpecification = asyncHandler(async (req, res) => {
  const newSpec = new Specification(req.body);
  const savedSpec = await newSpec.save();
  
  if (!savedSpec) throwError('Failed to create specification', 400);
  
  res.status(201).json(savedSpec);
});

// @desc    Update an existing spec
// @route   PUT /api/specifications/:id
exports.updateSpecification = asyncHandler(async (req, res) => {
  const spec = await Specification.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!spec) throwError('Specification not found', 404);

  res.status(200).json(spec);
});

// @desc    Delete a spec
// @route   DELETE /api/specifications/:id
exports.deleteSpecification = asyncHandler(async (req, res) => {
  const spec = await Specification.findByIdAndDelete(req.params.id);
  if (!spec) throwError('Specification not found', 404);
  
  res.status(200).json({ message: 'Specification deleted' });
});