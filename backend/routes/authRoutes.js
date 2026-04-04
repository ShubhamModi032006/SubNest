const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");
const { validateRequest } = require("../middlewares/validateRequest");

// ─────────────────────────────────────────────
// Public Routes
// ─────────────────────────────────────────────

// POST /api/auth/signup
router.post(
  "/signup",
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters."),
    body("email").trim().isEmail().withMessage("A valid email is required."),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
    body("role").optional().isIn(["admin", "internal", "user"]).withMessage("Invalid role."),
  ],
  validateRequest,
  signup
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").trim().isEmail().withMessage("A valid email is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  validateRequest,
  login
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  [body("email").trim().isEmail().withMessage("A valid email is required.")],
  validateRequest,
  forgotPassword
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  [
    body("token").trim().notEmpty().withMessage("Reset token is required."),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  ],
  validateRequest,
  resetPassword
);

// ─────────────────────────────────────────────
// Protected Routes (require JWT)
// ─────────────────────────────────────────────

// GET /api/auth/me
router.get("/me", protect, getMe);

module.exports = router;
