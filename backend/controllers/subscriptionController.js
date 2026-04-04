const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { generateSubscriptionNumber, calculateSubscriptionLine } = require("../utils/subscriptionPricing");
const { createInvoiceFromSubscriptionInternal } = require("./invoiceController");
const { createApprovalRequest } = require("../utils/approvalService");
const { cached, invalidateTag, invalidateByPrefix } = require("../services/cacheService");
const { logActivity } = require("../services/activityLogService");
const { createNotification, createNotificationForRoles } = require("../services/notificationService");

const ALLOWED_STATUSES = ["draft", "quotation", "confirmed", "active", "closed"];

const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

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

const resolveCustomer = async (client, customerId, customerType) => {
  if (!customerId) {
    const error = new Error("Customer is required.");
    error.statusCode = 400;
    throw error;
  }

  if (customerType === "user") {
    const userResult = await client.query("SELECT id, name, email FROM users WHERE id = $1", [customerId]);
    if (userResult.rows.length === 0) {
      const error = new Error("Customer user does not exist.");
      error.statusCode = 400;
      throw error;
    }

    return {
      customer_type: "user",
      customer_user_id: customerId,
      customer_contact_id: null,
      customer: userResult.rows[0],
    };
  }

  if (customerType === "contact") {
    const contactResult = await client.query("SELECT id, name, email FROM contacts WHERE id = $1", [customerId]);
    if (contactResult.rows.length === 0) {
      const error = new Error("Customer contact does not exist.");
      error.statusCode = 400;
      throw error;
    }

    return {
      customer_type: "contact",
      customer_user_id: null,
      customer_contact_id: customerId,
      customer: contactResult.rows[0],
    };
  }

  const userResult = await client.query("SELECT id, name, email FROM users WHERE id = $1", [customerId]);
  if (userResult.rows.length > 0) {
    return {
      customer_type: "user",
      customer_user_id: customerId,
      customer_contact_id: null,
      customer: userResult.rows[0],
    };
  }

  const contactResult = await client.query("SELECT id, name, email FROM contacts WHERE id = $1", [customerId]);
  if (contactResult.rows.length > 0) {
    return {
      customer_type: "contact",
      customer_user_id: null,
      customer_contact_id: customerId,
      customer: contactResult.rows[0],
    };
  }

  const error = new Error("Customer does not exist.");
  error.statusCode = 400;
  throw error;
};

