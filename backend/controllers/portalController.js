const crypto = require("crypto");
const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { generateSubscriptionNumber } = require("../utils/subscriptionPricing");
const { isDiscountEligible } = require("../utils/discountEligibility");
const {
  getProducts,
  getProductById,
  searchProducts,
  calculatePortalPricing,
} = require("../utils/portalCatalog");
const { cached, invalidateTag, invalidateByPrefix } = require("../services/cacheService");
const { logActivity } = require("../services/activityLogService");
const { createNotification } = require("../services/notificationService");
const { createInvoiceFromSubscriptionInternal } = require("./invoiceController");

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

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

const generateInvoiceNumber = () => {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `INV-${stamp}-${random}`;
};

const getActiveTax = async (client) => {
  const result = await client.query(
    `SELECT id, name, type, value
     FROM taxes
     ORDER BY created_at DESC
     LIMIT 1`
  );

  return result.rows[0] || null;
};

const getDiscount = async (client, discountCode) => {
  const code = normalizeValue(discountCode);
  if (!code) {
    return null;
  }

  const result = await client.query(
    `SELECT id, name, type, value, min_purchase, min_quantity, start_date, end_date, usage_limit, apply_to_subscription
     FROM discounts
     ORDER BY created_at DESC`
  );

  const matching = result.rows.find((row) => {
    const normalizedName = normalizeValue(row.name).replace(/\s+/g, "");
    return normalizedName === code || normalizedName.includes(code) || code.includes(normalizedName);
  });

  if (matching) {
    return matching;
  }

  if (code === "welcome10") {
    return {
      id: null,
      name: "Welcome 10",
      type: "percentage",
      value: 10,
      min_purchase: 0,
      min_quantity: 0,
      start_date: null,
      end_date: null,
      usage_limit: null,
      apply_to_subscription: true,
      synthetic: true,
    };
  }

  return null;
};

const buildDiscountAmount = ({ discount, subtotal, quantity }) => {
  if (!discount) {
    return { discountAmount: 0, discountApplied: null };
  }

  if (!isDiscountEligible({ subtotal, quantity, currentDate: new Date(), discount })) {
    return { discountAmount: 0, discountApplied: null };
  }

  const amount = discount.type === "percentage" ? (subtotal * Number(discount.value)) / 100 : Number(discount.value);
  return {
    discountAmount: roundMoney(Math.min(amount, subtotal)),
    discountApplied: discount,
  };
};

const normalizeOrderItems = async (client, items) => {
  const tax = await getActiveTax(client);
  const taxRate = tax && normalizeValue(tax.type) === "percentage" ? Number(tax.value || 0) : 0;
  const productIds = [...new Set(items.map((item) => String(item.productId || item.product_id || "").trim()).filter(Boolean))];
  const products = getProducts().filter((product) => productIds.includes(product.id));

  if (products.length !== productIds.length) {
    const error = new Error("One or more products do not exist.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedItems = items.map((item) => {
    const product = getProductById(item.productId || item.product_id);
    const pricing = calculatePortalPricing(product, {
      variantId: item.variantId || item.variant_id,
      planId: item.planId || item.plan_id,
      quantity: item.quantity,
    });

    const lineTax = roundMoney((pricing.subtotal * taxRate) / 100);

    return {
      productId: product.id,
      productName: product.name,
      variantId: pricing.variant?.id || null,
      variantLabel: pricing.variant?.label || "Standard",
      planId: pricing.plan?.id || null,
      planLabel: pricing.plan?.label || "One-time",
      quantity: pricing.quantity,
      unitPrice: roundMoney(pricing.unitPrice),
      subtotal: roundMoney(pricing.subtotal),
      taxRate,
      taxAmount: lineTax,
      total: roundMoney(pricing.subtotal + lineTax),
      category: product.category,
    };
  });

  return { normalizedItems, tax };
};

