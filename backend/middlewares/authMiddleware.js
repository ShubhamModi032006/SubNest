const jwt = require("jsonwebtoken");
require("dotenv").config();
const { sendError } = require("../utils/apiResponse");

const VALID_ROLES = ["admin", "internal", "user"];

const ROLE_PERMISSIONS = {
  admin: ["*"],
  internal: [
    "APPROVAL_CREATE",
    "APPROVAL_VIEW",
    "INVOICE_VIEW",
    "INVOICE_MANAGE",
    "SUBSCRIPTION_VIEW",
    "SUBSCRIPTION_MANAGE",
  ],
  user: [],
};

const hasPermission = (role, permission) => {
  const normalizedRole = String(role || "").toLowerCase();
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  return permissions.includes("*") || permissions.includes(permission);
};

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

    if (!VALID_ROLES.includes(String(decoded.role || "").toLowerCase())) {
      return sendError(res, 401, "Invalid role in token.");
    }

    decoded.role = String(decoded.role).toLowerCase();
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

    const normalizedRoles = roles.map((role) => String(role).toLowerCase());

    if (!normalizedRoles.includes(req.user.role)) {
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

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "Not authenticated.");
    }

    if (!hasPermission(req.user.role, permission)) {
      return sendError(res, 403, `Permission denied for action: ${permission}.`);
    }

    next();
  };
};

module.exports = { protect, allowRoles, hasPermission, requirePermission };
