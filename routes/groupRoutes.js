/**
 * routes/groupRoutes.js — Student group and message endpoints.
 *
 * All routes require a valid JWT (protect middleware).
 *
 * IMPORTANT: "/mine" must be declared BEFORE "/:id" — otherwise Express would
 * interpret "mine" as a group ObjectId and the route would never match.
 */

const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/auth');

const {
  getAllGroups,
  createGroup,
  joinGroup,
  getMyGroups,
  getGroupById,
} = require('../controllers/groupController');

const { getMessages, postMessage } = require('../controllers/messageController');

// Apply auth middleware to all group routes
router.use(protect);

// Group endpoints
router.get('/',          getAllGroups);   // GET  /api/groups
router.post('/',         createGroup);   // POST /api/groups
router.get('/mine',      getMyGroups);   // GET  /api/groups/mine  ← must be before /:id
router.get('/:id',       getGroupById);  // GET  /api/groups/:id
router.post('/:id/join', joinGroup);     // POST /api/groups/:id/join

// Message endpoints (nested under groups)
router.get('/:id/messages',  getMessages);  // GET  /api/groups/:id/messages
router.post('/:id/messages', postMessage);  // POST /api/groups/:id/messages

module.exports = router;
