/**
 * middleware/role.js — Role-based access control middleware factory.
 *
 * Usage:  router.use(protect, requireRole('admin'))
 *
 * After the protect middleware has verified the JWT and set req.user,
 * this middleware checks that req.user.role matches one of the allowed roles.
 *
 * Returns a 403 Forbidden response if the role doesn't match, so a student
 * can never access admin routes even with a valid token.
 */

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
};

module.exports = requireRole;
