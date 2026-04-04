const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { createApprovalRequest } = require("../utils/approvalService");

const INVOICE_STATUSES = ["draft", "confirmed", "paid", "cancelled"];

const normalizeText = (value) => (value === undefined || value === null ? null : String(value).trim());
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

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

const hydrateInvoice = async (invoiceId) => {
  const invoiceResult = await pool.query(
    `SELECT i.id, i.invoice_number, i.subscription_id, i.customer_user_id, i.customer_contact_id, i.customer_type,
            i.invoice_date, i.due_date, i.status, i.subtotal, i.discount_total, i.tax_total, i.grand_total,
            i.sent_at, i.confirmed_at, i.paid_at, i.cancelled_at, i.created_at,
            u.id AS user_id, u.name AS user_name, u.email AS user_email,
            c.id AS contact_id, c.name AS contact_name, c.email AS contact_email,
            s.subscription_number
     FROM invoices i
     LEFT JOIN users u ON i.customer_user_id = u.id
     LEFT JOIN contacts c ON i.customer_contact_id = c.id
     LEFT JOIN subscriptions s ON i.subscription_id = s.id
     WHERE i.id = $1`,
    [invoiceId]
  );

  if (invoiceResult.rows.length === 0) {
    return null;
  }

  const itemResult = await pool.query(
    `SELECT ii.id, ii.product_id, ii.description, ii.quantity, ii.unit_price, ii.discount, ii.tax, ii.total,
            p.name AS product_name
     FROM invoice_items ii
     LEFT JOIN products p ON ii.product_id = p.id
     WHERE ii.invoice_id = $1
     ORDER BY ii.created_at ASC`,
    [invoiceId]
  );

  const row = invoiceResult.rows[0];
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    subscription_id: row.subscription_id,
    subscription_number: row.subscription_number,
    customer: row.customer_type === "user"
      ? { id: row.user_id, name: row.user_name, email: row.user_email, type: "user" }
      : { id: row.contact_id, name: row.contact_name, email: row.contact_email, type: "contact" },
    invoice_date: row.invoice_date,
    due_date: row.due_date,
    status: row.status,
    subtotal: Number(row.subtotal),
    discount_total: Number(row.discount_total),
    tax_total: Number(row.tax_total),
    grand_total: Number(row.grand_total),
    sent_at: row.sent_at,
    confirmed_at: row.confirmed_at,
    paid_at: row.paid_at,
    cancelled_at: row.cancelled_at,
    created_at: row.created_at,
    items: itemResult.rows.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name || "Unknown product",
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      discount: Number(item.discount),
      tax: Number(item.tax),
      total: Number(item.total),
    })),
  };
};

const buildTotals = (items) => {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0));
  const discount_total = roundMoney(items.reduce((sum, item) => sum + Number(item.discount), 0));
  const tax_total = roundMoney(items.reduce((sum, item) => sum + Number(item.tax), 0));
  const grand_total = roundMoney(items.reduce((sum, item) => sum + Number(item.total), 0));
  return { subtotal, discount_total, tax_total, grand_total };
};

