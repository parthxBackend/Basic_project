/**
 * models/Group.js — Mongoose schema for study groups.
 *
 * Fields:
 *  - name      : group display name (must be unique-ish and non-empty)
 *  - subject   : e.g. "Mathematics", "Physics"
 *  - createdBy : reference to the User who created the group
 *  - members   : array of User refs — only these users can view/post messages
 *  - createdAt : auto-set by timestamps
 *
 * Important: the creator is added to members[] at creation time (in the
 * controller), so createdBy is always also a member.
 */

const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Group name is required'],
      trim:     true,
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    subject: {
      type:     String,
      required: [true, 'Subject is required'],
      trim:     true,
      maxlength: [80, 'Subject cannot exceed 80 characters'],
    },
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'User',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);
