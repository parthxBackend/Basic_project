/**
 * config/db.js — MongoDB connection helper.
 *
 * Uses Mongoose to open a persistent connection to MongoDB Atlas (or any
 * MongoDB URI).  Called once at startup from server.js.
 *
 * Why Mongoose?  It gives us schema validation, helpful query methods, and
 * easy population of related documents (e.g. group.members) — all things we
 * need for this project.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    // Exit so the dyno restarts and the error is visible in logs
    process.exit(1);
  }
};

module.exports = connectDB;
