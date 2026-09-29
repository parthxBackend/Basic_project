/**
 * controllers/adminController.js — Admin-only platform management.
 *
 * getStats    : Aggregated counts for the stats cards on the admin dashboard.
 * getUsers    : All users (excluding password field).
 * deleteUser  : Removes user + removes them from all group member lists.
 *               Prevents an admin from deleting their own account.
 * getGroups   : All groups with member count and creator name.
 * deleteGroup : Removes the group AND all its messages (cascade delete).
 */

const User    = require('../models/User');
const Group   = require('../models/Group');
const Message = require('../models/Message');

// ── GET /api/admin/stats ────────────────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalStudents, totalGroups, totalMessages] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Group.countDocuments(),
      Message.countDocuments(),
    ]);

    res.json({
      success: true,
      message: 'Stats fetched.',
      data:    { totalUsers, totalStudents, totalGroups, totalMessages },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/users ────────────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    // Never return the hashed password to the client
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, message: 'Users fetched.', data: users });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/admin/users/:id ─────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin self-deletion
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Remove user from all groups they belong to (cascading cleanup)
    await Group.updateMany(
      { members: id },
      { $pull: { members: id } }
    );

    // Also delete groups they created (optional clean-up; or re-assign ownership)
    // For simplicity: delete groups where this user is the ONLY member / creator.
    // We'll just leave orphaned groups for now and only pull from members.

    await User.findByIdAndDelete(id);

    res.json({ success: true, message: `User "${user.name}" deleted successfully.` });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/groups ────────────────────────────────────────────────────
const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Add memberCount derived field
    const enriched = groups.map((g) => ({
      _id:         g._id,
      name:        g.name,
      subject:     g.subject,
      createdBy:   g.createdBy,
      memberCount: g.members.length,
      createdAt:   g.createdAt,
    }));

    res.json({ success: true, message: 'Groups fetched.', data: enriched });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/admin/groups/:id ─────────────────────────────────────────────
const deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    // Cascade: delete all messages belonging to this group first
    await Message.deleteMany({ group: id });

    await Group.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Group "${group.name}" and all its messages deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getUsers, deleteUser, getGroups, deleteGroup };
