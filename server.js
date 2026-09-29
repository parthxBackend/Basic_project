/**
 * server.js — Entry point of the application.
 *
 * What it does:
 *  1. Loads environment variables from .env
 *  2. Connects to MongoDB via mongoose
 *  3. Sets up Express with middleware (CORS, JSON parsing)
 *  4. Mounts all API route handlers
 *  5. Serves the frontend (public/ folder) for any non-API request
 *  6. Starts the HTTP server on the configured PORT
 */

const express = require('express');
const path    = require('path');
const cors    = require('cors');
require('dotenv').config();

const connectDB      = require('./config/db');
const authRoutes     = require('./routes/authRoutes');
const groupRoutes    = require('./routes/groupRoutes');
const adminRoutes    = require('./routes/adminRoutes');
const errorHandler   = require('./middleware/errorHandler');

// ── Bootstrap ──────────────────────────────────────────────────────────────
const app = express();

// Connect to MongoDB (exits process on failure)
connectDB();

// ── Global middleware ───────────────────────────────────────────────────────
app.use(cors());                          // Allow cross-origin requests (useful in dev)
app.use(express.json());                  // Parse incoming JSON bodies

// ── API routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);       // /api/auth/register, /api/auth/login
app.use('/api/groups', groupRoutes);      // all student group + message endpoints
app.use('/api/admin',  adminRoutes);      // admin-only stats, user/group management

// ── Frontend (static) ───────────────────────────────────────────────────────
// Express serves every HTML/CSS/JS file from public/.
// This means the whole app ships as ONE service — no separate CDN needed.
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: any unknown route returns index (login) page so client-side
// routing works when a user refreshes a page directly.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ── Central error handler ───────────────────────────────────────────────────
// Must be registered AFTER routes so it catches errors thrown by them.
app.use(errorHandler);

// ── Start server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
