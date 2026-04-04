const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");

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

const validateDiscountPayload = (payload, isPartial = false) => {
  const errors = [];

  if (!isPartial || payload.name !== undefined) {
    if (!payload.name || !String(payload.name).trim()) {
      errors.push("Name is required.");
    }
  }

  if (!isPartial || payload.type !== undefined) {
    if (!["fixed", "percentage"].includes(payload.type)) {
      errors.push("Type must be fixed or percentage.");
    }
  }

  if (!isPartial || payload.value !== undefined) {
    if (!isPositiveNumber(payload.value)) {
      errors.push("Value must be greater than 0.");
    }
  }

  if (payload.min_purchase !== undefined && payload.min_purchase !== null && payload.min_purchase !== "" && !isPositiveNumber(payload.min_purchase)) {
    errors.push("Min purchase must be greater than 0.");
  }

  if (payload.min_quantity !== undefined && payload.min_quantity !== null && payload.min_quantity !== "" && (!Number.isInteger(Number(payload.min_quantity)) || Number(payload.min_quantity) <= 0)) {
    errors.push("Min quantity must be a positive integer.");
  }

  if (payload.usage_limit !== undefined && payload.usage_limit !== null && payload.usage_limit !== "" && (!Number.isInteger(Number(payload.usage_limit)) || Number(payload.usage_limit) <= 0)) {
    errors.push("Usage limit must be a positive integer.");
  }

  if (payload.start_date !== undefined && payload.start_date !== null && payload.start_date !== "" && !isValidDate(payload.start_date)) {
    errors.push("Start date must be valid.");
  }

  if (payload.end_date !== undefined && payload.end_date !== null && payload.end_date !== "" && !isValidDate(payload.end_date)) {
    errors.push("End date must be valid.");
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

const normalizeProductIds = (productIds) => {
  if (productIds === undefined) {
    return null;
  }

  if (!Array.isArray(productIds)) {
    throw new Error("Products must be an array.");
  }

  return [...new Set(productIds.map((value) => String(value).trim()).filter(Boolean))];
};

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

const fetchDiscountById = async (discountId) => {
  const discountResult = await pool.query(
    `SELECT id, name, type, value, min_purchase, min_quantity, start_date, end_date, usage_limit, apply_to_subscription, created_at
     FROM discounts
     WHERE id = $1`,
    [discountId]
  );

  if (discountResult.rows.length === 0) {
    return null;
  }

  const productsResult = await pool.query(
    `SELECT p.id, p.name, p.type, p.sales_price, p.cost_price, p.tax_id, p.is_archived, p.created_at
     FROM discount_products dp
     JOIN products p ON p.id = dp.product_id
     WHERE dp.discount_id = $1
     ORDER BY p.created_at DESC`,
    [discountId]
  );

  return {
    ...discountResult.rows[0],
    products: productsResult.rows,
  };
};

const getDiscounts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, type, value, min_purchase, min_quantity, start_date, end_date, usage_limit, apply_to_subscription, created_at
       FROM discounts
       ORDER BY created_at DESC`
    );

    const discountIds = result.rows.map((row) => row.id);
    let mappings = [];

    if (discountIds.length > 0) {
      const mappingResult = await pool.query(
        `SELECT dp.discount_id, p.id AS product_id, p.name, p.type, p.sales_price, p.cost_price, p.tax_id, p.is_archived, p.created_at
         FROM discount_products dp
         JOIN products p ON p.id = dp.product_id
         WHERE dp.discount_id = ANY($1::uuid[])`,
        [discountIds]
      );
      mappings = mappingResult.rows;
    }

    const discountsById = new Map(
      result.rows.map((discount) => [
        discount.id,
        {
          ...discount,
          products: [],
        },
      ])
    );

    for (const mapping of mappings) {
      const discount = discountsById.get(mapping.discount_id);
      if (discount) {
        discount.products.push({
          id: mapping.product_id,
          name: mapping.name,
          type: mapping.type,
          sales_price: mapping.sales_price,
          cost_price: mapping.cost_price,
          tax_id: mapping.tax_id,
          is_archived: mapping.is_archived,
          created_at: mapping.created_at,
        });
      }
    }

    return sendSuccess(res, 200, { discounts: Array.from(discountsById.values()) }, "Discounts fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const createDiscount = async (req, res, next) => {
  try {
    const errors = validateDiscountPayload(req.body);
    if (errors.length > 0) {
      return sendError(res, 400, errors.join(" "));
    }

    const productIds = normalizeProductIds(req.body.product_ids);

    const createdDiscount = await withTransaction(async (client) => {
      if (productIds && productIds.length > 0) {
        const productCheck = await client.query("SELECT id FROM products WHERE id = ANY($1::uuid[])", [productIds]);
        if (productCheck.rows.length !== productIds.length) {
          const error = new Error("One or more linked products do not exist.");
          error.statusCode = 400;
          throw error;
        }
      }

      const discountResult = await client.query(
        `INSERT INTO discounts (name, type, value, min_purchase, min_quantity, start_date, end_date, usage_limit, apply_to_subscription)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, name, type, value, min_purchase, min_quantity, start_date, end_date, usage_limit, apply_to_subscription, created_at`,
        [
          String(req.body.name).trim(),
          req.body.type,
          req.body.value,
          req.body.min_purchase ?? null,
          req.body.min_quantity ?? null,
          req.body.start_date ?? null,
          req.body.end_date ?? null,
          req.body.usage_limit ?? null,
          parseBoolean(req.body.apply_to_subscription, false),
        ]
      );

      if (productIds && productIds.length > 0) {
        const mappingValues = [];
        const placeholders = productIds.map((productId, index) => {
          const baseIndex = index * 2;
          mappingValues.push(discountResult.rows[0].id, productId);
          return `($${baseIndex + 1}, $${baseIndex + 2})`;
        });

        await client.query(
          `INSERT INTO discount_products (discount_id, product_id)
           VALUES ${placeholders.join(", ")}`,
          mappingValues
        );
      }

      return discountResult.rows[0];
    });

    const discount = await fetchDiscountById(createdDiscount.id);
    return sendSuccess(res, 201, { discount }, "Discount created successfully.");
  } catch (error) {
    next(error);
  }
};

const getDiscountById = async (req, res, next) => {
  try {
    const discount = await fetchDiscountById(req.params.id);
    if (!discount) {
      return sendError(res, 404, "Discount not found.");
    }

    return sendSuccess(res, 200, { discount }, "Discount fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateDiscount = async (req, res, next) => {
  try {
    const existing = await pool.query("SELECT id FROM discounts WHERE id = $1", [req.params.id]);
    if (existing.rows.length === 0) {
      return sendError(res, 404, "Discount not found.");
    }

    const errors = validateDiscountPayload(req.body, true);
    if (errors.length > 0) {
      return sendError(res, 400, errors.join(" "));
    }

    const productIds = normalizeProductIds(req.body.product_ids);

    await withTransaction(async (client) => {
      if (productIds !== null) {
        if (productIds.length > 0) {
          const productCheck = await client.query("SELECT id FROM products WHERE id = ANY($1::uuid[])", [productIds]);
          if (productCheck.rows.length !== productIds.length) {
            const error = new Error("One or more linked products do not exist.");
            error.statusCode = 400;
            throw error;
          }
        }
      }

      await client.query(
        `UPDATE discounts
         SET name = COALESCE($1, name),
             type = COALESCE($2, type),
             value = COALESCE($3, value),
             min_purchase = COALESCE($4, min_purchase),
             min_quantity = COALESCE($5, min_quantity),
             start_date = COALESCE($6, start_date),
             end_date = COALESCE($7, end_date),
             usage_limit = COALESCE($8, usage_limit),
             apply_to_subscription = COALESCE($9, apply_to_subscription)
         WHERE id = $10`,
        [
          req.body.name !== undefined ? String(req.body.name).trim() : null,
          req.body.type !== undefined ? req.body.type : null,
          req.body.value !== undefined ? req.body.value : null,
          req.body.min_purchase !== undefined ? req.body.min_purchase : null,
          req.body.min_quantity !== undefined ? req.body.min_quantity : null,
          req.body.start_date !== undefined ? req.body.start_date : null,
          req.body.end_date !== undefined ? req.body.end_date : null,
          req.body.usage_limit !== undefined ? req.body.usage_limit : null,
          req.body.apply_to_subscription !== undefined ? parseBoolean(req.body.apply_to_subscription, null) : null,
          req.params.id,
        ]
      );

      if (productIds !== null) {
        await client.query("DELETE FROM discount_products WHERE discount_id = $1", [req.params.id]);

        if (productIds.length > 0) {
          const mappingValues = [];
          const placeholders = productIds.map((productId, index) => {
            const baseIndex = index * 2;
            mappingValues.push(req.params.id, productId);
            return `($${baseIndex + 1}, $${baseIndex + 2})`;
          });

          await client.query(
            `INSERT INTO discount_products (discount_id, product_id)
             VALUES ${placeholders.join(", ")}`,
            mappingValues
          );
        }
      }
    });

    const discount = await fetchDiscountById(req.params.id);
    return sendSuccess(res, 200, { discount }, "Discount updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteDiscount = async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM discounts WHERE id = $1 RETURNING id, name", [req.params.id]);
    if (result.rows.length === 0) {
      return sendError(res, 404, "Discount not found.");
    }

    return sendSuccess(res, 200, { discount: result.rows[0] }, "Discount deleted successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDiscounts,
  createDiscount,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
};
