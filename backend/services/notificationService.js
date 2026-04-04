const pool = require("../models/db");

const normalize = (value) => (value === undefined || value === null ? null : String(value).trim());

const createNotification = async ({ userId, message, type = "info" }, client = null) => {
  if (!userId || !message) return null;
  const executor = client || pool;
  const result = await executor.query(
    `INSERT INTO notifications (user_id, message, type, read_status)
     VALUES ($1, $2, $3, FALSE)
     RETURNING id, user_id, message, type, read_status, created_at`,
    [normalize(userId), normalize(message), normalize(type) || "info"]
  );
  return result.rows[0] || null;
};

const createNotificationForRoles = async ({ roles = [], message, type = "info" }, client = null) => {
  if (!Array.isArray(roles) || roles.length === 0 || !message) return [];
  const executor = client || pool;
  const roleResult = await executor.query(
    `SELECT id FROM users WHERE role = ANY($1::text[])`,
    [roles.map((role) => String(role).toLowerCase())]
  );

  const notifications = [];
  for (const row of roleResult.rows) {
    const created = await createNotification({ userId: row.id, message, type }, executor);
    if (created) notifications.push(created);
  }
  return notifications;
};

const listNotifications = async ({ userId, page = 1, limit = 20 }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const [itemsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, user_id, message, type, read_status, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, safeLimit, offset]
    ),
    pool.query(`SELECT COUNT(*)::INT AS total FROM notifications WHERE user_id = $1`, [userId]),
  ]);

  const total = countResult.rows[0]?.total || 0;
  return {
    notifications: itemsResult.rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const markNotificationRead = async ({ userId, notificationId }) => {
  const result = await pool.query(
    `UPDATE notifications
     SET read_status = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, message, type, read_status, created_at`,
    [notificationId, userId]
  );
  return result.rows[0] || null;
};

module.exports = {
  createNotification,
  createNotificationForRoles,
  listNotifications,
  markNotificationRead,
};
