const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");

// ─────────────────────────────────────────────
// Public Routes
// ─────────────────────────────────────────────

// POST /api/auth/signup
router.post("/signup", signup);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", resetPassword);

// ─────────────────────────────────────────────
// Protected Routes (require JWT)
// ─────────────────────────────────────────────

// GET /api/auth/me
router.get("/me", protect, getMe);

module.exports = router;
