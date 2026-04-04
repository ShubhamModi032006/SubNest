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
 * Usage: allowRoles("admin") or allowRoles("admin", "internal")
 */
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "Not authenticated.");
    }

    if (!roles.includes(req.user.role)) {
      console.warn(`[RBAC] Access denied. User ${req.user.email} has role '${req.user.role}' but endpoint requires ${roles.join(" or ")}`);
      return sendError(
        res,
        403,
        `Access forbidden. Required role: ${roles.join(" or ")}.`
      );
    }
    
    console.log(`[RBAC] Access granted. User ${req.user.email} accessed with role '${req.user.role}' on ${req.originalUrl || req.url}`);

    next();
  };
};

module.exports = { protect, allowRoles };
