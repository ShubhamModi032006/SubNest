const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const normalizeText = (value) => (value === undefined || value === null ? null : String(value).trim());

const withTransaction = async (handler) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const validatePayload = (payload, isPartial = false) => {
  const errors = [];

  if (!isPartial || payload.name !== undefined) {
    if (!payload.name || !String(payload.name).trim()) {
      errors.push("Template name is required.");
    }
  }

  if (!isPartial || payload.validity_days !== undefined) {
    if (!isPositiveInteger(payload.validity_days)) {
      errors.push("Validity days must be a positive integer.");
    }
  }

  if (!isPartial || payload.plan_id !== undefined) {
    if (!payload.plan_id || !String(payload.plan_id).trim()) {
      errors.push("Recurring plan is required.");
    }
  }

  if (!isPartial || payload.lines !== undefined) {
    if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
      errors.push("At least one product line is required.");
    }
  }

  if (Array.isArray(payload.lines)) {
    payload.lines.forEach((line) => {
      if (!line.product_id) {
        errors.push("Each line must include product_id.");
      }
      if (!isPositiveInteger(line.quantity)) {
        errors.push("Each line quantity must be a positive integer.");
      }
    });
  }

  return errors;
};

const hydrateTemplate = async (templateId) => {
  const templateResult = await pool.query(
    `SELECT qt.id, qt.name, qt.validity_days, qt.plan_id, qt.created_by, qt.created_at,
            p.name AS plan_name, p.billing_period, p.price AS plan_price
     FROM quotation_templates qt
     JOIN plans p ON p.id = qt.plan_id
     WHERE qt.id = $1`,
    [templateId]
  );

  if (templateResult.rows.length === 0) {
    return null;
  }

  const lineResult = await pool.query(
    `SELECT qtl.id, qtl.template_id, qtl.product_id, qtl.quantity, qtl.description,
            p.name AS product_name, p.sales_price
     FROM quotation_template_lines qtl
     JOIN products p ON p.id = qtl.product_id
     WHERE qtl.template_id = $1
     ORDER BY qtl.created_at ASC`,
    [templateId]
  );

  const row = templateResult.rows[0];
  return {
    id: row.id,
    name: row.name,
    validity_days: Number(row.validity_days),
    plan: {
      id: row.plan_id,
      name: row.plan_name,
      billing_period: row.billing_period,
      price: Number(row.plan_price),
    },
    created_by: row.created_by,
    created_at: row.created_at,
    lines: lineResult.rows.map((line) => ({
      id: line.id,
      product_id: line.product_id,
      product_name: line.product_name,
      quantity: Number(line.quantity),
      description: line.description,
      sales_price: Number(line.sales_price),
    })),
  };
};

const getQuotationTemplates = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT qt.id, qt.name, qt.validity_days, qt.plan_id, qt.created_at, p.name AS plan_name
       FROM quotation_templates qt
       JOIN plans p ON p.id = qt.plan_id
       ORDER BY qt.created_at DESC`
    );

    const templates = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      validity_days: Number(row.validity_days),
      plan: { id: row.plan_id, name: row.plan_name },
      created_at: row.created_at,
    }));

    return sendSuccess(res, 200, { templates }, "Quotation templates fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const createQuotationTemplate = async (req, res, next) => {
  try {
    const payload = {
      name: normalizeText(req.body.name),
      validity_days: req.body.validity_days,
      plan_id: normalizeText(req.body.plan_id),
      lines: Array.isArray(req.body.lines)
        ? req.body.lines.map((line) => ({
            product_id: normalizeText(line.product_id),
            quantity: line.quantity,
            description: normalizeText(line.description),
          }))
        : null,
    };

    const errors = validatePayload(payload);
    if (errors.length > 0) {
      return sendError(res, 400, errors.join(" "));
    }

    const templateId = await withTransaction(async (client) => {
      const planResult = await client.query("SELECT id FROM plans WHERE id = $1", [payload.plan_id]);
      if (planResult.rows.length === 0) {
        const error = new Error("Plan does not exist.");
        error.statusCode = 400;
        throw error;
      }

      const productIds = [...new Set(payload.lines.map((line) => line.product_id))];
      const productResult = await client.query("SELECT id FROM products WHERE id = ANY($1::uuid[])", [productIds]);
      if (productResult.rows.length !== productIds.length) {
        const error = new Error("One or more products do not exist.");
        error.statusCode = 400;
        throw error;
      }

      const templateResult = await client.query(
        `INSERT INTO quotation_templates (name, validity_days, plan_id, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [payload.name, payload.validity_days, payload.plan_id, req.user?.id || null]
      );

      const newTemplateId = templateResult.rows[0].id;
      const values = [];
      const placeholders = payload.lines.map((line, index) => {
        const base = index * 4;
        values.push(newTemplateId, line.product_id, Number(line.quantity), line.description || null);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      });

      await client.query(
        `INSERT INTO quotation_template_lines (template_id, product_id, quantity, description)
         VALUES ${placeholders.join(", ")}`,
        values
      );

      return newTemplateId;
    });

    const template = await hydrateTemplate(templateId);
    return sendSuccess(res, 201, { template }, "Quotation template created successfully.");
  } catch (error) {
    next(error);
  }
};

