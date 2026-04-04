const { Pool } = require("pg");
require("dotenv").config();

const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  throw new Error("DB_URL is not set in environment variables.");
}

const dbHost = new URL(dbUrl).hostname;
const isLocalDb = dbHost === "localhost" || dbHost === "127.0.0.1";
const useSsl =
  process.env.DB_SSL === "true" ||
  process.env.NODE_ENV === "production" ||
  !isLocalDb;

const pool = new Pool({
  connectionString: dbUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err);
  process.exit(-1);
});

module.exports = pool;
