const jwt = require("jsonwebtoken");
require("dotenv").config();
const { sendError } = require("../utils/apiResponse");

/**
 * Middleware to protect routes — verifies JWT token from Authorization header.
 */
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, 401, "Access denied. No token provided.");
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, 401, "Token has expired. Please log in again.");
    }
    return sendError(res, 401, "Invalid token. Authentication failed.");
  }
};

/**
 * Middleware to restrict access by role.
 * Usage: authorize("admin") or authorize("admin", "internal")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "Not authenticated.");
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access forbidden. Required role: ${roles.join(" or ")}.`
      );
    }

    next();
  };
};

module.exports = { protect, authorize };
