/**
 * middleware/auth.js — JWT authentication middleware.
 *
 * How it works:
 *  1. Reads the Authorization header: "Bearer <token>"
 *  2. Verifies the token using our JWT_SECRET
 *  3. Attaches the decoded payload (id, name, role) to req.user
 *  4. Calls next() so the actual route handler runs
 *
 * If the token is missing, malformed, or expired it responds 401 immediately.
 * We NEVER read userId from req.body — always from the verified token payload.
 */

const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  // Look for the token in the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided. Please log in.',
    });
  }

  const token = authHeader.split(' ')[1]; // Extract just the token part

  try {
    // jwt.verify throws if the token is expired or tampered with
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, name, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired. Please log in again.',
    });
  }
};

module.exports = protect;
