const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const getContacts = async (req, res, next) => {
  try {
    const { user_id: userId, search = "" } = req.query;
    const conditions = [];
    const params = [];

    if (userId) {
      params.push(userId);
      conditions.push(`c.user_id = $${params.length}`);
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(c.name ILIKE $${params.length} OR c.email ILIKE $${params.length})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone, c.address, c.user_id, c.created_at,
              u.name AS user_name, u.email AS user_email
       FROM contacts c
       JOIN users u ON c.user_id = u.id
       ${whereClause}
       ORDER BY c.created_at DESC`,
      params
    );

    return sendSuccess(res, 200, { contacts: result.rows }, "Contacts fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const createContact = async (req, res, next) => {
  try {
    const { name, email, phone, address, user_id: userId } = req.body;

    if (!name || !email || !userId) {
      return sendError(res, 400, "Name, email, and user_id are required.");
    }

    if (!isValidEmail(email)) {
      return sendError(res, 400, "Please provide a valid email address.");
    }

    const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (userExists.rows.length === 0) {
      return sendError(res, 400, "Linked user does not exist.");
    }

    const result = await pool.query(
      `INSERT INTO contacts (name, email, phone, address, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, address, user_id, created_at`,
      [
        name.trim(),
        email.toLowerCase(),
        phone ? String(phone).trim() : null,
        address ? String(address).trim() : null,
        userId,
      ]
    );

    return sendSuccess(res, 201, { contact: result.rows[0] }, "Contact created successfully.");
  } catch (error) {
    next(error);
  }
};

const getContactById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, name, email, phone, address, user_id, created_at
       FROM contacts
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "Contact not found.");
    }

    return sendSuccess(res, 200, { contact: result.rows[0] }, "Contact fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, user_id: userId } = req.body;

    if (!name && !email && phone === undefined && address === undefined && !userId) {
      return sendError(res, 400, "Provide at least one field to update.");
    }

    const existing = await pool.query("SELECT id FROM contacts WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return sendError(res, 404, "Contact not found.");
    }

    if (email && !isValidEmail(email)) {
      return sendError(res, 400, "Please provide a valid email address.");
    }

    if (userId) {
      const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
      if (userExists.rows.length === 0) {
        return sendError(res, 400, "Linked user does not exist.");
      }
    }

    const result = await pool.query(
      `UPDATE contacts
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           user_id = COALESCE($5, user_id)
       WHERE id = $6
       RETURNING id, name, email, phone, address, user_id, created_at`,
      [
        name ? String(name).trim() : null,
        email ? email.toLowerCase() : null,
        phone !== undefined ? String(phone).trim() : null,
        address !== undefined ? String(address).trim() : null,
        userId || null,
        id,
      ]
    );

    return sendSuccess(res, 200, { contact: result.rows[0] }, "Contact updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM contacts WHERE id = $1 RETURNING id, name, email, user_id",
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "Contact not found.");
    }

    return sendSuccess(res, 200, { contact: result.rows[0] }, "Contact deleted successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContacts,
  createContact,
  getContactById,
  updateContact,
  deleteContact,
};