const loadPlan = async (client, planId) => {
  const result = await client.query(
    `SELECT id, name, billing_period, price, min_quantity, start_date, end_date, auto_close, closable, renewable, pausable
     FROM plans
     WHERE id = $1`,
    [planId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Plan does not exist.");
    error.statusCode = 400;
    throw error;
  }

  return result.rows[0];
};

const loadQuotationTemplate = async (client, templateId) => {
  const templateResult = await client.query(
    `SELECT id, plan_id
     FROM quotation_templates
     WHERE id = $1`,
    [templateId]
  );

  if (templateResult.rows.length === 0) {
    const error = new Error("Quotation template does not exist.");
    error.statusCode = 400;
    throw error;
  }

  const lineResult = await client.query(
    `SELECT product_id, quantity, description
     FROM quotation_template_lines
     WHERE template_id = $1
     ORDER BY created_at ASC`,
    [templateId]
  );

  if (lineResult.rows.length === 0) {
    const error = new Error("Quotation template has no product lines.");
    error.statusCode = 400;
    throw error;
  }

  return {
    ...templateResult.rows[0],
    lines: lineResult.rows,
  };
};

const loadProductsForItems = async (client, items) => {
  const productIds = [...new Set(items.map((item) => String(item.product_id).trim()))];
  const productResult = await client.query(
    `SELECT p.id, p.name, p.type, p.sales_price, p.cost_price, p.tax_id, p.is_archived, t.id AS tax_row_id, t.name AS tax_name, t.type AS tax_type, t.value AS tax_value
     FROM products p
     LEFT JOIN taxes t ON p.tax_id = t.id
     WHERE p.id = ANY($1::uuid[])`,
    [productIds]
  );

  if (productResult.rows.length !== productIds.length) {
    const error = new Error("One or more products do not exist.");
    error.statusCode = 400;
    throw error;
  }

  const variantIds = items.map((item) => item.variant_id).filter(Boolean).map((value) => String(value).trim());
  let variantRows = [];
  if (variantIds.length > 0) {
    const variantResult = await client.query(
      `SELECT id, product_id, attribute, value, extra_price
       FROM product_variants
       WHERE id = ANY($1::uuid[])`,
      [variantIds]
    );
    if (variantResult.rows.length !== variantIds.length) {
      const error = new Error("One or more variants do not exist.");
      error.statusCode = 400;
      throw error;
    }
    variantRows = variantResult.rows;
  }

  const discountResult = await client.query(
    `SELECT d.id, d.name, d.type, d.value, d.min_purchase, d.min_quantity, d.start_date, d.end_date, d.usage_limit, d.apply_to_subscription, dp.product_id
     FROM discounts d
     JOIN discount_products dp ON dp.discount_id = d.id
     WHERE dp.product_id = ANY($1::uuid[])`,
    [productIds]
  );

  const discountsByProduct = new Map();
  for (const row of discountResult.rows) {
    if (!discountsByProduct.has(row.product_id)) {
      discountsByProduct.set(row.product_id, []);
    }
    discountsByProduct.get(row.product_id).push(row);
  }

  const productsById = new Map(productResult.rows.map((row) => [row.id, row]));
  const variantsById = new Map(variantRows.map((row) => [row.id, row]));

  return { productsById, variantsById, discountsByProduct };
};

const buildSubscriptionItems = ({ items, productsById, variantsById, discountsByProduct, plan, currentDate }) => {
  return items.map((item) => {
    const product = productsById.get(String(item.product_id).trim());
    const variant = item.variant_id ? variantsById.get(String(item.variant_id).trim()) : null;

    if (variant && String(variant.product_id) !== String(product.id)) {
      const error = new Error("Variant does not belong to the selected product.");
      error.statusCode = 400;
      throw error;
    }

    const quantity = Number(item.quantity);
    const discountCandidates = discountsByProduct.get(product.id) || [];
    const pricing = calculateSubscriptionLine({
      product,
      variant,
      plan,
      discounts: discountCandidates,
      quantity,
      currentDate,
    });

    return {
      product_id: product.id,
      variant_id: variant ? variant.id : null,
      quantity,
      unit_price: pricing.unit_price,
      discount: pricing.discount,
      tax: pricing.tax,
      amount: pricing.amount,
    };
  });
};

const parseSubscriptionPayload = (body) => {
  const items = Array.isArray(body.items) ? body.items : null;
  return {
    customer_id: normalizeText(body.customer_id),
    customer_type: body.customer_type ? String(body.customer_type).trim() : undefined,
    plan_id: normalizeText(body.plan_id),
    quotation_template_id: normalizeText(body.quotation_template_id),
    start_date: normalizeText(body.start_date),
    expiration_date: normalizeText(body.expiration_date),
    payment_terms: normalizeText(body.payment_terms),
    items,
  };
};

const validateSubscriptionPayload = (payload) => {
  const errors = [];

  if (!payload.customer_id) {
    errors.push("Customer is required.");
  }

  if (!payload.plan_id && !payload.quotation_template_id) {
    errors.push("Plan is required when quotation template is not selected.");
  }

  if (payload.customer_type && !["user", "contact"].includes(payload.customer_type)) {
    errors.push("Customer type must be user or contact.");
  }

  if (!payload.start_date || !isValidDate(payload.start_date)) {
    errors.push("Start date is required and must be valid.");
  }

  if (payload.expiration_date && !isValidDate(payload.expiration_date)) {
    errors.push("Expiration date must be valid.");
  }

  if (payload.start_date && payload.expiration_date) {
    if (new Date(payload.expiration_date) < new Date(payload.start_date)) {
      errors.push("Expiration date must be on or after start date.");
    }
  }

  if ((!Array.isArray(payload.items) || payload.items.length === 0) && !payload.quotation_template_id) {
    errors.push("Items are required when quotation template is not selected.");
  }

  if (payload.items) {
    for (const item of payload.items) {
      if (!item || typeof item !== "object") {
        errors.push("Each item must be an object.");
        continue;
      }

      if (!item.product_id) {
        errors.push("Each item must include product_id.");
      }

      if (!isPositiveInteger(item.quantity)) {
        errors.push("Each item quantity must be a positive integer.");
      }

      if (item.variant_id !== undefined && item.variant_id !== null && String(item.variant_id).trim() === "") {
        errors.push("Variant id, when provided, cannot be empty.");
      }
    }
  }

  return errors;
};

const hydrateSubscription = async (subscriptionId) => {
  const subscriptionResult = await pool.query(
    `SELECT s.id, s.subscription_number, s.customer_user_id, s.customer_contact_id, s.customer_type, s.plan_id, s.start_date, s.expiration_date, s.payment_terms, s.status, s.created_at,
            u.id AS user_id, u.name AS user_name, u.email AS user_email,
            c.id AS contact_id, c.name AS contact_name, c.email AS contact_email,
            p.id AS plan_id, p.name AS plan_name, p.billing_period, p.price AS plan_price
     FROM subscriptions s
     LEFT JOIN users u ON s.customer_user_id = u.id
     LEFT JOIN contacts c ON s.customer_contact_id = c.id
     LEFT JOIN plans p ON s.plan_id = p.id
     WHERE s.id = $1`,
    [subscriptionId]
  );

  if (subscriptionResult.rows.length === 0) {
    return null;
  }

  const itemResult = await pool.query(
    `SELECT si.id, si.subscription_id, si.product_id, si.variant_id, si.quantity, si.unit_price, si.discount, si.tax, si.amount,
            p.name AS product_name, p.type AS product_type,
            pv.attribute AS variant_attribute, pv.value AS variant_value, pv.extra_price AS variant_extra_price
     FROM subscription_items si
     JOIN products p ON si.product_id = p.id
     LEFT JOIN product_variants pv ON si.variant_id = pv.id
     WHERE si.subscription_id = $1
     ORDER BY si.created_at ASC`,
    [subscriptionId]
  );

  const row = subscriptionResult.rows[0];
  return {
    id: row.id,
    subscription_number: row.subscription_number,
    customer_id: row.customer_type === "user" ? row.customer_user_id : row.customer_contact_id,
    customer_type: row.customer_type,
    customer:
      row.customer_type === "user"
        ? { id: row.user_id, name: row.user_name, email: row.user_email }
        : { id: row.contact_id, name: row.contact_name, email: row.contact_email },
    plan: {
      id: row.plan_id,
      name: row.plan_name,
      billing_period: row.billing_period,
      price: row.plan_price,
    },
    start_date: row.start_date,
    expiration_date: row.expiration_date,
    payment_terms: row.payment_terms,
    status: row.status,
    created_at: row.created_at,
    items: itemResult.rows,
  };
};

const createSubscription = async (req, res, next) => {
  try {
    const payload = parseSubscriptionPayload(req.body);
    const errors = validateSubscriptionPayload(payload);
    if (errors.length > 0) {
      return sendError(res, 400, errors.join(" "));
    }

    const subscription = await withTransaction(async (client) => {
      const customer = await resolveCustomer(client, payload.customer_id, payload.customer_type);
      const template = payload.quotation_template_id
        ? await loadQuotationTemplate(client, payload.quotation_template_id)
        : null;

      const effectivePlanId = payload.plan_id || template?.plan_id;
      const effectiveItems = payload.items && payload.items.length > 0
        ? payload.items
        : (template?.lines || []).map((line) => ({
            product_id: line.product_id,
            quantity: line.quantity,
          }));

      const plan = await loadPlan(client, effectivePlanId);
      const loaded = await loadProductsForItems(client, effectiveItems);
      const items = buildSubscriptionItems({
        items: effectiveItems,
        productsById: loaded.productsById,
        variantsById: loaded.variantsById,
        discountsByProduct: loaded.discountsByProduct,
        plan,
        currentDate: payload.start_date,
      });

      let subscriptionNumber = generateSubscriptionNumber();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const existing = await client.query(
          "SELECT id FROM subscriptions WHERE subscription_number = $1",
          [subscriptionNumber]
        );
        if (existing.rows.length === 0) {
          break;
        }
        subscriptionNumber = generateSubscriptionNumber();
      }

      const subscriptionResult = await client.query(
        `INSERT INTO subscriptions (subscription_number, customer_user_id, customer_contact_id, customer_type, plan_id, start_date, expiration_date, payment_terms, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
         RETURNING id, subscription_number`,
        [
          subscriptionNumber,
          customer.customer_user_id,
          customer.customer_contact_id,
          customer.customer_type,
          plan.id,
          payload.start_date,
          payload.expiration_date || null,
          payload.payment_terms || null,
        ]
      );

      const subscriptionId = subscriptionResult.rows[0].id;
      if (items.length > 0) {
        const values = [];
        const placeholders = items.map((item, index) => {
          const baseIndex = index * 8;
          values.push(
            subscriptionId,
            item.product_id,
            item.variant_id,
            item.quantity,
            item.unit_price,
            item.discount,
            item.tax,
            item.amount
          );
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`;
        });

        await client.query(
          `INSERT INTO subscription_items (subscription_id, product_id, variant_id, quantity, unit_price, discount, tax, amount)
           VALUES ${placeholders.join(", ")}`,
          values
        );
      }

      return subscriptionResult.rows[0];
    });

    const hydrated = await hydrateSubscription(subscription.id);
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("subscriptions:");
    invalidateByPrefix("subscription:");
    await logActivity({
      userId: req.user?.id,
      action: "SUBSCRIPTION_CREATE",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { customerId: hydrated?.customer_id, planId: hydrated?.plan?.id },
    });
    if (hydrated?.customer_id) {
      await createNotification({
        userId: hydrated.customer_id,
        type: "subscription",
        message: `Subscription ${hydrated.subscription_number} created successfully.`,
      });
    }
    return sendSuccess(res, 201, { subscription: hydrated }, "Subscription created successfully.");
  } catch (error) {
    next(error);
  }
};

const getSubscriptions = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const status = normalizeText(req.query.status);
    const customerId = normalizeText(req.query.customer || req.query.customer_id);
    const customerType = req.query.customer_type ? String(req.query.customer_type).trim() : undefined;

    const conditions = [];
    const params = [];

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return sendError(res, 400, "Invalid status filter.");
      }
      conditions.push(`s.status = $${params.length + 1}`);
      params.push(status);
    }

    if (customerId) {
      if (customerType === "user") {
        conditions.push(`s.customer_user_id = $${params.length + 1}`);
        params.push(customerId);
      } else if (customerType === "contact") {
        conditions.push(`s.customer_contact_id = $${params.length + 1}`);
        params.push(customerId);
      } else {
        conditions.push(`(s.customer_user_id = $${params.length + 1} OR s.customer_contact_id = $${params.length + 1})`);
        params.push(customerId);
      }
    }

    params.push(limit);
    const limitRef = `$${params.length}`;
    params.push(offset);
    const offsetRef = `$${params.length}`;

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countParams = params.slice(0, params.length - 2);

    const data = await cached(
      `subscriptions:${page}:${limit}:${status || "_"}:${customerId || "_"}:${customerType || "_"}`,
      async () => {
        const [subscriptionResult, countResult] = await Promise.all([
          pool.query(
            `SELECT s.id, s.subscription_number, s.customer_user_id, s.customer_contact_id, s.customer_type, s.plan_id, s.start_date, s.expiration_date, s.payment_terms, s.status, s.created_at,
                    u.name AS user_name, u.email AS user_email,
                    c.name AS contact_name, c.email AS contact_email,
                    p.name AS plan_name
             FROM subscriptions s
             LEFT JOIN users u ON s.customer_user_id = u.id
             LEFT JOIN contacts c ON s.customer_contact_id = c.id
             LEFT JOIN plans p ON s.plan_id = p.id
             ${whereClause}
             ORDER BY s.created_at DESC
             LIMIT ${limitRef} OFFSET ${offsetRef}`,
            params
          ),
          pool.query(`SELECT COUNT(*)::INT AS total FROM subscriptions s ${whereClause}`, countParams),
        ]);

        return {
          rows: subscriptionResult.rows,
          total: countResult.rows[0]?.total || 0,
        };
      },
      { ttlMs: 60_000, tags: ["reports", "search"] }
    );

    const subscriptions = data.rows.map((row) => ({
      id: row.id,
      subscription_number: row.subscription_number,
      customer_id: row.customer_type === "user" ? row.customer_user_id : row.customer_contact_id,
      customer_type: row.customer_type,
      customer:
        row.customer_type === "user"
          ? { id: row.customer_user_id, name: row.user_name, email: row.user_email }
          : { id: row.customer_contact_id, name: row.contact_name, email: row.contact_email },
      plan: { id: row.plan_id, name: row.plan_name },
      start_date: row.start_date,
      expiration_date: row.expiration_date,
      payment_terms: row.payment_terms,
      status: row.status,
      created_at: row.created_at,
    }));

    return sendSuccess(
      res,
      200,
      {
        subscriptions,
        pagination: {
          page,
          limit,
          total: data.total,
          totalPages: Math.ceil((data.total || 0) / limit) || 1,
        },
      },
      "Subscriptions fetched successfully."
    );
  } catch (error) {
    next(error);
  }
};

const getSubscriptionById = async (req, res, next) => {
  try {
    const subscription = await cached(
      `subscription:${req.params.id}`,
      async () => hydrateSubscription(req.params.id),
      { ttlMs: 60_000, tags: ["reports", "search"] }
    );
    if (!subscription) {
      return sendError(res, 404, "Subscription not found.");
    }

    return sendSuccess(res, 200, { subscription }, "Subscription fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateSubscription = async (req, res, next) => {
  try {
    const existing = await hydrateSubscription(req.params.id);
    if (!existing) {
      return sendError(res, 404, "Subscription not found.");
    }

    const payload = parseSubscriptionPayload(req.body);
    const updateErrors = [];

    if (!payload.customer_id && !payload.plan_id && !payload.start_date && !payload.expiration_date && !payload.payment_terms && !payload.items) {
      return sendError(res, 400, "Provide at least one field to update.");
    }

    if (payload.customer_type && !["user", "contact"].includes(payload.customer_type)) {
      updateErrors.push("Customer type must be user or contact.");
    }

    if (payload.start_date && !isValidDate(payload.start_date)) {
      updateErrors.push("Start date must be valid.");
    }

    if (payload.expiration_date && !isValidDate(payload.expiration_date)) {
      updateErrors.push("Expiration date must be valid.");
    }

    if (payload.start_date && payload.expiration_date && new Date(payload.expiration_date) < new Date(payload.start_date)) {
      updateErrors.push("Expiration date must be on or after start date.");
    }

    if (payload.items && payload.items.length > 0) {
      const itemErrors = validateSubscriptionPayload({
        customer_id: payload.customer_id || existing.customer_id,
        plan_id: payload.plan_id || existing.plan.id,
        start_date: payload.start_date || existing.start_date,
        expiration_date: payload.expiration_date || existing.expiration_date,
        items: payload.items,
      });
      if (itemErrors.length > 0) {
        updateErrors.push(...itemErrors);
      }
    }

    if (updateErrors.length > 0) {
      return sendError(res, 400, updateErrors.join(" "));
    }

    await withTransaction(async (client) => {
      const current = await client.query("SELECT id, status, customer_user_id, customer_contact_id, customer_type, plan_id, start_date, expiration_date, payment_terms FROM subscriptions WHERE id = $1", [req.params.id]);
      if (current.rows.length === 0) {
        const error = new Error("Subscription not found.");
        error.statusCode = 404;
        throw error;
      }

      const nextCustomerId = payload.customer_id || existing.customer_id;
      const nextCustomerType = payload.customer_type || existing.customer_type;
      const customer = await resolveCustomer(client, nextCustomerId, nextCustomerType);
      const plan = payload.plan_id ? await loadPlan(client, payload.plan_id) : await loadPlan(client, existing.plan.id);
      const sourceItems = payload.items || existing.items.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
      }));
      const loaded = await loadProductsForItems(client, sourceItems);
      const items = buildSubscriptionItems({
        items: sourceItems,
        productsById: loaded.productsById,
        variantsById: loaded.variantsById,
        discountsByProduct: loaded.discountsByProduct,
        plan,
        currentDate: payload.start_date || existing.start_date,
      });

      await client.query(
        `UPDATE subscriptions
         SET customer_user_id = $1,
             customer_contact_id = $2,
             customer_type = $3,
             plan_id = $4,
             start_date = COALESCE($5, start_date),
             expiration_date = COALESCE($6, expiration_date),
             payment_terms = COALESCE($7, payment_terms)
         WHERE id = $8`,
        [
          customer.customer_user_id,
          customer.customer_contact_id,
          customer.customer_type,
          plan.id,
          payload.start_date || null,
          payload.expiration_date || null,
          payload.payment_terms || null,
          req.params.id,
        ]
      );

      await client.query("DELETE FROM subscription_items WHERE subscription_id = $1", [req.params.id]);
      if (items.length > 0) {
        const values = [];
        const placeholders = items.map((item, index) => {
          const baseIndex = index * 8;
          values.push(req.params.id, item.product_id, item.variant_id, item.quantity, item.unit_price, item.discount, item.tax, item.amount);
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`;
        });

        await client.query(
          `INSERT INTO subscription_items (subscription_id, product_id, variant_id, quantity, unit_price, discount, tax, amount)
           VALUES ${placeholders.join(", ")}`,
          values
        );
      }
    });

    const updated = await hydrateSubscription(req.params.id);
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("subscriptions:");
    invalidateByPrefix("subscription:");
    await logActivity({
      userId: req.user?.id,
      action: "SUBSCRIPTION_UPDATE",
      entityType: "subscription",
      entityId: req.params.id,
    });
    return sendSuccess(res, 200, { subscription: updated }, "Subscription updated successfully.");
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (subscriptionId, nextStatus, allowedStatuses) => {
  return withTransaction(async (client) => {
    const result = await client.query("SELECT id, status FROM subscriptions WHERE id = $1", [subscriptionId]);
    if (result.rows.length === 0) {
      const error = new Error("Subscription not found.");
      error.statusCode = 404;
      throw error;
    }

    if (!allowedStatuses.includes(result.rows[0].status)) {
      const error = new Error(`Cannot move subscription from ${result.rows[0].status} to ${nextStatus}.`);
      error.statusCode = 400;
      throw error;
    }

    await client.query("UPDATE subscriptions SET status = $1 WHERE id = $2", [nextStatus, subscriptionId]);
  });
};

const sendSubscription = async (req, res, next) => {
  try {
    await updateStatus(req.params.id, "quotation", ["draft"]);
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("subscriptions:");
    invalidateByPrefix("subscription:");
    await logActivity({ userId: req.user?.id, action: "SUBSCRIPTION_QUOTATION", entityType: "subscription", entityId: req.params.id });
    return sendSuccess(res, 200, {}, "Subscription moved to quotation.");
  } catch (error) {
    next(error);
  }
};

const confirmSubscription = async (req, res, next) => {
  try {
    await updateStatus(req.params.id, "active", ["quotation", "confirmed"]);
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("subscriptions:");
    invalidateByPrefix("subscription:");
    await logActivity({ userId: req.user?.id, action: "SUBSCRIPTION_ACTIVATED", entityType: "subscription", entityId: req.params.id });
    return sendSuccess(res, 200, {}, "Subscription confirmed and activated.");
  } catch (error) {
    next(error);
  }
};

const closeSubscription = async (req, res, next) => {
  try {
    const subscriptionResult = await pool.query("SELECT id, status FROM subscriptions WHERE id = $1", [req.params.id]);
    if (subscriptionResult.rows.length === 0) {
      return sendError(res, 404, "Subscription not found.");
    }

    const currentStatus = subscriptionResult.rows[0].status;
    const isInternal = req.user.role === "internal";
    const forcefulStatuses = ["confirmed", "active"];

    if (isInternal && forcefulStatuses.includes(currentStatus)) {
      const reason = normalizeText(req.body?.reason) || "Requested force close for subscription.";
      const { approval } = await createApprovalRequest({
        userId: req.user.id,
        actionType: "CLOSE_SUBSCRIPTION",
        entityType: "subscription",
        entityId: req.params.id,
        reason,
      });

      console.log(
        `[AUDIT] approval_requested requester=${req.user.id} action=CLOSE_SUBSCRIPTION entity=subscription:${req.params.id} approval=${approval.id}`
      );

      await createNotificationForRoles({
        roles: ["admin"],
        type: "approval",
        message: `Approval requested to close subscription ${req.params.id}.`,
      });

      return sendSuccess(
        res,
        202,
        { approval },
        "Approval request created. Admin approval required for forceful closure."
      );
    }

    await updateStatus(req.params.id, "closed", ["draft", "quotation", "confirmed", "active"]);
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("subscriptions:");
    invalidateByPrefix("subscription:");
    await logActivity({ userId: req.user?.id, action: "SUBSCRIPTION_CLOSED", entityType: "subscription", entityId: req.params.id });
    return sendSuccess(res, 200, {}, "Subscription closed.");
  } catch (error) {
    next(error);
  }
};

const cloneSubscription = async (subscriptionId, overrides = {}) => {
  const newSubscriptionId = await withTransaction(async (client) => {
    const current = await hydrateSubscription(subscriptionId);
    if (!current) {
      const error = new Error("Subscription not found.");
      error.statusCode = 404;
      throw error;
    }

    const payload = {
      customer_id: overrides.customer_id || current.customer_id,
      customer_type: overrides.customer_type || current.customer_type,
      plan_id: overrides.plan_id || current.plan.id,
      start_date: overrides.start_date || current.start_date,
      expiration_date: overrides.expiration_date || current.expiration_date,
      payment_terms: overrides.payment_terms || current.payment_terms,
      items: overrides.items || current.items.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
      })),
    };

    const customer = await resolveCustomer(client, payload.customer_id, payload.customer_type);
    const plan = await loadPlan(client, payload.plan_id);
    const loaded = await loadProductsForItems(client, payload.items);
    const items = buildSubscriptionItems({
      items: payload.items,
      productsById: loaded.productsById,
      variantsById: loaded.variantsById,
      discountsByProduct: loaded.discountsByProduct,
      plan,
      currentDate: payload.start_date,
    });

    const subscriptionNumber = generateSubscriptionNumber();
    const inserted = await client.query(
      `INSERT INTO subscriptions (subscription_number, customer_user_id, customer_contact_id, customer_type, plan_id, start_date, expiration_date, payment_terms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
       RETURNING id`,
      [
        subscriptionNumber,
        customer.customer_user_id,
        customer.customer_contact_id,
        customer.customer_type,
        plan.id,
        payload.start_date,
        payload.expiration_date,
        payload.payment_terms,
      ]
    );

    const newSubscriptionId = inserted.rows[0].id;
    if (items.length > 0) {
      const values = [];
      const placeholders = items.map((item, index) => {
        const baseIndex = index * 8;
        values.push(newSubscriptionId, item.product_id, item.variant_id, item.quantity, item.unit_price, item.discount, item.tax, item.amount);
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`;
      });
      await client.query(
        `INSERT INTO subscription_items (subscription_id, product_id, variant_id, quantity, unit_price, discount, tax, amount)
         VALUES ${placeholders.join(", ")}`,
        values
      );
    }

    return newSubscriptionId;
  });
};

const renewSubscription = async (req, res, next) => {
  try {
    const ownershipCheck = await pool.query(
      `SELECT id, customer_user_id, customer_contact_id, customer_type
       FROM subscriptions
       WHERE id = $1`,
      [req.params.id]
    );

    if (ownershipCheck.rows.length === 0) {
      return sendError(res, 404, "Subscription not found.");
    }

    if (req.user.role === "user" && String(ownershipCheck.rows[0].customer_user_id || "") !== String(req.user.id || "")) {
      return sendError(res, 403, "You can only renew your own subscription.");
    }

    const subscriptionId = await cloneSubscription(req.params.id, {});
    const subscription = await hydrateSubscription(subscriptionId);
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("subscriptions:");
    invalidateByPrefix("subscription:");
    await logActivity({
      userId: req.user?.id,
      action: "SUBSCRIPTION_RENEWED",
      entityType: "subscription",
      entityId: subscriptionId,
      metadata: { sourceSubscriptionId: req.params.id },
    });
    return sendSuccess(res, 201, { subscription }, "Subscription renewed successfully.");
  } catch (error) {
    next(error);
  }
};

const upsellSubscription = async (req, res, next) => {
  try {
    const subscriptionId = await cloneSubscription(req.params.id, parseSubscriptionPayload(req.body));
    const subscription = await hydrateSubscription(subscriptionId);
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("subscriptions:");
    invalidateByPrefix("subscription:");
    await logActivity({
      userId: req.user?.id,
      action: "SUBSCRIPTION_UPSELL",
      entityType: "subscription",
      entityId: subscriptionId,
      metadata: { sourceSubscriptionId: req.params.id },
    });
    return sendSuccess(res, 201, { subscription }, "Subscription upsell created successfully.");
  } catch (error) {
    next(error);
  }
};

const createInvoiceFromSubscription = async (req, res, next) => {
  try {
    const invoiceId = await createInvoiceFromSubscriptionInternal(req.params.id);
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("invoice:");
    invalidateByPrefix("invoices:");
    await logActivity({
      userId: req.user?.id,
      action: "SUBSCRIPTION_INVOICE_CREATED",
      entityType: "subscription",
      entityId: req.params.id,
      metadata: { invoiceId },
    });
    const subscription = await hydrateSubscription(req.params.id);
    if (subscription?.customer_id) {
      await createNotification({
        userId: subscription.customer_id,
        type: "invoice",
        message: "A new invoice was generated for your subscription.",
      });
    }
    return sendSuccess(res, 201, { invoice_id: invoiceId }, "Invoice generated from subscription successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  sendSubscription,
  confirmSubscription,
  closeSubscription,
  renewSubscription,
  upsellSubscription,
  createInvoiceFromSubscription,
};
