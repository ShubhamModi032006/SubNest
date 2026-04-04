const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const isPositiveNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
};

const validateTaxPayload = (payload, isPartial = false) => {
  const errors = [];

  if (!isPartial || payload.name !== undefined) {
    if (!payload.name || !String(payload.name).trim()) {
      errors.push("Name is required.");
    }
  }

  if (!isPartial || payload.type !== undefined) {
    if (!["percentage", "fixed"].includes(payload.type)) {
      errors.push("Type must be percentage or fixed.");
    }
  }

  if (!isPartial || payload.value !== undefined) {
    if (!isPositiveNumber(payload.value)) {
      errors.push("Value must be greater than 0.");
    }
  }

  return errors;
};

const getTaxes = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, type, value, created_at
       FROM taxes
       ORDER BY created_at DESC`
    );

    return sendSuccess(res, 200, { taxes: result.rows }, "Taxes fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const createTax = async (req, res, next) => {
  try {
    const errors = validateTaxPayload(req.body);
    if (errors.length > 0) {
      return sendError(res, 400, errors.join(" "));
    }

    const result = await pool.query(
      `INSERT INTO taxes (name, type, value)
       VALUES ($1, $2, $3)
       RETURNING id, name, type, value, created_at`,
      [String(req.body.name).trim(), req.body.type, req.body.value]
    );

    return sendSuccess(res, 201, { tax: result.rows[0] }, "Tax created successfully.");
  } catch (error) {
    next(error);
  }
};

const updateTax = async (req, res, next) => {
  try {
    const existing = await pool.query("SELECT id FROM taxes WHERE id = $1", [req.params.id]);
    if (existing.rows.length === 0) {
      return sendError(res, 404, "Tax not found.");
    }

    const errors = validateTaxPayload(req.body, true);
    if (errors.length > 0) {
      return sendError(res, 400, errors.join(" "));
    }

    const result = await pool.query(
      `UPDATE taxes
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           value = COALESCE($3, value)
       WHERE id = $4
       RETURNING id, name, type, value, created_at`,
      [
        req.body.name !== undefined ? String(req.body.name).trim() : null,
        req.body.type !== undefined ? req.body.type : null,
        req.body.value !== undefined ? req.body.value : null,
        req.params.id,
      ]
    );

    return sendSuccess(res, 200, { tax: result.rows[0] }, "Tax updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteTax = async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM taxes WHERE id = $1 RETURNING id, name", [req.params.id]);
    if (result.rows.length === 0) {
      return sendError(res, 404, "Tax not found.");
    }

    return sendSuccess(res, 200, { tax: result.rows[0] }, "Tax deleted successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTaxes,
  createTax,
  updateTax,
  deleteTax,
};
