/**
 * middleware/errorHandler.js — Central Express error-handling middleware.
 *
 * Any route/controller that calls next(err) or throws inside an async wrapper
 * will land here.  We inspect the error type to send a meaningful HTTP status
 * and message, rather than leaking stack traces to the client.
 *
 * Registered as the LAST app.use() in server.js so it catches everything.
 */

const errorHandler = (err, req, res, next) => {
  // Log the full error server-side for debugging
  console.error('❗ Error:', err.message);

  // Mongoose CastError — invalid ObjectId format (e.g., /api/groups/not-an-id)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format.',
    });
  }

  // Mongoose ValidationError — schema validation failed
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', '),
    });
  }

  // MongoDB duplicate key (e.g., duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `An account with that ${field} already exists.`,
    });
  }

  // JWT errors are handled in auth middleware, but just in case
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }

  // Generic fallback — don't expose internal details in production
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
};

module.exports = errorHandler;
