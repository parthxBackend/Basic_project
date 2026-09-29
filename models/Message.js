/**
 * models/Message.js — Mongoose schema for group messages.
 *
 * Fields:
 *  - group  : which study group this message belongs to
 *  - sender : the User who posted the message
 *  - text   : the message body (trimmed, non-empty enforced in controller)
 *  - createdAt : timestamp shown in the message feed
 *
 * Messages are fetched sorted by createdAt ascending so the feed shows
 * oldest-first, newest at the bottom.
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    group: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Group',
      required: true,
    },
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    text: {
      type:      String,
      required:  [true, 'Message text is required'],
      trim:      true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
