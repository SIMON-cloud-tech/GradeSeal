require('dotenv').config();

// ─── IMPORTS ───
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');
const { errorHandler } = require('./utils/errorHandler');

// ─── ROUTES ───
// Variable names below are the ones used in app.use() further down.
// Keep the file names exactly as they are on disk (routes/batchRoutes.js holds the multer code).
const authRoutes = require('./routes/authRoute');
const resetRoutes = require('./routes/resetRoute');
const batchRoutes = require('./routes/batchRoute');
const specificationRoutes = require('./routes/specificationRoute');
const coaRoutes = require('./routes/coaRoute');
const scanLogRoutes = require('./routes/scanRoute');

// ─── APP SETUP ───
const app = express();
const PORT = process.env.PORT || 5000;

// No trailing slash: browsers send the Origin header without one, so a slash makes CORS fail
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || (
  process.env.NODE_ENV === 'production'
    ? 'https://gradeseal.onrender.com'
    : 'http://localhost:5173'
);

app.set('trust proxy', 1);

// ─── MIDDLEWARE ───
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
})); // default methods already include GET, POST, PUT, PATCH and DELETE
app.use(express.json());
app.use(cookieParser());

// ─── STATIC FILES ───
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, 'public')));

// ─── API ROUTES ───
app.use('/api', authRoutes);
app.use('/api/reset', resetRoutes);
app.use('/api/batches', batchRoutes);                 // mounted ONCE
app.use('/api/specifications', specificationRoutes);
app.use('/api/coas', coaRoutes);
app.use('/api/scanlogs', scanLogRoutes);              // matches the URL used by ScanLogs.jsx

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── CLIENT-SIDE ROUTING CATCH-ALL ───
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── 404 FOR UNMATCHED API ROUTES ───
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// ─── GLOBAL ERROR HANDLER ───
app.use(errorHandler);

// ─── START SERVER ───
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
});