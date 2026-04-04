/**
 * Global error handling middleware.
 * Must be added as the last middleware in Express.
 */
const { sendError } = require("../utils/apiResponse");

const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  // Duplicate key (unique constraint violation in PostgreSQL)
  if (err.code === "23505") {
    return sendError(res, 409, "A record with this value already exists.");
  }

  // Foreign key violation
  if (err.code === "23503") {
    return sendError(res, 400, "Referenced record does not exist.");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendError(res, 401, "Invalid token.");
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, 401, "Token has expired.");
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  return sendError(res, statusCode, err.message || "Internal Server Error");
};

/**
 * 404 Not Found handler — catches requests to undefined routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
