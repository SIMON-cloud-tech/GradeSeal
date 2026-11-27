// controllers/usersController.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { asyncHandler, throwError } = require('../utils/errorHandler');

const VALID_ROLES = ['ceo', 'qa', 'operator', 'buyer'];
const VALID_STATUSES = ['active', 'suspended'];

// ── Helper: Count active CEOs ──
const countActiveCeos = async () => {
  return User.countDocuments({ role: 'ceo', status: 'active' });
};

// ── Helper: Sanitize user for response (strip password) ──
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ──────────────────────────────────────────────────────────────
// @desc    List all users (optionally filtered by search)
// @route   GET /api/users
// @access  CEO only
// ──────────────────────────────────────────────────────────────
exports.getUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let query = {};

  if (search) {
    query = {
      $or: [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { role:  { $regex: search, $options: 'i' } },
      ],
    };
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ role: 1, createdAt: -1 });

  res.status(200).json(users);
});

// ──────────────────────────────────────────────────────────────
// @desc    Get a single user by ID
// @route   GET /api/users/:id
// @access  CEO only
// ──────────────────────────────────────────────────────────────
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throwError('User not found', 404);
  res.status(200).json(user);
});

// ──────────────────────────────────────────────────────────────
// @desc    Create a new user
// @route   POST /api/users
// @access  CEO only
// ──────────────────────────────────────────────────────────────
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, status } = req.body;

  if (!name || !email || !password || !role) {
    throwError('Name, email, password, and role are required', 400);
  }
  if (password.length < 8) {
    throwError('Password must be at least 8 characters', 400);
  }
  if (!VALID_ROLES.includes(role)) {
    throwError(`Role must be one of: ${VALID_ROLES.join(', ')}`, 400);
  }

  const finalStatus = status || 'active';
  if (!VALID_STATUSES.includes(finalStatus)) {
    throwError(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throwError('A user with this email already exists', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    status: finalStatus,
  });

  res.status(201).json(sanitizeUser(newUser));
});

// ──────────────────────────────────────────────────────────────
// @desc    Update a user (name, role, status)
// @route   PUT /api/users/:id
// @access  CEO only
// ──────────────────────────────────────────────────────────────
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, role, status } = req.body;
  const targetId = req.params.id;

  const user = await User.findById(targetId);
  if (!user) throwError('User not found', 404);

  const isSelf = targetId === req.user.id.toString();

  if (role && !VALID_ROLES.includes(role)) {
    throwError(`Role must be one of: ${VALID_ROLES.join(', ')}`, 400);
  }
  if (status && !VALID_STATUSES.includes(status)) {
    throwError(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
  }

  const isDemotingCeo = user.role === 'ceo' && role && role !== 'ceo';
  const isSuspendingCeo = user.role === 'ceo' && status === 'suspended';
  
  if (isDemotingCeo || isSuspendingCeo) {
    const activeCeos = await countActiveCeos();
    if (activeCeos <= 1) {
      throwError('Cannot demote or suspend the last active CEO', 400);
    }
  }

  if (isSelf && status === 'suspended') {
    throwError('You cannot suspend your own account', 400);
  }

  if (name !== undefined)   user.name = name.trim();
  if (role !== undefined)   user.role = role;
  if (status !== undefined) user.status = status;

  await user.save();
  res.status(200).json(sanitizeUser(user));
});

// ──────────────────────────────────────────────────────────────
// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  CEO only
// ──────────────────────────────────────────────────────────────
exports.deleteUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;

  const user = await User.findById(targetId);
  if (!user) throwError('User not found', 404);

  if (targetId === req.user.id.toString()) {
    throwError('You cannot delete your own account', 400);
  }

  if (user.role === 'ceo' && user.status === 'active') {
    const activeCeos = await countActiveCeos();
    if (activeCeos <= 1) {
      throwError('Cannot delete the last active CEO', 400);
    }
  }

  await User.findByIdAndDelete(targetId);
  res.status(200).json({ message: 'User deleted successfully' });
});

// ──────────────────────────────────────────────────────────────
// @desc    Get system public key (for verifying COAs)
// @route   GET /api/users/keys
// @access  CEO only
// ──────────────────────────────────────────────────────────────
exports.getSystemKeys = asyncHandler(async (req, res) => {
  const publicKey = process.env.ED25519_PUBLIC_KEY?.replace(/\\n/g, '\n');
  if (!publicKey) throwError('Public key not configured', 500);

  res.status(200).json({
    algorithm: 'Ed25519',
    publicKey,
  });
});