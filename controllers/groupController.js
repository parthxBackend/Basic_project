/**
 * controllers/groupController.js — CRUD for study groups.
 *
 * getAllGroups   : Returns every group with memberCount + isMember flag for the caller.
 * createGroup   : Validates name/subject, creates group, auto-adds creator as member.
 * joinGroup     : Adds the caller to members[] (rejects duplicates with 409).
 * getMyGroups   : Returns only groups the caller belongs to.
 * getGroupById  : Full details + members list (members only).
 *
 * Business rules enforced here (not just in the UI):
 *  - name and subject are mandatory and non-whitespace
 *  - Creator auto-joins (added to members array at creation)
 *  - Duplicate join → 409
 *  - Non-member detail fetch → 403
 */

const mongoose = require('mongoose');
const Group    = require('../models/Group');

// ── Helper: check if a string ObjectId is valid ────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── GET /api/groups ─────────────────────────────────────────────────────────
const getAllGroups = async (req, res, next) => {
  try {
    // Populate creator name for display on the card
    const groups = await Group.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    const userId = req.user.id;

    // Add derived fields: memberCount and isMember (did the current user join?)
    const enriched = groups.map((g) => ({
      _id:         g._id,
      name:        g.name,
      subject:     g.subject,
      createdBy:   g.createdBy,
      memberCount: g.members.length,
      isMember:    g.members.some((m) => m.toString() === userId),
      createdAt:   g.createdAt,
    }));

    res.json({ success: true, message: 'Groups fetched.', data: enriched });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/groups ────────────────────────────────────────────────────────
const createGroup = async (req, res, next) => {
  try {
    const name    = (req.body.name    || '').trim();
    const subject = (req.body.subject || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }
    if (!subject) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (name.length > 100) {
      return res.status(400).json({ success: false, message: 'Group name cannot exceed 100 characters.' });
    }
    if (subject.length > 80) {
      return res.status(400).json({ success: false, message: 'Subject cannot exceed 80 characters.' });
    }

    const group = await Group.create({
      name,
      subject,
      createdBy: req.user.id,
      members:   [req.user.id], // Creator is automatically a member
    });

    await group.populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: `Study group "${name}" created successfully.`,
      data:    group,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/groups/:id/join ───────────────────────────────────────────────
const joinGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID.' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    // Check for existing membership BEFORE using $addToSet
    const alreadyMember = group.members.some((m) => m.toString() === req.user.id);
    if (alreadyMember) {
      return res.status(409).json({
        success: false,
        message: 'You are already a member of this group.',
      });
    }

    // $addToSet prevents duplicates at the DB level too (defence-in-depth)
    await Group.findByIdAndUpdate(id, {
      $addToSet: { members: req.user.id },
    });

    res.json({ success: true, message: `You joined "${group.name}".` });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/groups/mine ────────────────────────────────────────────────────
const getMyGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, message: 'Your groups fetched.', data: groups });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/groups/:id ─────────────────────────────────────────────────────
const getGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID.' });
    }

    const group = await Group.findById(id)
      .populate('createdBy', 'name')
      .populate('members', 'name email');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    // Only members can see the group details + member list
    const isMember = group.members.some((m) => m._id.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must join this group to view the message board.',
      });
    }

    res.json({ success: true, message: 'Group fetched.', data: group });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllGroups, createGroup, joinGroup, getMyGroups, getGroupById };
