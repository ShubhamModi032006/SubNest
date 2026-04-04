const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../models/db");
const { validatePassword } = require("../utils/passwordValidator");
const { sendPasswordResetEmail } = require("../utils/emailService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_HOURS = 1;
const PUBLIC_SIGNUP_ROLES = ["user", "internal"];

// ─────────────────────────────────────────────
// Helper: Generate JWT
// ─────────────────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
// ─────────────────────────────────────────────
const signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // --- Basic field validation ---
    if (!name || !email || !password) {
      return sendError(res, 400, "Name, email, and password are required.");
    }

    // --- Email format validation ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 400, "Please provide a valid email address.");
    }

    // --- Password strength validation ---
    const { isValid, errors } = validatePassword(password);
    if (!isValid) {
      return sendError(
        res,
        400,
        `Password does not meet requirements: ${errors.join(" ")}`
      );
    }

    // --- Check if email already exists ---
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (existingUser.rows.length > 0) {
      return sendError(res, 409, "An account with this email already exists.");
    }

    // --- Hash password ---
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // --- Public signup supports limited roles only ---
    const requestedRole = String(role || "user").toLowerCase();
    const assignedRole = PUBLIC_SIGNUP_ROLES.includes(requestedRole)
      ? requestedRole
      : "user";

    // --- Insert user ---
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase(), hashedPassword, assignedRole]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser);

    return sendSuccess(
      res,
      201,
      {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        },
      },
      "Account created successfully."
    );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Authenticate user and return JWT
// @access  Public
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // --- Basic field validation ---
    if (!email || !password) {
      return sendError(res, 400, "Email and password are required.");
    }

    // --- Find user by email ---
    const result = await pool.query(
      "SELECT id, name, email, password, role, created_at FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return sendError(res, 401, "Invalid email or password.");
    }

    const user = result.rows[0];

    // --- Compare password ---
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return sendError(res, 401, "Invalid email or password.");
    }

    // --- Generate JWT ---
    const token = generateToken(user);

    return sendSuccess(
      res,
      200,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
      },
      "Login successful."
    );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
// ─────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 400, "Email is required.");
    }

    // --- Check if user exists ---
    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    // Always return success to avoid user enumeration attacks
    if (result.rows.length === 0) {
      return sendSuccess(
        res,
        200,
        {},
        "If an account with that email exists, a reset link has been sent."
      );
    }

    const user = result.rows[0];

    // --- Generate a secure reset token ---
    const resetToken = crypto.randomBytes(64).toString("hex");

    // --- Set expiry (1 hour from now) ---
    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    // --- Delete any existing reset tokens for this user ---
    await pool.query("DELETE FROM password_resets WHERE user_id = $1", [
      user.id,
    ]);

    // --- Store new token in password_resets table ---
    await pool.query(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, resetToken, expiresAt]
    );

    // --- Send reset email ---
    await sendPasswordResetEmail(user.email, resetToken, user.name);

    return sendSuccess(
      res,
      200,
      {},
      "If an account with that email exists, a reset link has been sent."
    );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/reset-password
// @desc    Reset user password using token
// @access  Public
// ─────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return sendError(res, 400, "Token and new password are required.");
    }

    // --- Validate new password strength ---
    const { isValid, errors } = validatePassword(newPassword);
    if (!isValid) {
      return sendError(
        res,
        400,
        `Password does not meet requirements: ${errors.join(" ")}`
      );
    }

    // --- Find the reset token ---
    const result = await pool.query(
      `SELECT pr.id, pr.user_id, pr.expires_at, u.email
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return sendError(res, 400, "Invalid or expired reset token.");
    }

    const resetRecord = result.rows[0];

    // --- Check if token is expired ---
    if (new Date() > new Date(resetRecord.expires_at)) {
      // Cleanup expired token
      await pool.query("DELETE FROM password_resets WHERE id = $1", [
        resetRecord.id,
      ]);
      return sendError(
        res,
        400,
        "Reset token has expired. Please request a new one."
      );
    }

    // --- Hash new password ---
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // --- Update user's password ---
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      resetRecord.user_id,
    ]);

    // --- Delete the used reset token ---
    await pool.query("DELETE FROM password_resets WHERE id = $1", [
      resetRecord.id,
    ]);

    return sendSuccess(
      res,
      200,
      {},
      "Password reset successfully. You can now log in."
    );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get current logged-in user profile
// @access  Private (requires token)
// ─────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const { id, name, email, role } = req.user; // Extracted directly from validated token
    
    return sendSuccess(res, 200, { 
      user: { id, name, email, role } 
    }, "User fetched.");
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login, forgotPassword, resetPassword, getMe };
