const pool = require("../models/db");

const normalize = (value) => (value === undefined || value === null ? null : String(value).trim());

const logActivity = async ({ userId, action, entityType, entityId, metadata = {} }, client = null) => {
  if (!userId || !action || !entityType) {
    return null;
  }

  const executor = client || pool;
  const result = await executor.query(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, action, entity_type, entity_id, created_at`,
    [
      normalize(userId),
      normalize(action),
      normalize(entityType),
      normalize(entityId),
      metadata && typeof metadata === "object" ? metadata : {},
    ]
  );

  return result.rows[0] || null;
};

module.exports = {
  logActivity,
};
