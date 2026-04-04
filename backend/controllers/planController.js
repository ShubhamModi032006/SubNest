const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { cached, invalidateTag, invalidateByPrefix } = require("../services/cacheService");
const { logActivity } = require("../services/activityLogService");

const isPositiveNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
};

const isValidDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const parseBoolean = (value, fallback = null) => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
};

const validatePlanPayload = (payload, isPartial = false) => {
  const errors = [];

  if (!isPartial || payload.name !== undefined) {
    if (!payload.name || !String(payload.name).trim()) {
      errors.push("Name is required.");
    }
  }

  if (!isPartial || payload.billing_period !== undefined) {
    if (!["daily", "weekly", "monthly", "yearly"].includes(payload.billing_period)) {
      errors.push("Billing period must be daily, weekly, monthly, or yearly.");
    }
  }

  if (!isPartial || payload.price !== undefined) {
    if (!isPositiveNumber(payload.price)) {
      errors.push("Price must be a positive number.");
    }
  }

  if (!isPartial || payload.min_quantity !== undefined) {
    if (!Number.isInteger(Number(payload.min_quantity)) || Number(payload.min_quantity) <= 0) {
      errors.push("Min quantity must be a positive integer.");
    }
  }

  if (!isPartial || payload.start_date !== undefined) {
    if (!isValidDate(payload.start_date)) {
      errors.push("Start date is required and must be valid.");
    }
  }

  if (payload.end_date !== undefined && payload.end_date !== null && payload.end_date !== "" && !isValidDate(payload.end_date)) {
    errors.push("End date must be a valid date.");
  }

  if (payload.start_date && payload.end_date) {
    const startDate = new Date(payload.start_date);
    const endDate = new Date(payload.end_date);
    if (endDate < startDate) {
      errors.push("End date must be on or after start date.");
    }
  }

  return errors;
};