const getQuotationTemplateById = async (req, res, next) => {
  try {
    const template = await hydrateTemplate(req.params.id);
    if (!template) {
      return sendError(res, 404, "Quotation template not found.");
    }

    return sendSuccess(res, 200, { template }, "Quotation template fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateQuotationTemplate = async (req, res, next) => {
  try {
    const existing = await hydrateTemplate(req.params.id);
    if (!existing) {
      return sendError(res, 404, "Quotation template not found.");
    }

    const payload = {
      name: req.body.name !== undefined ? normalizeText(req.body.name) : undefined,
      validity_days: req.body.validity_days,
      plan_id: req.body.plan_id !== undefined ? normalizeText(req.body.plan_id) : undefined,
      lines: req.body.lines,
    };

    if (payload.lines !== undefined) {
      payload.lines = Array.isArray(payload.lines)
        ? payload.lines.map((line) => ({
            product_id: normalizeText(line.product_id),
            quantity: line.quantity,
            description: normalizeText(line.description),
          }))
        : payload.lines;
    }

    const errors = validatePayload(payload, true);
    if (errors.length > 0) {
      return sendError(res, 400, errors.join(" "));
    }

    await withTransaction(async (client) => {
      if (payload.plan_id) {
        const planResult = await client.query("SELECT id FROM plans WHERE id = $1", [payload.plan_id]);
        if (planResult.rows.length === 0) {
          const error = new Error("Plan does not exist.");
          error.statusCode = 400;
          throw error;
        }
      }

      await client.query(
        `UPDATE quotation_templates
         SET name = COALESCE($1, name),
             validity_days = COALESCE($2, validity_days),
             plan_id = COALESCE($3, plan_id)
         WHERE id = $4`,
        [payload.name ?? null, payload.validity_days ?? null, payload.plan_id ?? null, req.params.id]
      );

      if (Array.isArray(payload.lines)) {
        const productIds = [...new Set(payload.lines.map((line) => line.product_id))];
        const productResult = await client.query("SELECT id FROM products WHERE id = ANY($1::uuid[])", [productIds]);
        if (productResult.rows.length !== productIds.length) {
          const error = new Error("One or more products do not exist.");
          error.statusCode = 400;
          throw error;
        }

        await client.query("DELETE FROM quotation_template_lines WHERE template_id = $1", [req.params.id]);
        if (payload.lines.length > 0) {
          const values = [];
          const placeholders = payload.lines.map((line, index) => {
            const base = index * 4;
            values.push(req.params.id, line.product_id, Number(line.quantity), line.description || null);
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
          });

          await client.query(
            `INSERT INTO quotation_template_lines (template_id, product_id, quantity, description)
             VALUES ${placeholders.join(", ")}`,
            values
          );
        }
      }
    });

    const template = await hydrateTemplate(req.params.id);
    return sendSuccess(res, 200, { template }, "Quotation template updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteQuotationTemplate = async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM quotation_templates WHERE id = $1 RETURNING id, name", [req.params.id]);
    if (result.rows.length === 0) {
      return sendError(res, 404, "Quotation template not found.");
    }

    return sendSuccess(res, 200, { template: result.rows[0] }, "Quotation template deleted successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuotationTemplates,
  createQuotationTemplate,
  getQuotationTemplateById,
  updateQuotationTemplate,
  deleteQuotationTemplate,
};
