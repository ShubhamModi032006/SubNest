const pool = require("../models/db");

const ACTION_TYPES = [
  "DELETE_PRODUCT",
  "CANCEL_INVOICE",
  "CLOSE_SUBSCRIPTION",
  "MODIFY_PRICING",
];

const ENTITY_TYPES = [
  "subscription",
  "invoice",
  "product",
  "plan",
  "tax",
  "discount",
  "template",
];

const createApprovalRequest = async ({
  userId,
  actionType,
  entityType,
  entityId,
  reason,
  payload = {},
  client = null,
}) => {
  if (!ACTION_TYPES.includes(actionType)) {
    const error = new Error("Invalid action_type.");
    error.statusCode = 400;
    throw error;
  }

  if (!ENTITY_TYPES.includes(entityType)) {
    const error = new Error("Invalid entity_type.");
    error.statusCode = 400;
    throw error;
  }

  if (!entityId) {
    const error = new Error("entity_id is required.");
    error.statusCode = 400;
    throw error;
  }

  const db = client || pool;

  const existing = await db.query(
    `SELECT id, user_id, action_type, entity_type, entity_id, reason, status, created_at
     FROM approvals
     WHERE user_id = $1 AND action_type = $2 AND entity_id = $3 AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, actionType, entityId]
  );

  if (existing.rows.length > 0) {
    return { approval: existing.rows[0], deduped: true };
  }

  const result = await db.query(
    `INSERT INTO approvals (user_id, action_type, entity_type, entity_id, reason, status, payload)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6::jsonb)
     RETURNING id, user_id, action_type, entity_type, entity_id, reason, status, payload, created_at`,
    [userId, actionType, entityType, entityId, reason || null, JSON.stringify(payload || {})]
  );

  return { approval: result.rows[0], deduped: false };
};

module.exports = {
  ACTION_TYPES,
  ENTITY_TYPES,
  createApprovalRequest,
};
