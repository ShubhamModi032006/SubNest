const Stripe = require("stripe");
const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { logActivity } = require("../services/activityLogService");
const { createNotification } = require("../services/notificationService");
const { invalidateTag, invalidateByPrefix } = require("../services/cacheService");

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const DEFAULT_CURRENCY = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();

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

const toCents = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100);

const isCustomerRole = (role) => String(role || "").toLowerCase() === "user";

const ensureInvoiceAccess = (invoice, user) => {
  if (!isCustomerRole(user?.role)) {
    return;
  }

  const ownerId = String(invoice.customer_id || invoice.customer_user_id || "");
  if (ownerId !== String(user.id || "")) {
    const error = new Error("You can only access your own invoice payment session.");
    error.statusCode = 403;
    throw error;
  }
};

const ensureStripeConfigured = () => {
  if (!stripe) {
    const error = new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
    error.statusCode = 500;
    throw error;
  }
};

const buildLineItems = (invoiceItems) => {
  if (!Array.isArray(invoiceItems) || invoiceItems.length === 0) {
    const error = new Error("Cannot create payment session for invoice without items.");
    error.statusCode = 400;
    throw error;
  }

  return invoiceItems.map((item) => ({
    quantity: Number(item.quantity),
    price_data: {
      currency: DEFAULT_CURRENCY,
      product_data: {
        name: item.description || item.product_name || "Invoice item",
      },
      unit_amount: toCents(item.unit_price),
    },
  }));
};

const createPaymentSession = async (req, res, next) => {
  try {
    ensureStripeConfigured();

    const invoiceId = String(req.body?.invoice_id || "").trim();
    if (!invoiceId) {
      return sendError(res, 400, "invoice_id is required.");
    }

    const result = await withTransaction(async (client) => {
      const invoiceResult = await client.query(
        `SELECT id, invoice_number, status, grand_total, paid_at, customer_id, customer_user_id
         FROM invoices
         WHERE id = $1
         FOR UPDATE`,
        [invoiceId]
      );

      if (invoiceResult.rows.length === 0) {
        const error = new Error("Invoice not found.");
        error.statusCode = 404;
        throw error;
      }

      const invoice = invoiceResult.rows[0];
      ensureInvoiceAccess(invoice, req.user);
      if (invoice.status !== "confirmed") {
        const error = new Error("Only confirmed invoices can be paid.");
        error.statusCode = 400;
        throw error;
      }

      if (invoice.paid_at || invoice.status === "paid") {
        const error = new Error("Invoice is already paid.");
        error.statusCode = 400;
        throw error;
      }

      const existingPaymentResult = await client.query(
        `SELECT id, stripe_session_id, status
         FROM payments
         WHERE invoice_id = $1
           AND status IN ('pending', 'success')
         ORDER BY created_at DESC
         LIMIT 1`,
        [invoiceId]
      );

      if (existingPaymentResult.rows.length > 0) {
        const error = new Error("Payment already initiated for this invoice.");
        error.statusCode = 409;
        throw error;
      }

      const invoiceItemsResult = await client.query(
        `SELECT ii.id, ii.description, ii.quantity, ii.unit_price, p.name AS product_name
         FROM invoice_items ii
         LEFT JOIN products p ON p.id = ii.product_id
         WHERE ii.invoice_id = $1
         ORDER BY ii.created_at ASC`,
        [invoiceId]
      );

      const lineItems = buildLineItems(invoiceItemsResult.rows);

      const successUrl = req.body?.success_url
        ? String(req.body.success_url)
        : `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoiceId}`;
      const cancelUrl = req.body?.cancel_url
        ? String(req.body.cancel_url)
        : `${FRONTEND_URL}/payment/cancel?invoice_id=${invoiceId}`;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoice.invoice_number,
        },
      });

      await client.query(
        `INSERT INTO payments (invoice_id, amount, status, payment_method, stripe_session_id)
         VALUES ($1, $2, 'pending', 'stripe', $3)`,
        [invoiceId, Number(invoice.grand_total), session.id]
      );

      await logActivity(
        {
          userId: invoice.customer_id || invoice.customer_user_id,
          action: "PAYMENT_SESSION_CREATE",
          entityType: "payment",
          entityId: session.id,
          metadata: { invoiceId, amount: Number(invoice.grand_total) },
        },
        client
      );

      return {
        id: session.id,
        url: session.url,
      };
    });

    return sendSuccess(
      res,
      201,
      { session: result },
      "Stripe checkout session created successfully."
    );
  } catch (error) {
    next(error);
  }
};

const markPaymentFailed = async (sessionId) => {
  return withTransaction(async (client) => {
    const paymentResult = await client.query(
      `SELECT p.id, p.status, p.invoice_id, i.customer_id, i.customer_user_id
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       WHERE p.stripe_session_id = $1
       FOR UPDATE`,
      [sessionId]
    );

    if (paymentResult.rows.length === 0) {
      return null;
    }

    const payment = paymentResult.rows[0];
    if (payment.status === "success") {
      return payment;
    }

    await client.query("UPDATE payments SET status = 'failed' WHERE id = $1", [payment.id]);
    await logActivity(
      {
        userId: payment.customer_id || payment.customer_user_id,
        action: "PAYMENT_FAILED",
        entityType: "payment",
        entityId: payment.id,
        metadata: { sessionId, invoiceId: payment.invoice_id },
      },
      client
    );
    await createNotification(
      {
        userId: payment.customer_id || payment.customer_user_id,
        type: "payment",
        message: "Payment failed. Please retry checkout.",
      },
      client
    );
    return payment;
  });
};

