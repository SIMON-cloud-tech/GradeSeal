// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, throwError } = require('../utils/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });
};

const setAuthCookie = (res, token) => {
  res.cookie('token', token, COOKIE_OPTIONS);
};

const clearAuthCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
};

// ── FIXED: includes role + status ──
const sendUserResponse = (res, user, status = 200) => {
  res.status(status).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,        // ← ADD
      status: user.status,    // ← ADD
    },
  });
};

// ─── REGISTER (unchanged) ───
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  const userCount = await User.countDocuments();
  if (userCount > 0) {
    throwError('Registration is disabled. Only the admin account is allowed.', 403);
  }

  if (!fullName || !email || !password) {
    throwError('All fields are required');
  }
  if (password.length < 8) {
    throwError('Password must be at least 8 characters');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throwError('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    name: fullName,
    email: normalizedEmail,
    password: hashedPassword,
    status: 'active',
    role: 'ceo',
  });
  await newUser.save();

  const token = generateToken(newUser);
  setAuthCookie(res, token);
  sendUserResponse(res, newUser, 201);
});

// ─── LOGIN (unchanged) ───
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throwError('Email and password required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throwError('Invalid credentials', 401);
  }

  if (user.status !== 'active') {
    throwError('Account is suspended', 403);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throwError('Invalid credentials', 401);
  }

  const token = generateToken(user);
  setAuthCookie(res, token);
  sendUserResponse(res, user);
});

// ─── GET PROFILE (unchanged — auto-picks up the fix) ───
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    throwError('User not found', 404);
  }
  sendUserResponse(res, user);
});

// ─── LOGOUT (unchanged) ───
exports.logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
});