const getPlans = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    const params = [];
    let whereClause = "";

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE name ILIKE $${params.length}`;
    }

    params.push(limit);
    const limitRef = `$${params.length}`;
    params.push(offset);
    const offsetRef = `$${params.length}`;

    const data = await cached(
      `plans:${page}:${limit}:${search || "_"}`,
      async () => {
        const [planResult, countResult] = await Promise.all([
          pool.query(
            `SELECT id, name, billing_period, price, min_quantity, start_date, end_date, auto_close, closable, renewable, pausable, created_at
             FROM plans
             ${whereClause}
             ORDER BY created_at DESC
             LIMIT ${limitRef} OFFSET ${offsetRef}`,
            params
          ),
          pool.query(
            `SELECT COUNT(*)::INT AS total FROM plans ${whereClause}`,
            search ? [`%${search}%`] : []
          ),
        ]);

        return {
          plans: planResult.rows,
          total: countResult.rows[0]?.total || 0,
        };
      },
      { ttlMs: 60_000, tags: ["plans", "search"] }
    );

    return sendSuccess(
      res,
      200,
      {
        plans: data.plans,
        pagination: {
          page,
          limit,
          total: data.total,
          totalPages: Math.ceil((data.total || 0) / limit) || 1,
        },
      },
      "Plans fetched successfully."
    );
  } catch (error) {
    next(error);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const errors = validatePlanPayload(req.body);
    if (errors.length > 0) {
      return sendError(res, 400, errors.join(" "));
    }

    const result = await pool.query(
      `INSERT INTO plans (name, billing_period, price, min_quantity, start_date, end_date, auto_close, closable, renewable, pausable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, billing_period, price, min_quantity, start_date, end_date, auto_close, closable, renewable, pausable, created_at`,
      [
        String(req.body.name).trim(),
        req.body.billing_period,
        req.body.price,
        req.body.min_quantity,
        req.body.start_date,
        req.body.end_date || null,
        parseBoolean(req.body.auto_close, false),
        parseBoolean(req.body.closable, true),
        parseBoolean(req.body.renewable, true),
        parseBoolean(req.body.pausable, true),
      ]
    );

    invalidateTag("plans");
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("plans:");
    invalidateByPrefix("plan:");
    await logActivity({
      userId: req.user?.id,
      action: "PLAN_CREATE",
      entityType: "plan",
      entityId: result.rows[0]?.id,
      metadata: { name: result.rows[0]?.name },
    });

    return sendSuccess(res, 201, { plan: result.rows[0] }, "Plan created successfully.");
  } catch (error) {
    next(error);
  }
};

const getPlanById = async (req, res, next) => {
  try {
    const plan = await cached(
      `plan:${req.params.id}`,
      async () => {
        const result = await pool.query(
          `SELECT id, name, billing_period, price, min_quantity, start_date, end_date, auto_close, closable, renewable, pausable, created_at
           FROM plans
           WHERE id = $1`,
          [req.params.id]
        );
        return result.rows[0] || null;
      },
      { ttlMs: 60_000, tags: ["plans"] }
    );

    if (!plan) {
      return sendError(res, 404, "Plan not found.");
    }

    return sendSuccess(res, 200, { plan }, "Plan fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const planResult = await pool.query("SELECT id FROM plans WHERE id = $1", [req.params.id]);
    if (planResult.rows.length === 0) {
      return sendError(res, 404, "Plan not found.");
    }

    const errors = validatePlanPayload(req.body, true);
    if (errors.length > 0) {
      return sendError(res, 400, errors.join(" "));
    }

    const result = await pool.query(
      `UPDATE plans
       SET name = COALESCE($1, name),
           billing_period = COALESCE($2, billing_period),
           price = COALESCE($3, price),
           min_quantity = COALESCE($4, min_quantity),
           start_date = COALESCE($5, start_date),
           end_date = COALESCE($6, end_date),
           auto_close = COALESCE($7, auto_close),
           closable = COALESCE($8, closable),
           renewable = COALESCE($9, renewable),
           pausable = COALESCE($10, pausable)
       WHERE id = $11
       RETURNING id, name, billing_period, price, min_quantity, start_date, end_date, auto_close, closable, renewable, pausable, created_at`,
      [
        req.body.name !== undefined ? String(req.body.name).trim() : null,
        req.body.billing_period !== undefined ? req.body.billing_period : null,
        req.body.price !== undefined ? req.body.price : null,
        req.body.min_quantity !== undefined ? req.body.min_quantity : null,
        req.body.start_date !== undefined ? req.body.start_date : null,
        req.body.end_date !== undefined ? req.body.end_date : null,
        req.body.auto_close !== undefined ? parseBoolean(req.body.auto_close, null) : null,
        req.body.closable !== undefined ? parseBoolean(req.body.closable, null) : null,
        req.body.renewable !== undefined ? parseBoolean(req.body.renewable, null) : null,
        req.body.pausable !== undefined ? parseBoolean(req.body.pausable, null) : null,
        req.params.id,
      ]
    );

    invalidateTag("plans");
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("plans:");
    invalidateByPrefix("plan:");
    await logActivity({
      userId: req.user?.id,
      action: "PLAN_UPDATE",
      entityType: "plan",
      entityId: req.params.id,
      metadata: { name: result.rows[0]?.name },
    });

    return sendSuccess(res, 200, { plan: result.rows[0] }, "Plan updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deletePlan = async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM plans WHERE id = $1 RETURNING id, name", [req.params.id]);
    if (result.rows.length === 0) {
      return sendError(res, 404, "Plan not found.");
    }

    invalidateTag("plans");
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("plans:");
    invalidateByPrefix("plan:");
    await logActivity({
      userId: req.user?.id,
      action: "PLAN_DELETE",
      entityType: "plan",
      entityId: req.params.id,
      metadata: { name: result.rows[0]?.name },
    });

    return sendSuccess(res, 200, { plan: result.rows[0] }, "Plan deleted successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlans,
  createPlan,
  getPlanById,
  updatePlan,
  deletePlan,
};