const settlePaymentSuccess = async (sessionId) => {
  return withTransaction(async (client) => {
    const paymentResult = await client.query(
      `SELECT p.id, p.invoice_id, p.status, i.subscription_id, i.customer_id, i.customer_user_id, i.invoice_number
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       WHERE p.stripe_session_id = $1
       FOR UPDATE`,
      [sessionId]
    );

    if (paymentResult.rows.length === 0) {
      return null;
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== "success") {
      await client.query("UPDATE payments SET status = 'success' WHERE id = $1", [payment.id]);
    }

    await client.query(
      `UPDATE invoices
       SET status = 'paid', paid_at = COALESCE(paid_at, NOW())
       WHERE id = $1
         AND status IN ('confirmed', 'paid')`,
      [payment.invoice_id]
    );

    if (payment.subscription_id) {
      await client.query(
        `UPDATE subscriptions
         SET status = 'active'
         WHERE id = $1`,
        [payment.subscription_id]
      );
    }

    await client.query(
      `UPDATE orders
       SET status = 'completed', updated_at = NOW()
       WHERE invoice_id = $1`,
      [payment.invoice_id]
    );

    await logActivity(
      {
        userId: payment.customer_id || payment.customer_user_id,
        action: "PAYMENT_SUCCESS",
        entityType: "payment",
        entityId: payment.id,
        metadata: {
          sessionId,
          invoiceId: payment.invoice_id,
          subscriptionId: payment.subscription_id,
        },
      },
      client
    );
    await createNotification(
      {
        userId: payment.customer_id || payment.customer_user_id,
        type: "payment",
        message: `Payment received for invoice ${payment.invoice_number || payment.invoice_id}.`,
      },
      client
    );

    return payment;
  });
};

const handleStripeWebhook = async (req, res, next) => {
  try {
    ensureStripeConfigured();

    if (!stripeWebhookSecret) {
      return sendError(res, 500, "Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET.");
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return sendError(res, 400, "Missing Stripe signature header.");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    } catch (error) {
      return sendError(res, 400, `Webhook signature verification failed: ${error.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await settlePaymentSuccess(session.id);
      invalidateTag("reports");
      invalidateTag("search");
      invalidateByPrefix("reports:");
    }

    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      await markPaymentFailed(session.id);
      invalidateTag("reports");
      invalidateTag("search");
      invalidateByPrefix("reports:");
    }

    return sendSuccess(res, 200, { received: true }, "Webhook processed.");
  } catch (error) {
    next(error);
  }
};

const completePaymentSession = async (req, res, next) => {
  try {
    const sessionId = String(req.params.id || "").trim();
    if (!sessionId) {
      return sendError(res, 400, "Payment session id is required.");
    }

    const payment = await settlePaymentSuccess(sessionId);
    if (!payment) {
      return sendError(res, 404, "Payment session not found.");
    }

    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("reports:");

    return sendSuccess(res, 200, { payment }, "Payment session completed.");
  } catch (error) {
    next(error);
  }
};

const failPaymentSession = async (req, res, next) => {
  try {
    const sessionId = String(req.params.id || "").trim();
    if (!sessionId) {
      return sendError(res, 400, "Payment session id is required.");
    }

    const payment = await markPaymentFailed(sessionId);
    if (!payment) {
      return sendError(res, 404, "Payment session not found.");
    }

    invalidateTag("reports");
    invalidateTag("search");
    invalidateByPrefix("reports:");

    return sendSuccess(res, 200, { payment }, "Payment session marked as failed.");
  } catch (error) {
    next(error);
  }
};

const getPaymentSession = async (req, res, next) => {
  try {
    const sessionId = String(req.params.id || "").trim();
    if (!sessionId) {
      return sendError(res, 400, "Payment session id is required.");
    }

    const result = await pool.query(
      `SELECT p.id AS payment_id, p.invoice_id, p.amount, p.status AS payment_status, p.payment_method,
              p.stripe_session_id, p.created_at AS payment_created_at,
              i.invoice_number, i.status AS invoice_status, i.grand_total, i.paid_at, i.customer_id, i.customer_user_id
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       WHERE p.stripe_session_id = $1 OR p.id::text = $1
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "Payment session not found.");
    }

    const row = result.rows[0];
    ensureInvoiceAccess(row, req.user);
    const createdUnix = Math.floor(new Date(row.payment_created_at).getTime() / 1000);

    return sendSuccess(
      res,
      200,
      {
        session: {
          id: row.stripe_session_id,
          payment_status: row.payment_status === "success" ? "paid" : row.payment_status,
          amount_total: toCents(row.amount),
          currency: DEFAULT_CURRENCY,
          created: createdUnix,
          metadata: {
            invoice_id: row.invoice_id,
          },
        },
        payment: {
          id: row.payment_id,
          invoice_id: row.invoice_id,
          amount: Number(row.amount),
          status: row.payment_status,
          payment_method: row.payment_method,
          stripe_session_id: row.stripe_session_id,
          created_at: row.payment_created_at,
        },
        invoice: {
          id: row.invoice_id,
          invoice_number: row.invoice_number,
          status: row.invoice_status,
          grand_total: Number(row.grand_total),
          paid_at: row.paid_at,
        },
      },
      "Payment session fetched successfully."
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentSession,
  getPaymentSession,
  handleStripeWebhook,
  completePaymentSession,
  failPaymentSession,
};