const createInvoiceFromSubscriptionInternal = async (subscriptionId) => {
  return withTransaction(async (client) => {
    const existing = await client.query(
      "SELECT id FROM invoices WHERE subscription_id = $1 AND status <> 'cancelled' ORDER BY created_at DESC LIMIT 1",
      [subscriptionId]
    );
    if (existing.rows.length > 0) {
      const error = new Error("Invoice already exists for this subscription.");
      error.statusCode = 400;
      throw error;
    }

    const subscriptionResult = await client.query(
      `SELECT id, subscription_number, customer_user_id, customer_contact_id, customer_type
       FROM subscriptions
       WHERE id = $1`,
      [subscriptionId]
    );
    if (subscriptionResult.rows.length === 0) {
      const error = new Error("Subscription not found.");
      error.statusCode = 404;
      throw error;
    }

    const itemsResult = await client.query(
      `SELECT si.product_id, p.name AS product_name, si.quantity, si.unit_price, si.discount, si.tax, si.amount
       FROM subscription_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.subscription_id = $1
       ORDER BY si.created_at ASC`,
      [subscriptionId]
    );
    if (itemsResult.rows.length === 0) {
      const error = new Error("Cannot create invoice without subscription items.");
      error.statusCode = 400;
      throw error;
    }

    const items = itemsResult.rows.map((row) => ({
      product_id: row.product_id,
      description: `${row.product_name} line item`,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      discount: Number(row.discount),
      tax: Number(row.tax),
      total: Number(row.amount),
    }));

    const totals = buildTotals(items);

    let invoiceNumber = generateInvoiceNumber();
    for (let i = 0; i < 3; i += 1) {
      const duplicate = await client.query("SELECT id FROM invoices WHERE invoice_number = $1", [invoiceNumber]);
      if (duplicate.rows.length === 0) break;
      invoiceNumber = generateInvoiceNumber();
    }

    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const subscription = subscriptionResult.rows[0];

    const invoiceResult = await client.query(
      `INSERT INTO invoices (
         invoice_number, subscription_id, customer_user_id, customer_contact_id, customer_type,
         invoice_date, due_date, status, subtotal, discount_total, tax_total, grand_total
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10, $11)
       RETURNING id`,
      [
        invoiceNumber,
        subscription.id,
        subscription.customer_user_id,
        subscription.customer_contact_id,
        subscription.customer_type,
        invoiceDate,
        dueDate,
        totals.subtotal,
        totals.discount_total,
        totals.tax_total,
        totals.grand_total,
      ]
    );

    const invoiceId = invoiceResult.rows[0].id;
    const values = [];
    const placeholders = items.map((item, index) => {
      const base = index * 8;
      values.push(
        invoiceId,
        item.product_id,
        item.description,
        item.quantity,
        item.unit_price,
        item.discount,
        item.tax,
        item.total
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
    });

    await client.query(
      `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, discount, tax, total)
       VALUES ${placeholders.join(", ")}`,
      values
    );

    return invoiceId;
  });
};

const getInvoices = async (req, res, next) => {
  try {
    const status = normalizeText(req.query.status);
    const params = [];
    let whereClause = "";

    if (status) {
      if (!INVOICE_STATUSES.includes(status)) {
        return sendError(res, 400, "Invalid invoice status filter.");
      }
      params.push(status);
      whereClause = `WHERE i.status = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT i.id, i.invoice_number, i.invoice_date, i.due_date, i.status, i.grand_total, i.paid_at, i.customer_type,
              u.name AS user_name, c.name AS contact_name
       FROM invoices i
       LEFT JOIN users u ON i.customer_user_id = u.id
       LEFT JOIN contacts c ON i.customer_contact_id = c.id
       ${whereClause}
       ORDER BY i.created_at DESC`,
      params
    );

    const invoices = result.rows.map((row) => ({
      id: row.id,
      invoice_number: row.invoice_number,
      customer: row.customer_type === "user" ? row.user_name : row.contact_name,
      date: row.invoice_date,
      due_date: row.due_date,
      total_amount: Number(row.grand_total),
      status: row.status,
      payment_date: row.paid_at,
      payment_status: row.status === "paid" ? "paid" : "unpaid",
    }));

    return sendSuccess(res, 200, { invoices }, "Invoices fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await hydrateInvoice(req.params.id);
    if (!invoice) {
      return sendError(res, 404, "Invoice not found.");
    }

    return sendSuccess(res, 200, { invoice }, "Invoice fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (invoiceId, nextStatus, allowedCurrentStatuses, timestampColumn = null) => {
  return withTransaction(async (client) => {
    const result = await client.query("SELECT id, status FROM invoices WHERE id = $1", [invoiceId]);
    if (result.rows.length === 0) {
      const error = new Error("Invoice not found.");
      error.statusCode = 404;
      throw error;
    }

    if (!allowedCurrentStatuses.includes(result.rows[0].status)) {
      const error = new Error(`Cannot move invoice from ${result.rows[0].status} to ${nextStatus}.`);
      error.statusCode = 400;
      throw error;
    }

    if (timestampColumn) {
      await client.query(`UPDATE invoices SET status = $1, ${timestampColumn} = NOW() WHERE id = $2`, [nextStatus, invoiceId]);
    } else {
      await client.query("UPDATE invoices SET status = $1 WHERE id = $2", [nextStatus, invoiceId]);
    }
  });
};

const confirmInvoice = async (req, res, next) => {
  try {
    await updateStatus(req.params.id, "confirmed", ["draft"], "confirmed_at");
    return sendSuccess(res, 200, {}, "Invoice confirmed successfully.");
  } catch (error) {
    next(error);
  }
};

const sendInvoice = async (req, res, next) => {
  try {
    await updateStatus(req.params.id, "confirmed", ["draft", "confirmed"], "sent_at");
    return sendSuccess(res, 200, {}, "Invoice sent successfully.");
  } catch (error) {
    next(error);
  }
};

const cancelInvoice = async (req, res, next) => {
  try {
    const invoiceResult = await pool.query("SELECT id, status FROM invoices WHERE id = $1", [req.params.id]);
    if (invoiceResult.rows.length === 0) {
      return sendError(res, 404, "Invoice not found.");
    }

    const currentStatus = invoiceResult.rows[0].status;
    const isInternal = req.user.role === "internal";

    if (isInternal && currentStatus === "confirmed") {
      const reason = normalizeText(req.body?.reason) || "Requested cancel for confirmed invoice.";
      const { approval } = await createApprovalRequest({
        userId: req.user.id,
        actionType: "CANCEL_INVOICE",
        entityType: "invoice",
        entityId: req.params.id,
        reason,
      });

      console.log(
        `[AUDIT] approval_requested requester=${req.user.id} action=CANCEL_INVOICE entity=invoice:${req.params.id} approval=${approval.id}`
      );

      return sendSuccess(
        res,
        202,
        { approval },
        "Approval request created. Admin approval required to cancel confirmed invoice."
      );
    }

    await updateStatus(req.params.id, "cancelled", ["draft", "confirmed"], "cancelled_at");
    return sendSuccess(res, 200, {}, "Invoice cancelled successfully.");
  } catch (error) {
    next(error);
  }
};

const createInvoiceFromSubscription = async (req, res, next) => {
  try {
    const invoiceId = await createInvoiceFromSubscriptionInternal(req.params.id);
    const invoice = await hydrateInvoice(invoiceId);
    return sendSuccess(res, 201, { invoice }, "Invoice generated from subscription successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  confirmInvoice,
  sendInvoice,
  cancelInvoice,
  createInvoiceFromSubscription,
  createInvoiceFromSubscriptionInternal,
};
