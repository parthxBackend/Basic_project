/**
 * controllers/messageController.js — Messages within a group.
 *
 * getMessages : Returns all messages for a group sorted oldest-first.
 *               Only group members can fetch messages (enforced server-side).
 * postMessage : Creates a new message. Validates membership + non-empty text.
 *
 * Security: sender ID is always taken from req.user.id (JWT), never from
 * the request body — so a malicious user cannot post as someone else.
 */

const mongoose = require('mongoose');
const Group   = require('../models/Group');
const Message = require('../models/Message');

// ── Helper: check valid ObjectId ───────────────────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── GET /api/groups/:id/messages ───────────────────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params; // group id

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID.' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    // Enforce member-only access — even direct API calls are blocked
    const isMember = group.members.some((m) => m.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Only group members can view messages.',
      });
    }

    // Sort ascending (oldest first) so the feed shows newest at the bottom
    const messages = await Message.find({ group: id })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    res.json({ success: true, message: 'Messages fetched.', data: messages });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/groups/:id/messages ──────────────────────────────────────────
const postMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const text   = (req.body.text || '').trim();

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID.' });
    }

    // Reject empty or whitespace-only messages
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty.',
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 2000 characters.',
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    // Non-members cannot post — block even direct API calls
    const isMember = group.members.some((m) => m.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Only group members can post messages.',
      });
    }

    const message = await Message.create({
      group:  id,
      sender: req.user.id, // From JWT — never from body
      text,
    });

    await message.populate('sender', 'name');

    res.status(201).json({
      success: true,
      message: 'Message posted.',
      data:    message,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMessages, postMessage };
