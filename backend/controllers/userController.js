const bcrypt = require("bcrypt");
const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const SALT_ROUNDS = 12;
const CREATABLE_ROLES = ["internal", "user"];
const UPDATABLE_ROLES = ["admin", "internal", "user"];

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    const isAdmin = req.user.role === "admin";
    const selectFields = isAdmin
      ? "id, name, email, role, phone, address, created_at"
      : "id, name, email, role, created_at";

    const params = [];
    let whereClause = "";

    if (search) {
      params.push(`%${search}%`);
      whereClause = ` WHERE (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    params.push(limit);
    const limitRef = `$${params.length}`;
    params.push(offset);
    const offsetRef = `$${params.length}`;

    const usersQuery = `
      SELECT ${selectFields}
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitRef} OFFSET ${offsetRef}
    `;

    const countParams = search ? [`%${search}%`] : [];
    const countWhere = search ? "WHERE (name ILIKE $1 OR email ILIKE $1)" : "";

    const [usersResult, countResult] = await Promise.all([
      pool.query(usersQuery, params),
      pool.query(`SELECT COUNT(*)::INT AS total FROM users ${countWhere}`, countParams),
    ]);

    const total = countResult.rows[0]?.total || 0;

    return sendSuccess(
      res,
      200,
      {
        users: usersResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      "Users fetched successfully."
    );
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    if (!name || !email || !password || !role) {
      return sendError(res, 400, "Name, email, password, and role are required.");
    }

    if (!isValidEmail(email)) {
      return sendError(res, 400, "Please provide a valid email address.");
    }

    if (!CREATABLE_ROLES.includes(role)) {
      return sendError(res, 403, "Admin can only create internal or user roles.");
    }

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      return sendError(res, 400, "Email already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, phone, address, created_at`,
      [
        name.trim(),
        email.toLowerCase(),
        hashedPassword,
        role,
        phone ? String(phone).trim() : null,
        address ? String(address).trim() : null,
      ]
    );

    return sendSuccess(res, 201, { user: result.rows[0] }, "User created successfully.");
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === "admin";
    const selectFields = isAdmin
      ? "id, name, email, role, phone, address, created_at"
      : "id, name, email, role, created_at";

    const result = await pool.query(`SELECT ${selectFields} FROM users WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 404, "User not found.");
    }

    return sendSuccess(res, 200, { user: result.rows[0] }, "User fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, phone, address } = req.body;

    if (!name && !role && phone === undefined && address === undefined) {
      return sendError(res, 400, "Provide at least one field to update.");
    }

    const existing = await pool.query("SELECT id FROM users WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return sendError(res, 404, "User not found.");
    }

    if (role && !UPDATABLE_ROLES.includes(role)) {
      return sendError(res, 400, "Invalid role value.");
    }

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address)
       WHERE id = $5
       RETURNING id, name, email, role, phone, address, created_at`,
      [
        name ? String(name).trim() : null,
        role || null,
        phone !== undefined ? String(phone).trim() : null,
        address !== undefined ? String(address).trim() : null,
        id,
      ]
    );

    return sendSuccess(res, 200, { user: result.rows[0] }, "User updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return sendError(res, 400, "You cannot delete your own account.");
    }

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, name, email, role",
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "User not found.");
    }

    return sendSuccess(res, 200, { user: result.rows[0] }, "User deleted successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
};
