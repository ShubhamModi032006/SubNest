const pool = require("./db");

const createTables = async () => {
  const createPgcryptoExtension = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'internal', 'user')),
      phone VARCHAR(50),
      address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const alterUsersTable = `
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS address TEXT;
  `;

  const createPasswordResetsTable = `
    CREATE TABLE IF NOT EXISTS password_resets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(512) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createContactsTable = `
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

  const createUsersEmailIndex = `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  const createContactsUserIdIndex = `
    CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
  `;

  try {
    await pool.query(createPgcryptoExtension);
    console.log("✅ Extension pgcrypto ready");

    await pool.query(createUsersTable);
    await pool.query(alterUsersTable);
    console.log("✅ Users table ready");

    await pool.query(createUsersEmailIndex);
    console.log("✅ Users email index ready");

    await pool.query(createPasswordResetsTable);
    console.log("✅ Password resets table ready");

    await pool.query(createContactsTable);
    console.log("✅ Contacts table ready");

    await pool.query(createContactsUserIdIndex);
    console.log("✅ Contacts user index ready");
  } catch (error) {
    console.error("❌ Error creating tables:", error.message);
    throw error;
  }
};

module.exports = { createTables };
