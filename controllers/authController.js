/**
 * controllers/authController.js — Handles user registration and login.
 *
 * register: Validates input → hashes password with bcrypt → saves User → returns JWT.
 * login:    Finds user by email → verifies bcrypt hash → returns JWT + user info.
 *
 * Security notes:
 *  - Password hashed with salt rounds = 10 (good balance of security vs speed)
 *  - JWT signed with JWT_SECRET, expires in 1 day
 *  - userId is embedded in the token — never passed in request body
 *  - Wrong-password response is intentionally generic (don't reveal which field failed)
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// ── Helper: sign a JWT for a user ──────────────────────────────────────────
const signToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

// ── POST /api/auth/register ─────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Basic server-side validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    // Only allow 'student' or 'admin' roles
    const allowedRoles = ['student', 'admin'];
    const userRole = allowedRoles.includes(role) ? role : 'student';

    // Check for duplicate email BEFORE hashing (faster fail)
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with that email already exists.',
      });
    }

    // Hash the password — bcrypt automatically generates and stores the salt
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password: hashedPassword,
      role:     userRole,
    });

    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data:    { token, user: { id: user._id, name: user.name, role: user.role } },
    });
  } catch (err) {
    next(err); // Pass to central error handler
  }
};

// ── POST /api/auth/login ────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Find user (include password field which is normally excluded)
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Use a constant-time comparison — never reveal whether email or password was wrong
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Role check — ensures admin can't log in on the student login form and vice-versa
    if (role && user.role !== role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials for the selected role.',
      });
    }

    const token = signToken(user);

    res.json({
      success: true,
      message: 'Login successful.',
      data:    { token, user: { id: user._id, name: user.name, role: user.role } },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login };
