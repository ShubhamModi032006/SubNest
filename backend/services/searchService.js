const pool = require("../models/db");

const globalSearch = async ({ query, page = 1, limit = 10 }) => {
  const q = String(query || "").trim();
  if (!q) {
    return {
      products: [],
      subscriptions: [],
      users: [],
      pagination: { page: 1, limit, total: 0, totalPages: 1 },
    };
  }

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const offset = (safePage - 1) * safeLimit;

  const like = `%${q}%`;

  const [productsResult, subscriptionsResult, usersResult] = await Promise.all([
    pool.query(
      `SELECT id, name, type, sales_price, is_archived
       FROM products
       WHERE name ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [like, safeLimit, offset]
    ),
    pool.query(
      `SELECT id, subscription_number, status, created_at
       FROM subscriptions
       WHERE subscription_number ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [like, safeLimit, offset]
    ),
    pool.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [like, safeLimit, offset]
    ),
  ]);

  const total = productsResult.rows.length + subscriptionsResult.rows.length + usersResult.rows.length;

  return {
    products: productsResult.rows,
    subscriptions: subscriptionsResult.rows,
    users: usersResult.rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(Math.max(total, 1) / safeLimit) || 1,
    },
  };
};

module.exports = {
  globalSearch,
};
