const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { createApprovalRequest } = require("../utils/approvalService");
const { cached, invalidateTag, invalidateByPrefix } = require("../services/cacheService");
const { logActivity } = require("../services/activityLogService");

const isPositiveNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  const number = Number(value);
  return Number.isFinite(number) && number > 0;
};

const isNonNegativeNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
};

const normalizeString = (value) => (value === undefined || value === null ? null : String(value).trim());

const validateVariants = (variants) => {
  if (!Array.isArray(variants)) {
    return "Variants must be an array.";
  }

  for (const variant of variants) {
    if (!variant || typeof variant !== "object") {
      return "Each variant must be an object.";
    }

    if (!normalizeString(variant.attribute) || !normalizeString(variant.value)) {
      return "Variant attribute and value are required.";
    }

    if (!isNonNegativeNumber(variant.extra_price ?? 0)) {
      return "Variant extra_price must be zero or a positive number.";
    }
  }

  return null;
};

const validateRecurringPrices = (recurringPrices) => {
  if (!Array.isArray(recurringPrices)) {
    return "Recurring prices must be an array.";
  }

  for (const priceRow of recurringPrices) {
    if (!priceRow || typeof priceRow !== "object") {
      return "Each recurring price must be an object.";
    }

    if (!isPositiveNumber(priceRow.price)) {
      return "Recurring price must be a positive number.";
    }

    const minQuantity = priceRow.min_quantity ?? 1;
    if (!Number.isInteger(Number(minQuantity)) || Number(minQuantity) <= 0) {
      return "Recurring min_quantity must be a positive integer.";
    }

    if (!normalizeString(priceRow.start_date)) {
      return "Recurring start_date is required.";
    }

    const startDate = new Date(priceRow.start_date);
    if (Number.isNaN(startDate.getTime())) {
      return "Recurring start_date must be a valid date.";
    }

    if (priceRow.end_date !== undefined && priceRow.end_date !== null && priceRow.end_date !== "") {
      const endDate = new Date(priceRow.end_date);
      if (Number.isNaN(endDate.getTime())) {
        return "Recurring end_date must be a valid date.";
      }
    }
  }

  return null;
};

const mapProductRows = (productRows, variantRows, recurringRows) => {
  const productsById = new Map();

  for (const row of productRows) {
    productsById.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.type,
      sales_price: row.sales_price,
      cost_price: row.cost_price,
      tax_id: row.tax_id,
      is_archived: row.is_archived,
      created_at: row.created_at,
      variants: [],
      recurring_prices: [],
    });
  }

  for (const variant of variantRows) {
    const product = productsById.get(variant.product_id);
    if (product) {
      product.variants.push({
        id: variant.id,
        product_id: variant.product_id,
        attribute: variant.attribute,
        value: variant.value,
        extra_price: variant.extra_price,
      });
    }
  }

  for (const recurring of recurringRows) {
    const product = productsById.get(recurring.product_id);
    if (product) {
      product.recurring_prices.push({
        id: recurring.id,
        product_id: recurring.product_id,
        plan_id: recurring.plan_id,
        price: recurring.price,
        min_quantity: recurring.min_quantity,
        start_date: recurring.start_date,
        end_date: recurring.end_date,
      });
    }
  }

  return Array.from(productsById.values());
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

