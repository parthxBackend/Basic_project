/**
 * models/User.js — Mongoose schema for platform users.
 *
 * Fields:
 *  - name      : display name shown in the UI
 *  - email     : unique login identifier (stored lowercase for consistent lookup)
 *  - password  : bcrypt hash — NEVER store plain text
 *  - role      : 'student' or 'admin' — controls access to routes
 *  - createdAt : auto-set by Mongoose timestamps option
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,         // MongoDB creates a unique index on this field
      lowercase: true,         // always stored as lowercase — prevents abc@x.com vs ABC@x.com duplicates
      trim:      true,
    },
    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type:    String,
      enum:    ['student', 'admin'],
      default: 'student',
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model('User', userSchema);
