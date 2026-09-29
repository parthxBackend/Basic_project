/**
 * routes/adminRoutes.js — Admin-only platform management routes.
 *
 * Every route here requires:
 *  1. protect    — valid JWT
 *  2. requireRole('admin') — role must be 'admin' in the token
 *
 * Students with a valid token will still get 403 Forbidden.
 */

const express      = require('express');
const router       = express.Router();
const protect      = require('../middleware/auth');
const requireRole  = require('../middleware/role');

const {
  getStats,
  getUsers,
  deleteUser,
  getGroups,
  deleteGroup,
} = require('../controllers/adminController');

// Lock ALL admin routes behind both middlewares
router.use(protect, requireRole('admin'));

router.get('/stats',          getStats);      // GET    /api/admin/stats
router.get('/users',          getUsers);      // GET    /api/admin/users
router.delete('/users/:id',   deleteUser);    // DELETE /api/admin/users/:id
router.get('/groups',         getGroups);     // GET    /api/admin/groups
router.delete('/groups/:id',  deleteGroup);   // DELETE /api/admin/groups/:id

module.exports = router;