const getProducts = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const search = normalizeString(req.query.search);
    const includeArchived = String(req.query.include_archived || "false").toLowerCase() === "true";

    const conditions = [];
    const params = [];

    if (!includeArchived) {
      conditions.push(`p.is_archived = FALSE`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`p.name ILIKE $${params.length}`);
    }

    params.push(limit);
    const limitRef = `$${params.length}`;
    params.push(offset);
    const offsetRef = `$${params.length}`;

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countParams = params.slice(0, params.length - 2);
    const countWhere = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const productQuery = `
      SELECT p.id, p.name, p.type, p.sales_price, p.cost_price, p.tax_id, p.is_archived, p.created_at
      FROM products p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ${limitRef} OFFSET ${offsetRef}
    `;

    const cacheKey = `products:${page}:${limit}:${search || "_"}:${includeArchived}`;
    const data = await cached(
      cacheKey,
      async () => {
        const [productResult, countResult] = await Promise.all([
          pool.query(productQuery, params),
          pool.query(
            `SELECT COUNT(*)::INT AS total FROM products p ${countWhere}`,
            countParams
          ),
        ]);

        const productIds = productResult.rows.map((row) => row.id);
        let variantRows = [];
        let recurringRows = [];

        if (productIds.length > 0) {
          const variantResult = await pool.query(
            `SELECT id, product_id, attribute, value, extra_price
             FROM product_variants
             WHERE product_id = ANY($1::uuid[])`,
            [productIds]
          );

          const recurringResult = await pool.query(
            `SELECT id, product_id, plan_id, price, min_quantity, start_date, end_date
             FROM product_recurring_prices
             WHERE product_id = ANY($1::uuid[])`,
            [productIds]
          );

          variantRows = variantResult.rows;
          recurringRows = recurringResult.rows;
        }

        const products = mapProductRows(productResult.rows, variantRows, recurringRows);
        const total = countResult.rows[0]?.total || 0;
        return { products, total };
      },
      { ttlMs: 60_000, tags: ["products", "search"] }
    );

    return sendSuccess(
      res,
      200,
      {
        products: data.products,
        pagination: {
          page,
          limit,
          total: data.total,
          totalPages: Math.ceil(data.total / limit) || 1,
        },
      },
      "Products fetched successfully."
    );
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, type, sales_price, cost_price, tax_id: taxId = null, variants = [], recurring_prices = [] } = req.body;

    if (!normalizeString(name) || !normalizeString(type)) {
      return sendError(res, 400, "Name and type are required.");
    }

    if (!["service", "goods"].includes(type)) {
      return sendError(res, 400, "Type must be service or goods.");
    }

    if (!isPositiveNumber(sales_price) || !isPositiveNumber(cost_price)) {
      return sendError(res, 400, "Sales price and cost price must be positive numbers.");
    }

    const variantError = validateVariants(variants);
    if (variantError) {
      return sendError(res, 400, variantError);
    }

    const recurringError = validateRecurringPrices(recurring_prices);
    if (recurringError) {
      return sendError(res, 400, recurringError);
    }

    const createdProduct = await withTransaction(async (client) => {
      if (taxId) {
        const taxResult = await client.query("SELECT id FROM taxes WHERE id = $1", [taxId]);
        if (taxResult.rows.length === 0) {
          const error = new Error("Referenced tax record does not exist.");
          error.statusCode = 400;
          throw error;
        }
      }

      const productResult = await client.query(
        `INSERT INTO products (name, type, sales_price, cost_price, tax_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, type, sales_price, cost_price, tax_id, is_archived, created_at`,
        [normalizeString(name), type, sales_price, cost_price, taxId || null]
      );

      const product = productResult.rows[0];

      if (variants.length > 0) {
        const variantValues = [];
        const variantPlaceholders = variants.map((variant, index) => {
          const baseIndex = index * 4;
          variantValues.push(
            product.id,
            normalizeString(variant.attribute),
            normalizeString(variant.value),
            variant.extra_price !== undefined ? variant.extra_price : 0
          );
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
        });

        await client.query(
          `INSERT INTO product_variants (product_id, attribute, value, extra_price)
           VALUES ${variantPlaceholders.join(", ")}`,
          variantValues
        );
      }

      if (recurring_prices.length > 0) {
        const recurringValues = [];
        const recurringPlaceholders = recurring_prices.map((row, index) => {
          const baseIndex = index * 6;
          recurringValues.push(
            product.id,
            row.plan_id || null,
            row.price,
            row.min_quantity ?? 1,
            row.start_date,
            row.end_date || null
          );
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
        });

        if (recurringValues.length > 0) {
          await client.query(
            `INSERT INTO product_recurring_prices (product_id, plan_id, price, min_quantity, start_date, end_date)
             VALUES ${recurringPlaceholders.join(", ")}`,
            recurringValues
          );
        }
      }

      return product;
    });

    const fullProductResult = await pool.query(
      `SELECT id, name, type, sales_price, cost_price, tax_id, is_archived, created_at
       FROM products
       WHERE id = $1`,
      [createdProduct.id]
    );

    const variantResult = await pool.query(
      `SELECT id, product_id, attribute, value, extra_price
       FROM product_variants
       WHERE product_id = $1`,
      [createdProduct.id]
    );

    const recurringResult = await pool.query(
      `SELECT id, product_id, plan_id, price, min_quantity, start_date, end_date
       FROM product_recurring_prices
       WHERE product_id = $1`,
      [createdProduct.id]
    );

    const [product] = mapProductRows(fullProductResult.rows, variantResult.rows, recurringResult.rows);

    invalidateTag("products");
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("products:");
    await logActivity({
      userId: req.user?.id,
      action: "PRODUCT_CREATE",
      entityType: "product",
      entityId: product?.id,
      metadata: { name: product?.name },
    });

    return sendSuccess(res, 201, { product }, "Product created successfully.");
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await cached(
      `product:${id}`,
      async () => {
        const productResult = await pool.query(
          `SELECT id, name, type, sales_price, cost_price, tax_id, is_archived, created_at
           FROM products
           WHERE id = $1`,
          [id]
        );

        if (productResult.rows.length === 0) {
          return null;
        }

        const variantResult = await pool.query(
          `SELECT id, product_id, attribute, value, extra_price
           FROM product_variants
           WHERE product_id = $1`,
          [id]
        );

        const recurringResult = await pool.query(
          `SELECT id, product_id, plan_id, price, min_quantity, start_date, end_date
           FROM product_recurring_prices
           WHERE product_id = $1`,
          [id]
        );

        const [mapped] = mapProductRows(productResult.rows, variantResult.rows, recurringResult.rows);
        return mapped || null;
      },
      { ttlMs: 60_000, tags: ["products"] }
    );

    if (!product) {
      return sendError(res, 404, "Product not found.");
    }

    return sendSuccess(res, 200, { product }, "Product fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, sales_price, cost_price, tax_id: taxId, variants, recurring_prices: recurringPrices } = req.body;

    const productExists = await pool.query("SELECT id FROM products WHERE id = $1", [id]);
    if (productExists.rows.length === 0) {
      return sendError(res, 404, "Product not found.");
    }

    if (name === undefined && type === undefined && sales_price === undefined && cost_price === undefined && taxId === undefined && variants === undefined && recurring_prices === undefined) {
      return sendError(res, 400, "Provide at least one field to update.");
    }

    if (name !== undefined && !normalizeString(name)) {
      return sendError(res, 400, "Name cannot be empty.");
    }

    if (type !== undefined && !["service", "goods"].includes(type)) {
      return sendError(res, 400, "Type must be service or goods.");
    }

    if (sales_price !== undefined && !isPositiveNumber(sales_price)) {
      return sendError(res, 400, "Sales price must be a positive number.");
    }

    if (cost_price !== undefined && !isPositiveNumber(cost_price)) {
      return sendError(res, 400, "Cost price must be a positive number.");
    }

    if (taxId !== undefined && taxId !== null && taxId !== "") {
      const taxResult = await pool.query("SELECT id FROM taxes WHERE id = $1", [taxId]);
      if (taxResult.rows.length === 0) {
        return sendError(res, 400, "Referenced tax record does not exist.");
      }
    }

    if (variants !== undefined) {
      const variantError = validateVariants(variants);
      if (variantError) {
        return sendError(res, 400, variantError);
      }
    }

    if (recurringPrices !== undefined) {
      const recurringError = validateRecurringPrices(recurringPrices);
      if (recurringError) {
        return sendError(res, 400, recurringError);
      }
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE products
         SET name = COALESCE($1, name),
             type = COALESCE($2, type),
             sales_price = COALESCE($3, sales_price),
             cost_price = COALESCE($4, cost_price),
             tax_id = COALESCE($5, tax_id)
         WHERE id = $6`,
        [
          name !== undefined ? normalizeString(name) : null,
          type !== undefined ? type : null,
          sales_price !== undefined ? sales_price : null,
          cost_price !== undefined ? cost_price : null,
          taxId !== undefined ? (taxId || null) : null,
          id,
        ]
      );

      if (variants !== undefined) {
        await client.query("DELETE FROM product_variants WHERE product_id = $1", [id]);

        if (variants.length > 0) {
          const variantValues = [];
          const variantPlaceholders = variants.map((variant, index) => {
            const baseIndex = index * 4;
            variantValues.push(id, normalizeString(variant.attribute), normalizeString(variant.value), variant.extra_price ?? 0);
            return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
          });

          await client.query(
            `INSERT INTO product_variants (product_id, attribute, value, extra_price)
             VALUES ${variantPlaceholders.join(", ")}`,
            variantValues
          );
        }
      }

      if (recurringPrices !== undefined) {
        await client.query("DELETE FROM product_recurring_prices WHERE product_id = $1", [id]);

        if (recurringPrices.length > 0) {
          const recurringValues = [];
          const recurringPlaceholders = recurringPrices.map((row, index) => {
            const baseIndex = index * 6;
            recurringValues.push(id, row.plan_id || null, row.price, row.min_quantity ?? 1, row.start_date, row.end_date || null);
            return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
          });

          await client.query(
            `INSERT INTO product_recurring_prices (product_id, plan_id, price, min_quantity, start_date, end_date)
             VALUES ${recurringPlaceholders.join(", ")}`,
            recurringValues
          );
        }
      }
    });

    invalidateTag("products");
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("products:");
    invalidateByPrefix("product:");
    await logActivity({
      userId: req.user?.id,
      action: "PRODUCT_UPDATE",
      entityType: "product",
      entityId: id,
    });

    return getProductById(req, res, next);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const productResult = await pool.query("SELECT id, name FROM products WHERE id = $1", [id]);
    if (productResult.rows.length === 0) {
      return sendError(res, 404, "Product not found.");
    }

    if (req.user?.role === "internal") {
      const reason = normalizeString(req.body?.reason) || "Requested permanent product deletion.";
      const product = productResult.rows[0];

      const { approval } = await createApprovalRequest({
        userId: req.user.id,
        actionType: "DELETE_PRODUCT",
        entityType: "product",
        entityId: id,
        reason,
        payload: {
          source: "product_delete_endpoint",
          product_name: product.name,
        },
      });

      console.log(
        `[AUDIT] approval_requested requester=${req.user.id} action=DELETE_PRODUCT entity=product:${id} approval=${approval.id}`
      );

      return sendSuccess(
        res,
        202,
        { approval },
        "Approval request created. Admin approval required to delete product."
      );
    }

    const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id, name", [id]);

    invalidateTag("products");
    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("products:");
    invalidateByPrefix("product:");
    await logActivity({
      userId: req.user?.id,
      action: "PRODUCT_DELETE",
      entityType: "product",
      entityId: id,
      metadata: { name: result.rows[0]?.name },
    });

    return sendSuccess(res, 200, { product: result.rows[0] }, "Product deleted successfully.");
  } catch (error) {
    next(error);
  }
};

const archiveProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE products
       SET is_archived = NOT is_archived
       WHERE id = $1
       RETURNING id, name, is_archived`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "Product not found.");
    }

    invalidateTag("products");
    invalidateTag("search");
    invalidateByPrefix("products:");
    invalidateByPrefix("product:");
    await logActivity({
      userId: req.user?.id,
      action: "PRODUCT_ARCHIVE_TOGGLE",
      entityType: "product",
      entityId: id,
      metadata: { is_archived: result.rows[0]?.is_archived },
    });

    return sendSuccess(res, 200, { product: result.rows[0] }, "Product archive status updated.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  archiveProduct,
};
