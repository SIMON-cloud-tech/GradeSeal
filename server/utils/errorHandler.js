// utils/errorHandler.js

// ── 1. Async Handler ──
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ── 2. Global Error Handler ──
// Turns common Mongo / Mongoose / Multer failures into readable messages,
// because the frontend shows err.message straight to the user.
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message || err);

  if (res.headersSent) return next(err);

  let status = err.status || 500;
  let message = err.message || 'Server error';

  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field ? `${field} already exists` : 'Duplicate value';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID or value';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or smaller' : err.message;
  } else if (status >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Server error'; // don't leak internals in production
  }

  res.status(status).json({ message });
};

// ── 3. Helper: Throw error with status ──
const throwError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

module.exports = { asyncHandler, errorHandler, throwError };