/**
 * Global error handling middleware.
 * Must be added as the last middleware in Express.
 */
const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  // Duplicate key (unique constraint violation in PostgreSQL)
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
    });
  }

  // Foreign key violation
  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "Referenced record does not exist.",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token has expired.",
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
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