const canonicalizeItems = (items) =>
  items
    .map((item) => ({
      productId: String(item.productId || item.product_id || "").trim(),
      variantId: String(item.variantId || item.variant_id || "").trim(),
      planId: String(item.planId || item.plan_id || "").trim(),
      quantity: Math.max(1, Number(item.quantity || 1)),
    }))
    .sort((left, right) => {
      const leftKey = [left.productId, left.variantId, left.planId, left.quantity].join("::");
      const rightKey = [right.productId, right.variantId, right.planId, right.quantity].join("::");
      return leftKey.localeCompare(rightKey);
    });

const buildCartHash = (userId, items, discountCode) => {
  const payload = JSON.stringify({ userId, items: canonicalizeItems(items), discountCode: normalizeValue(discountCode) });
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const hydrateOrder = async (client, orderId, userId = null) => {
  const params = [orderId];
  let whereClause = "o.id = $1";

  if (userId) {
    params.push(userId);
    whereClause += " AND o.user_id = $2";
  }

  const orderResult = await client.query(
    `SELECT o.id, o.user_id, o.total_amount, o.status, o.subscription_id, o.invoice_id, o.cart_hash, o.created_at, o.updated_at,
            u.name AS user_name, u.email AS user_email
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     WHERE ${whereClause}`,
    params
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  const order = orderResult.rows[0];
  const itemsResult = await client.query(
    `SELECT id, product_id, variant_id, plan_id, quantity, price, line_total
     FROM order_items
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [order.id]
  );

  const subscriptionResult = await client.query(
    `SELECT id, subscription_number, status, customer_id, customer_user_id, plan_id, start_date, expiration_date, payment_terms, created_at
     FROM subscriptions
     WHERE id = $1`,
    [order.subscription_id]
  );

  const invoiceResult = await client.query(
    `SELECT id, invoice_number, status, customer_id, customer_user_id, subscription_id, order_id, invoice_date, due_date, subtotal, discount_total, tax_total, grand_total, paid_at, created_at
     FROM invoices
     WHERE id = $1`,
    [order.invoice_id]
  );

  return {
    id: order.id,
    orderNumber: `ORD-${String(order.id).slice(0, 8).toUpperCase()}`,
    userId: order.user_id,
    customerName: order.user_name,
    customerEmail: order.user_email,
    totalAmount: Number(order.total_amount),
    status: order.status,
    subscriptionId: order.subscription_id,
    invoiceId: order.invoice_id,
    cartHash: order.cart_hash,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: itemsResult.rows.map((item) => {
      const product = getProductById(item.product_id);
      const variant = product?.variants?.find((entry) => entry.id === item.variant_id) || null;
      const plan = product?.plans?.find((entry) => entry.id === item.plan_id) || null;
      return {
        id: item.id,
        productId: item.product_id,
        productName: product?.name || item.product_id,
        category: product?.category || "General",
        variantId: item.variant_id,
        variantLabel: variant?.label || "Standard",
        planId: item.plan_id,
        planLabel: plan?.label || "One-time",
        quantity: Number(item.quantity),
        unitPrice: Number(item.price),
        total: Number(item.line_total || item.price) || Number(item.price),
      };
    }),
    subscription: subscriptionResult.rows[0]
      ? {
          id: subscriptionResult.rows[0].id,
          subscriptionNumber: subscriptionResult.rows[0].subscription_number,
          status: subscriptionResult.rows[0].status,
          customerId: subscriptionResult.rows[0].customer_id || subscriptionResult.rows[0].customer_user_id || null,
          customerUserId: subscriptionResult.rows[0].customer_user_id || null,
          planId: subscriptionResult.rows[0].plan_id || null,
          startDate: subscriptionResult.rows[0].start_date,
          expirationDate: subscriptionResult.rows[0].expiration_date,
          paymentTerms: subscriptionResult.rows[0].payment_terms,
          createdAt: subscriptionResult.rows[0].created_at,
        }
      : null,
    invoice: invoiceResult.rows[0]
      ? {
          id: invoiceResult.rows[0].id,
          invoiceNumber: invoiceResult.rows[0].invoice_number,
          status: invoiceResult.rows[0].status,
          customerId: invoiceResult.rows[0].customer_id || invoiceResult.rows[0].customer_user_id || null,
          customerUserId: invoiceResult.rows[0].customer_user_id || null,
          subscriptionId: invoiceResult.rows[0].subscription_id,
          orderId: invoiceResult.rows[0].order_id,
          invoiceDate: invoiceResult.rows[0].invoice_date,
          dueDate: invoiceResult.rows[0].due_date,
          subtotal: Number(invoiceResult.rows[0].subtotal),
          discountTotal: Number(invoiceResult.rows[0].discount_total),
          taxTotal: Number(invoiceResult.rows[0].tax_total),
          grandTotal: Number(invoiceResult.rows[0].grand_total),
          paidAt: invoiceResult.rows[0].paid_at,
          createdAt: invoiceResult.rows[0].created_at,
        }
      : null,
  };
};

const getPortalProducts = async (req, res) => {
  const search = req.query.search || "";
  const category = req.query.category || "all";
  const minPrice = Number(req.query.minPrice || 0);
  const maxPrice = Number(req.query.maxPrice || Number.POSITIVE_INFINITY);
  const id = req.query.id;

  if (id) {
    const product = getProductById(id);
    if (!product) {
      return sendError(res, 404, "Product not found.");
    }

    return sendSuccess(res, 200, { product }, "Product fetched successfully.");
  }

  const products = searchProducts({ search, category, minPrice, maxPrice });
  return sendSuccess(res, 200, { products }, "Products fetched successfully.");
};

const getPortalSubscriptions = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.subscription_number, s.plan_id, s.start_date, s.expiration_date, s.payment_terms, s.status, s.created_at, s.is_public,
              p.name AS plan_name,
              COALESCE(SUM(si.amount), 0)::NUMERIC AS amount_total
       FROM subscriptions s
       LEFT JOIN plans p ON p.id = s.plan_id
       LEFT JOIN subscription_items si ON si.subscription_id = s.id
       WHERE s.is_public = TRUE
       GROUP BY s.id, p.name
       ORDER BY s.created_at DESC`
    );

    const subscriptions = result.rows.map((row) => ({
      id: row.id,
      subscriptionNumber: row.subscription_number,
      planId: row.plan_id,
      planName: row.plan_name,
      isPublic: Boolean(row.is_public),
      startDate: row.start_date,
      expirationDate: row.expiration_date,
      paymentTerms: row.payment_terms,
      status: row.status,
      amountTotal: Number(row.amount_total || 0),
      createdAt: row.created_at,
    }));

    return sendSuccess(res, 200, { subscriptions }, "Subscription catalog fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const purchasePortalSubscription = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || "").trim();
    const sourceSubscriptionId = String(req.params.id || "").trim();

    if (!userId) {
      return sendError(res, 401, "Authentication required.");
    }

    if (!sourceSubscriptionId) {
      return sendError(res, 400, "Subscription id is required.");
    }

    const result = await withTransaction(async (client) => {
      const sourceResult = await client.query(
        `SELECT id, plan_id, expiration_date, payment_terms, is_public
         FROM subscriptions
         WHERE id = $1
         FOR UPDATE`,
        [sourceSubscriptionId]
      );

      if (sourceResult.rows.length === 0) {
        const error = new Error("Subscription offering not found.");
        error.statusCode = 404;
        throw error;
      }

      const source = sourceResult.rows[0];
      if (!source.is_public) {
        const error = new Error("This subscription is not available for purchase.");
        error.statusCode = 400;
        throw error;
      }

      const sourceItemsResult = await client.query(
        `SELECT product_id, variant_id, quantity, unit_price, discount, tax, amount
         FROM subscription_items
         WHERE subscription_id = $1
         ORDER BY created_at ASC`,
        [sourceSubscriptionId]
      );

      if (sourceItemsResult.rows.length === 0) {
        const error = new Error("Subscription offering has no items.");
        error.statusCode = 400;
        throw error;
      }

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

      const insertedSubscription = await client.query(
        `INSERT INTO subscriptions (
          subscription_number, is_public, created_by,
          customer_id, customer_user_id, customer_contact_id, customer_type,
          plan_id, start_date, expiration_date, payment_terms, status
        )
        VALUES ($1, FALSE, $2, $3, $4, NULL, 'user', $5, CURRENT_DATE, $6, $7, 'confirmed')
        RETURNING id`,
        [
          subscriptionNumber,
          req.user?.id || null,
          userId,
          userId,
          source.plan_id,
          source.expiration_date || null,
          source.payment_terms || null,
        ]
      );

      const newSubscriptionId = insertedSubscription.rows[0].id;

      const itemValues = [];
      const itemPlaceholders = sourceItemsResult.rows.map((item, index) => {
        const baseIndex = index * 8;
        itemValues.push(
          newSubscriptionId,
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
         VALUES ${itemPlaceholders.join(", ")}`,
        itemValues
      );

      return {
        subscriptionId: newSubscriptionId,
      };
    });

    const invoiceId = await createInvoiceFromSubscriptionInternal(result.subscriptionId);
    await pool.query(`UPDATE invoices SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1`, [invoiceId]);

    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("reports:");

    await createNotification({
      userId,
      type: "subscription",
      message: `Subscription purchased successfully. Invoice ${invoiceId} is ready.`,
    });

    return sendSuccess(
      res,
      201,
      { subscription_id: result.subscriptionId, invoice_id: invoiceId },
      "Subscription purchased successfully."
    );
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || "").trim();
    if (!userId) {
      return sendError(res, 401, "Authentication required.");
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      return sendError(res, 400, "At least one cart item is required.");
    }

    const customer = {
      name: String(req.body?.customer?.name || req.body?.customerName || req.user?.name || "").trim(),
      email: String(req.body?.customer?.email || req.body?.customerEmail || req.user?.email || "").trim(),
      address: String(req.body?.customer?.address || req.body?.customerAddress || "").trim(),
    };

    if (!customer.name || !customer.email) {
      return sendError(res, 400, "Customer name and email are required.");
    }

    const discountCode = String(req.body?.discountCode || req.body?.discount_code || "").trim();
    const clientTotals = {
      subtotal: Number(req.body?.subtotal || 0),
      tax: Number(req.body?.tax || 0),
      discountTotal: Number(req.body?.discountTotal || req.body?.discount_total || 0),
      total: Number(req.body?.total || req.body?.totalAmount || 0),
    };

    const cartHash = buildCartHash(userId, items, discountCode);

    const result = await withTransaction(async (client) => {
      const existingOrder = await client.query(
        `SELECT id FROM orders WHERE user_id = $1 AND cart_hash = $2 AND status IN ('pending', 'confirmed') ORDER BY created_at DESC LIMIT 1`,
        [userId, cartHash]
      );

      if (existingOrder.rows.length > 0) {
        const order = await hydrateOrder(client, existingOrder.rows[0].id, userId);
        return { order, duplicate: true };
      }

      // Separate product and subscription items
      const productItems = items.filter(item => !item.itemType || item.itemType !== "subscription" && !item.subscriptionId);
      const subscriptionItems = items.filter(item => item.itemType === "subscription" || item.subscriptionId);

      let normalizedItems = [];
      let subtotal = 0;
      let taxTotal = 0;
      let quantity = 0;

      // Process product items if any
      if (productItems && productItems.length > 0) {
        const normResult = await normalizeOrderItems(client, productItems);
        normalizedItems = normResult?.normalizedItems || [];
        subtotal = roundMoney(normalizedItems.reduce((sum, item) => sum + (Number(item?.subtotal) || 0), 0));
        taxTotal = roundMoney(normalizedItems.reduce((sum, item) => sum + (Number(item?.taxAmount) || 0), 0));
        quantity = normalizedItems.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0);
      }

      // Process subscription items - they already have price calculated
      if (subscriptionItems && subscriptionItems.length > 0) {
        subscriptionItems.forEach(item => {
          const unitPrice = Number(item?.unitPrice || 0);
          const itemQty = Math.max(1, Number(item?.quantity || 1));
          subtotal += unitPrice * itemQty;
          quantity += itemQty;
        });
      }

      subtotal = roundMoney(Math.max(0, subtotal));

      const discount = await getDiscount(client, discountCode);
      const { discountAmount, discountApplied } = buildDiscountAmount({ discount, subtotal, quantity });
      const totalAmount = roundMoney(Math.max(0, subtotal + taxTotal - discountAmount));

      if (clientTotals.total > 0 && Math.abs(roundMoney(clientTotals.total) - totalAmount) > 0.01) {
        const error = new Error("Cart pricing mismatch. Please refresh and try again.");
        error.statusCode = 400;
        throw error;
      }

      if (clientTotals.subtotal > 0 && Math.abs(roundMoney(clientTotals.subtotal) - subtotal) > 0.01) {
        const error = new Error("Cart subtotal mismatch. Please refresh and try again.");
        error.statusCode = 400;
        throw error;
      }

      if (clientTotals.tax > 0 && Math.abs(roundMoney(clientTotals.tax) - taxTotal) > 0.01) {
        const error = new Error("Cart tax mismatch. Please refresh and try again.");
        error.statusCode = 400;
        throw error;
      }

      const orderResult = await client.query(
        `INSERT INTO orders (user_id, customer_id, total_amount, status, cart_hash)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING id, user_id, total_amount, status, cart_hash, created_at, updated_at`,
        [userId, userId, totalAmount, cartHash]
      );

      const orderId = orderResult.rows[0].id;

      const orderItemValues = [];
      const orderItemPlaceholders = normalizedItems.map((item, index) => {
        const baseIndex = index * 7;
        orderItemValues.push(orderId, item.productId, item.variantId, item.planId, item.quantity, item.unitPrice, item.total);
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`;
      });

      if (orderItemPlaceholders.length > 0) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, variant_id, plan_id, quantity, price, line_total)
           VALUES ${orderItemPlaceholders.join(", ")}`,
          orderItemValues
        );
      }

      const defaultPlanResult = await client.query(
        `SELECT id
         FROM plans
         ORDER BY created_at ASC
         LIMIT 1`
      );

      if (defaultPlanResult.rows.length === 0) {
        const error = new Error("At least one plan is required before checkout.");
        error.statusCode = 400;
        throw error;
      }

      const primaryPlanId = defaultPlanResult.rows[0].id;
      const subscriptionNumber = generateSubscriptionNumber();
      const subscriptionInsert = await client.query(
        `INSERT INTO subscriptions (
           subscription_number, customer_user_id, customer_id, customer_type, plan_id,
           start_date, expiration_date, payment_terms, status, order_id
         )
         VALUES ($1, $2, $3, 'user', $4, CURRENT_DATE, NULL, $5, 'confirmed', $6)
         RETURNING id, subscription_number, status, created_at`,
        [
          subscriptionNumber,
          userId,
          userId,
          primaryPlanId,
          "Due on receipt",
          orderId,
        ]
      );

      const subscriptionId = subscriptionInsert.rows[0].id;

      let invoiceNumber = generateInvoiceNumber();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const duplicateInvoice = await client.query("SELECT id FROM invoices WHERE invoice_number = $1", [invoiceNumber]);
        if (duplicateInvoice.rows.length === 0) {
          break;
        }
        invoiceNumber = generateInvoiceNumber();
      }

      const invoiceInsert = await client.query(
        `INSERT INTO invoices (
           invoice_number, subscription_id, order_id, customer_user_id, customer_id, customer_type,
           invoice_date, due_date, status, subtotal, discount_total, tax_total, grand_total
         )
         VALUES ($1, $2, $3, $4, $5, 'user', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'confirmed', $6, $7, $8, $9)
         RETURNING id, invoice_number, status, created_at`,
        [invoiceNumber, subscriptionId, orderId, userId, userId, subtotal, discountAmount, taxTotal, totalAmount]
      );

      const invoiceId = invoiceInsert.rows[0].id;

      const invoiceItemValues = [];
      const invoiceItemPlaceholders = [];
      let itemIndex = 0;

      // Add product invoice items
      normalizedItems.forEach((item) => {
        const baseIndex = itemIndex * 8;
        invoiceItemValues.push(
          invoiceId,
          null,
          `${item.productName} - ${item.variantLabel}${item.planLabel ? ` / ${item.planLabel}` : ""}`,
          item.quantity,
          item.unitPrice,
          0,
          item.taxAmount,
          item.total
        );
        invoiceItemPlaceholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`);
        itemIndex += 1;
      });

      // Add subscription invoice items
      subscriptionItems.forEach((item) => {
        const baseIndex = itemIndex * 8;
        invoiceItemValues.push(
          invoiceId,
          null,
          item.subscriptionNumber || item.planName || "Subscription",
          item.quantity,
          item.unitPrice,
          0,
          0,
          Number(item.unitPrice || 0) * Number(item.quantity || 1)
        );
        invoiceItemPlaceholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`);
        itemIndex += 1;
      });

      if (invoiceItemPlaceholders.length > 0) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, discount, tax, total)
           VALUES ${invoiceItemPlaceholders.join(", ")}`,
          invoiceItemValues
        );
      }

      await client.query(
        `UPDATE orders
         SET subscription_id = $1, invoice_id = $2, total_amount = $3, status = 'confirmed', updated_at = NOW()
         WHERE id = $4`,
        [subscriptionId, invoiceId, totalAmount, orderId]
      );

      const hydratedOrder = await hydrateOrder(client, orderId, userId);

      return {
        order: hydratedOrder,
        subscription: subscriptionInsert.rows[0],
        invoice: invoiceInsert.rows[0],
        discountApplied,
        duplicate: false,
      };
    });

    if (result.duplicate) {
      return sendSuccess(res, 200, { order: result.order }, "Duplicate order prevented. Existing order returned.");
    }

    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("reports:");
    await logActivity({
      userId,
      action: "ORDER_CREATE",
      entityType: "order",
      entityId: result.order?.id,
      metadata: {
        invoiceId: result.invoice?.id,
        subscriptionId: result.subscription?.id,
        totalAmount: result.order?.totalAmount,
      },
    });
    await createNotification({
      userId,
      type: "order",
      message: `Order ${result.order?.orderNumber || ""} created successfully.`,
    });

    return sendSuccess(
      res,
      201,
      {
        order: result.order,
        subscription: result.subscription,
        invoice: result.invoice,
      },
      "Order created successfully."
    );
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || "").trim();
    const result = await pool.query(
      `SELECT o.id, o.user_id, o.total_amount, o.status, o.subscription_id, o.invoice_id, o.cart_hash, o.created_at, o.updated_at,
              u.name AS user_name, u.email AS user_email
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );

    const orders = result.rows.map((row) => ({
      id: row.id,
      orderNumber: `ORD-${String(row.id).slice(0, 8).toUpperCase()}`,
      userId: row.user_id,
      customerName: row.user_name,
      customerEmail: row.user_email,
      totalAmount: Number(row.total_amount),
      status: row.status,
      subscriptionId: row.subscription_id,
      invoiceId: row.invoice_id,
      cartHash: row.cart_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return sendSuccess(res, 200, { orders }, "Orders fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const getMyOrderById = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || "").trim();
    const client = await pool.connect();
    try {
      const order = await hydrateOrder(client, req.params.id, userId);
      if (!order) {
        return sendError(res, 404, "Order not found.");
      }

      return sendSuccess(res, 200, { order, subscription: order.subscription, invoice: order.invoice }, "Order fetched successfully.");
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

const getMySubscriptions = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || "").trim();
    const result = await pool.query(
      `SELECT s.id, s.subscription_number, s.customer_type, s.customer_id, s.customer_user_id, s.customer_contact_id,
              s.plan_id, s.start_date, s.expiration_date, s.payment_terms, s.status, s.created_at,
              p.name AS plan_name,
              COALESCE(SUM(si.amount), 0)::NUMERIC AS amount_total
       FROM subscriptions s
       LEFT JOIN plans p ON p.id = s.plan_id
       LEFT JOIN subscription_items si ON si.subscription_id = s.id
       WHERE COALESCE(s.customer_user_id, s.customer_id) = $1
       GROUP BY s.id, p.name
       ORDER BY s.created_at DESC`,
      [userId]
    );

    const subscriptions = result.rows.map((row) => ({
      id: row.id,
      subscriptionNumber: row.subscription_number,
      customerType: row.customer_type,
      customerId: row.customer_id || row.customer_user_id || row.customer_contact_id,
      planId: row.plan_id,
      planName: row.plan_name,
      startDate: row.start_date,
      expirationDate: row.expiration_date,
      paymentTerms: row.payment_terms,
      status: row.status,
      amountTotal: Number(row.amount_total || 0),
      createdAt: row.created_at,
    }));

    return sendSuccess(res, 200, { subscriptions }, "Subscriptions fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const getMyInvoices = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || "").trim();
    const result = await pool.query(
      `SELECT i.id, i.invoice_number, i.order_id, i.subscription_id, i.customer_id, i.customer_user_id, i.customer_type,
              i.invoice_date, i.due_date, i.status, i.subtotal, i.discount_total, i.tax_total, i.grand_total, i.paid_at, i.created_at,
              o.status AS order_status
       FROM invoices i
       LEFT JOIN orders o ON o.id = i.order_id
       WHERE COALESCE(i.customer_id, i.customer_user_id) = $1
       ORDER BY i.created_at DESC`,
      [userId]
    );

    const invoices = result.rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      orderId: row.order_id,
      subscriptionId: row.subscription_id,
      customerId: row.customer_id || row.customer_user_id,
      customerType: row.customer_type,
      invoiceDate: row.invoice_date,
      dueDate: row.due_date,
      status: row.status,
      subtotal: Number(row.subtotal),
      discountTotal: Number(row.discount_total),
      taxTotal: Number(row.tax_total),
      grandTotal: Number(row.grand_total),
      paidAt: row.paid_at,
      orderStatus: row.order_status,
      createdAt: row.created_at,
      paymentStatus: row.status === "paid" ? "Paid" : "Unpaid",
    }));

    return sendSuccess(res, 200, { invoices }, "Invoices fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const getReportsSummary = async (req, res, next) => {
  try {
    const summary = await cached(
      "reports:summary",
      async () => {
        const [revenueResult, activeSubscriptionsResult, overdueInvoicesResult] = await Promise.all([
          pool.query(`SELECT COALESCE(SUM(grand_total), 0)::NUMERIC AS revenue FROM invoices WHERE status = 'paid'`),
          pool.query(`SELECT COUNT(*)::INT AS active_subscriptions FROM subscriptions WHERE status = 'active'`),
          pool.query(
            `SELECT COUNT(*)::INT AS overdue_invoices
             FROM invoices
             WHERE status IN ('draft', 'confirmed')
               AND due_date < CURRENT_DATE`
          ),
        ]);

        return {
          totalRevenue: Number(revenueResult.rows[0]?.revenue || 0),
          activeSubscriptions: Number(activeSubscriptionsResult.rows[0]?.active_subscriptions || 0),
          overdueInvoices: Number(overdueInvoicesResult.rows[0]?.overdue_invoices || 0),
        };
      },
      { ttlMs: 60_000, tags: ["reports"] }
    );

    return sendSuccess(
      res,
      200,
      {
        summary,
      },
      "Report summary fetched successfully."
    );
  } catch (error) {
    next(error);
  }
};

const getRevenueTrend = async (req, res, next) => {
  try {
    const months = await cached(
      "reports:revenue-trend",
      async () => {
        const result = await pool.query(
          `SELECT DATE_TRUNC('month', invoice_date)::date AS month, COALESCE(SUM(grand_total), 0)::NUMERIC AS revenue
           FROM invoices
           WHERE status = 'paid'
             AND invoice_date >= (CURRENT_DATE - INTERVAL '5 months')
           GROUP BY 1
           ORDER BY 1 ASC`
        );

        const trend = [];
        for (let index = 5; index >= 0; index -= 1) {
          const date = new Date();
          date.setMonth(date.getMonth() - index);
          trend.push({
            label: date.toLocaleString("en-US", { month: "short" }),
            value: 0,
          });
        }

        for (const row of result.rows) {
          const rowDate = new Date(row.month);
          const monthIndex = trend.findIndex((item) => item.label === rowDate.toLocaleString("en-US", { month: "short" }));
          if (monthIndex >= 0) {
            trend[monthIndex].value = Number(row.revenue || 0);
          }
        }

        return trend;
      },
      { ttlMs: 60_000, tags: ["reports"] }
    );

    return sendSuccess(res, 200, { trend: months }, "Revenue trend fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const getSubscriptionStats = async (req, res, next) => {
  try {
    const stats = await cached(
      "reports:subscription-stats",
      async () => {
        const result = await pool.query(
          `SELECT status, COUNT(*)::INT AS total
           FROM subscriptions
           GROUP BY status
           ORDER BY status ASC`
        );
        return result.rows.map((row) => ({
          status: row.status,
          total: Number(row.total),
        }));
      },
      { ttlMs: 60_000, tags: ["reports"] }
    );

    return sendSuccess(
      res,
      200,
      { stats },
      "Subscription stats fetched successfully."
    );
  } catch (error) {
    next(error);
  }
};

const previewOrderPricing = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || "").trim();
    if (!userId) {
      return sendError(res, 401, "Authentication required.");
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      return sendSuccess(
        res,
        200,
        {
          pricing: {
            subtotal: 0,
            tax: 0,
            discountTotal: 0,
            total: 0,
            quantity: 0,
            discount: null,
          },
        },
        "Order pricing preview calculated."
      );
    }

    const discountCode = String(req.body?.discountCode || req.body?.discount_code || "").trim();

    const pricing = await withTransaction(async (client) => {
      // Separate product and subscription items
      const productItems = items.filter(item => item.itemType !== "subscription" && !item.subscriptionId);
      const subscriptionItems = items.filter(item => item.itemType === "subscription" || item.subscriptionId);

      let normalizedItems = [];
      let subtotal = 0;
      let taxTotal = 0;
      let quantity = 0;

      // Process product items if any
      if (productItems.length > 0) {
        const result = await normalizeOrderItems(client, productItems);
        normalizedItems = result.normalizedItems;
        subtotal = roundMoney(normalizedItems.reduce((sum, item) => sum + item.subtotal, 0));
        taxTotal = roundMoney(normalizedItems.reduce((sum, item) => sum + item.taxAmount, 0));
        quantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
      }

      // Process subscription items - they already have price calculated
      subscriptionItems.forEach(item => {
        subtotal += Number(item.unitPrice || 0) * Number(item.quantity || 1);
        quantity += Number(item.quantity || 1);
      });

      subtotal = roundMoney(subtotal);

      const discount = await getDiscount(client, discountCode);
      const { discountAmount, discountApplied } = buildDiscountAmount({ discount, subtotal, quantity });
      const totalAmount = roundMoney(Math.max(0, subtotal + taxTotal - discountAmount));

      return {
        subtotal,
        tax: taxTotal,
        discountTotal: discountAmount,
        total: totalAmount,
        quantity,
        discount: discountApplied
          ? {
              id: discountApplied.id || null,
              name: discountApplied.name,
              type: discountApplied.type,
              value: Number(discountApplied.value || 0),
            }
          : null,
      };
    });

    return sendSuccess(res, 200, { pricing }, "Order pricing preview calculated.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPortalProducts,
  getPortalSubscriptions,
  purchasePortalSubscription,
  createOrder,
  previewOrderPricing,
  getMyOrders,
  getMyOrderById,
  getMySubscriptions,
  getMyInvoices,
  getReportsSummary,
  getRevenueTrend,
  getSubscriptionStats,
};