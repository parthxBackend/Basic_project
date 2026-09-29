/**
 * routes/authRoutes.js — Authentication routes.
 *
 * POST /api/auth/register  → create account
 * POST /api/auth/login     → login + receive JWT
 *
 * No auth middleware here — these are public endpoints.
 */

const express = require('express');
const router  = express.Router();
const { register, login } = require('../controllers/authController');

router.post('/register', register);
router.post('/login',    login);

module.exports = router;
