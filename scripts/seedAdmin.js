/**
 * scripts/seedAdmin.js — Database seeder.
 *
 * Run with:  npm run seed
 *
 * Creates:
 *  - 1 admin account
 *  - 2 student accounts
 *  - 1 sample study group (created by student1, joined by student2)
 *  - 2 sample messages in that group
 *
 * Safe to run multiple times — clears existing seed data first using email lookups.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const connectDB = require('../config/db');
const User      = require('../models/User');
const Group     = require('../models/Group');
const Message   = require('../models/Message');

// ── Seed data definitions ──────────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@studygroup.com';
const STUDENT1_EMAIL = 'alice@studygroup.com';
const STUDENT2_EMAIL = 'bob@studygroup.com';

const seed = async () => {
  await connectDB();

  console.log('🌱 Seeding database...');

  // ── Clean up previous seed data ──────────────────────────────────────────
  // IMPORTANT: find users FIRST (before deleting them) so we can clean their groups
  const oldUsers = await User.find({ email: { $in: [ADMIN_EMAIL, STUDENT1_EMAIL, STUDENT2_EMAIL] } });
  if (oldUsers.length) {
    const ids = oldUsers.map((u) => u._id);
    const oldGroups = await Group.find({ createdBy: { $in: ids } });
    const groupIds = oldGroups.map((g) => g._id);
    await Message.deleteMany({ group: { $in: groupIds } });
    await Group.deleteMany({ _id: { $in: groupIds } });
  }
  // Delete seed users after their groups are cleaned up
  await User.deleteMany({ email: { $in: [ADMIN_EMAIL, STUDENT1_EMAIL, STUDENT2_EMAIL] } });

  // ── Create users ──────────────────────────────────────────────────────────
  const hash = (pw) => bcrypt.hash(pw, 10);

  const [admin, alice, bob] = await Promise.all([
    User.create({ name: 'Admin User',  email: ADMIN_EMAIL,    password: await hash('admin123'),   role: 'admin'   }),
    User.create({ name: 'Alice (Student)', email: STUDENT1_EMAIL, password: await hash('alice123'),   role: 'student' }),
    User.create({ name: 'Bob (Student)',   email: STUDENT2_EMAIL, password: await hash('bob123'),     role: 'student' }),
  ]);

  console.log('👤 Created users: admin, alice, bob');

  // ── Create a sample group ─────────────────────────────────────────────────
  const group = await Group.create({
    name:      'Mathematics Study Circle',
    subject:   'Mathematics',
    createdBy: alice._id,
    members:   [alice._id, bob._id], // Both auto-joined
  });

  console.log('📚 Created group: Mathematics Study Circle');

  // ── Create sample messages ────────────────────────────────────────────────
  await Message.create([
    { group: group._id, sender: alice._id, text: 'Hey everyone! Let\'s start with calculus revision.' },
    { group: group._id, sender: bob._id,   text: 'Great idea! I\'ll share my notes on integration.' },
  ]);

  console.log('💬 Created sample messages');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete! Test credentials:\n');
  console.log('  ADMIN   → email: admin@studygroup.com  | password: admin123');
  console.log('  STUDENT → email: alice@studygroup.com  | password: alice123');
  console.log('  STUDENT → email: bob@studygroup.com    | password: bob123\n');

  mongoose.connection.close();
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
