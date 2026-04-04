/**
 * scripts/createDb.js
 *
 * Run this ONCE before starting the server:
 *   node scripts/createDb.js
 *
 * It connects to the default "postgres" database, creates the target
 * database (e.g. "subnest") if it doesn't exist, then runs the schema.
 */

require("dotenv").config();
const { Client } = require("pg");

// ─── Parse the DB_URL to extract the database name ───────────────────────────
const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  console.error("❌ DB_URL is not set in your .env file.");
  process.exit(1);
}

// Extract the target database name from the connection string
const urlObj = new URL(dbUrl);
const targetDb = urlObj.pathname.replace("/", ""); // e.g. "subnest"
const dbHost = urlObj.hostname;
const isLocalDb = dbHost === "localhost" || dbHost === "127.0.0.1";
const useSsl =
  process.env.DB_SSL === "true" ||
  process.env.NODE_ENV === "production" ||
  !isLocalDb;

// Build the admin URL by swapping the database to "postgres"
const adminUrl = new URL(dbUrl);
adminUrl.pathname = "/postgres";

// ─── SQL: create tables ───────────────────────────────────────────────────────
const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
      CHECK (role IN ('admin', 'internal', 'user')),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const ALTER_USERS_TABLE = `
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address TEXT;
`;

const CREATE_PASSWORD_RESETS_TABLE = `
  CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_CONTACTS_TABLE = `
  CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_USERS_EMAIL_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

const CREATE_CONTACTS_USER_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
`;

const CREATE_PGCRYPTO_EXTENSION = `
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
`;

// ─── Main ─────────────────────────────────────────────────────────────────────
const run = async () => {
  // Step 1: Connect to "postgres" (admin) database to create target DB
  const adminClient = new Client({
    connectionString: adminUrl.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  try {
    await adminClient.connect();
    console.log(`🔌 Connected to PostgreSQL (admin)`);

    // Check if the database already exists
    const check = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    );

    if (check.rowCount === 0) {
      // Database does not exist — create it
      // Note: CREATE DATABASE cannot run inside a transaction, so we use
      // the raw query directly (identifiers can't be parameterised).
      await adminClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`✅ Database "${targetDb}" created successfully.`);
    } else {
      console.log(`ℹ️  Database "${targetDb}" already exists. Skipping creation.`);
    }
  } catch (err) {
    console.error("❌ Failed to create database:", err.message);
    await adminClient.end();
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // Step 2: Connect to the target database and create tables
  const appClient = new Client({
    connectionString: dbUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  try {
    await appClient.connect();
    console.log(`🔌 Connected to "${targetDb}"`);

    await appClient.query(CREATE_PGCRYPTO_EXTENSION);
    console.log("✅ Extension: pgcrypto — ready");

    await appClient.query(CREATE_USERS_TABLE);
    await appClient.query(ALTER_USERS_TABLE);
    console.log("✅ Table: users — ready");

    await appClient.query(CREATE_USERS_EMAIL_INDEX);
    console.log("✅ Index: users.email — ready");

    await appClient.query(CREATE_PASSWORD_RESETS_TABLE);
    console.log("✅ Table: password_resets — ready");

    await appClient.query(CREATE_CONTACTS_TABLE);
    console.log("✅ Table: contacts — ready");

    await appClient.query(CREATE_CONTACTS_USER_ID_INDEX);
    console.log("✅ Index: contacts.user_id — ready");

    console.log("\n🎉 Database setup complete! You can now run: npm run dev");
  } catch (err) {
    console.error("❌ Failed to create tables:", err.message);
    process.exit(1);
  } finally {
    await appClient.end();
  }
};

run();
