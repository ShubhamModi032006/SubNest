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

  const createTaxesTable = `
    CREATE TABLE IF NOT EXISTS taxes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
      value NUMERIC(12, 2) NOT NULL CHECK (value > 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const alterTaxesTable = `
    ALTER TABLE taxes
    ADD COLUMN IF NOT EXISTS type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS value NUMERIC(12, 2);
  `;

  const createPlansTable = `
    CREATE TABLE IF NOT EXISTS plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('daily', 'weekly', 'monthly', 'yearly')),
      price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
      min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity > 0),
      start_date DATE NOT NULL,
      end_date DATE,
      auto_close BOOLEAN NOT NULL DEFAULT FALSE,
      closable BOOLEAN NOT NULL DEFAULT TRUE,
      renewable BOOLEAN NOT NULL DEFAULT TRUE,
      pausable BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const alterPlansTable = `
    ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS billing_period VARCHAR(20),
    ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS min_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE,
    ADD COLUMN IF NOT EXISTS auto_close BOOLEAN,
    ADD COLUMN IF NOT EXISTS closable BOOLEAN,
    ADD COLUMN IF NOT EXISTS renewable BOOLEAN,
    ADD COLUMN IF NOT EXISTS pausable BOOLEAN;
  `;

  const createDiscountsTable = `
    CREATE TABLE IF NOT EXISTS discounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('fixed', 'percentage')),
      value NUMERIC(12, 2) NOT NULL CHECK (value > 0),
      min_purchase NUMERIC(12, 2) CHECK (min_purchase IS NULL OR min_purchase > 0),
      min_quantity INTEGER CHECK (min_quantity IS NULL OR min_quantity > 0),
      start_date DATE,
      end_date DATE,
      usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
      apply_to_subscription BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createDiscountProductsTable = `
    CREATE TABLE IF NOT EXISTS discount_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE (discount_id, product_id)
    );
  `;

  const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('service', 'goods')),
      sales_price NUMERIC(12, 2) NOT NULL CHECK (sales_price > 0),
      cost_price NUMERIC(12, 2) NOT NULL CHECK (cost_price > 0),
      tax_id UUID REFERENCES taxes(id) ON DELETE SET NULL,
      is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createProductVariantsTable = `
    CREATE TABLE IF NOT EXISTS product_variants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      attribute VARCHAR(255) NOT NULL,
      value VARCHAR(255) NOT NULL,
      extra_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (extra_price >= 0)
    );
  `;

  const createProductRecurringPricesTable = `
    CREATE TABLE IF NOT EXISTS product_recurring_prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
      price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
      min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity > 0),
      start_date DATE NOT NULL,
      end_date DATE
    );
  `;

  const createUsersEmailIndex = `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  const createContactsUserIdIndex = `
    CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
  `;

  const createTaxesNameIndex = `
    CREATE INDEX IF NOT EXISTS idx_taxes_name ON taxes(name);
  `;

  const createPlansNameIndex = `
    CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
  `;

  const createDiscountsNameIndex = `
    CREATE INDEX IF NOT EXISTS idx_discounts_name ON discounts(name);
  `;

  const createDiscountProductsDiscountIdIndex = `
    CREATE INDEX IF NOT EXISTS idx_discount_products_discount_id ON discount_products(discount_id);
  `;

  const createDiscountProductsProductIdIndex = `
    CREATE INDEX IF NOT EXISTS idx_discount_products_product_id ON discount_products(product_id);
  `;

  const createProductsNameIndex = `
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  `;

  const createProductVariantsProductIdIndex = `
    CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
  `;

  const createProductRecurringPricesProductIdIndex = `
    CREATE INDEX IF NOT EXISTS idx_product_recurring_prices_product_id ON product_recurring_prices(product_id);
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

    await pool.query(createTaxesTable);
    await pool.query(alterTaxesTable);
    console.log("✅ Taxes table ready");

    await pool.query(createPlansTable);
    await pool.query(alterPlansTable);
    console.log("✅ Plans table ready");

    await pool.query(createProductsTable);
    console.log("✅ Products table ready");

    await pool.query(createProductVariantsTable);
    console.log("✅ Product variants table ready");

    await pool.query(createProductRecurringPricesTable);
    console.log("✅ Product recurring prices table ready");

    await pool.query(createDiscountsTable);
    console.log("✅ Discounts table ready");

    await pool.query(createDiscountProductsTable);
    console.log("✅ Discount products table ready");

    await pool.query(createProductsNameIndex);
    await pool.query(createProductVariantsProductIdIndex);
    await pool.query(createProductRecurringPricesProductIdIndex);
    await pool.query(createTaxesNameIndex);
    await pool.query(createPlansNameIndex);
    await pool.query(createDiscountsNameIndex);
    await pool.query(createDiscountProductsDiscountIdIndex);
    await pool.query(createDiscountProductsProductIdIndex);
    console.log("✅ Product indexes ready");
  } catch (error) {
    console.error("❌ Error creating tables:", error.message);
    throw error;
  }
};

module.exports = { createTables };
