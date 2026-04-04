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

const CREATE_TAXES_TABLE = `
  CREATE TABLE IF NOT EXISTS taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value NUMERIC(12, 2) NOT NULL CHECK (value > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const ALTER_TAXES_TABLE = `
  ALTER TABLE taxes
  ADD COLUMN IF NOT EXISTS type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS value NUMERIC(12, 2);
`;

const CREATE_PLANS_TABLE = `
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

const ALTER_PLANS_TABLE = `
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

const CREATE_DISCOUNTS_TABLE = `
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

const CREATE_DISCOUNT_PRODUCTS_TABLE = `
  CREATE TABLE IF NOT EXISTS discount_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE (discount_id, product_id)
  );
`;

const CREATE_TAXES_NAME_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_taxes_name ON taxes(name);
`;

const CREATE_PLANS_NAME_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
`;

const CREATE_DISCOUNTS_NAME_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_discounts_name ON discounts(name);
`;

const CREATE_DISCOUNT_PRODUCTS_DISCOUNT_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_discount_products_discount_id ON discount_products(discount_id);
`;

const CREATE_DISCOUNT_PRODUCTS_PRODUCT_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_discount_products_product_id ON discount_products(product_id);
`;

const CREATE_PRODUCTS_TABLE = `
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

const CREATE_PRODUCT_VARIANTS_TABLE = `
  CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    extra_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (extra_price >= 0)
  );
`;

const CREATE_PRODUCT_RECURRING_PRICES_TABLE = `
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

const CREATE_SUBSCRIPTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_number VARCHAR(50) NOT NULL UNIQUE,
    customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('user', 'contact')),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    expiration_date DATE,
    payment_terms VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'quotation', 'confirmed', 'active', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (
      (CASE WHEN customer_user_id IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN customer_contact_id IS NOT NULL THEN 1 ELSE 0 END) = 1
    )
  );
`;

const CREATE_SUBSCRIPTION_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS subscription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_QUOTATION_TEMPLATES_TABLE = `
  CREATE TABLE IF NOT EXISTS quotation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    validity_days INTEGER NOT NULL CHECK (validity_days > 0),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_QUOTATION_TEMPLATE_LINES_TABLE = `
  CREATE TABLE IF NOT EXISTS quotation_template_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_INVOICES_TABLE = `
  CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('user', 'contact')),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'cancelled')),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
    grand_total NUMERIC(12, 2) NOT NULL CHECK (grand_total >= 0),
    sent_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (
      (CASE WHEN customer_user_id IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN customer_contact_id IS NOT NULL THEN 1 ELSE 0 END) = 1
    )
  );
`;

const CREATE_INVOICE_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_PRODUCTS_NAME_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
`;

const CREATE_PRODUCT_VARIANTS_PRODUCT_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
`;

const CREATE_PRODUCT_RECURRING_PRICES_PRODUCT_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_product_recurring_prices_product_id ON product_recurring_prices(product_id);
`;

const CREATE_SUBSCRIPTIONS_NUMBER_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subscriptions_number ON subscriptions(subscription_number);
`;

const CREATE_SUBSCRIPTIONS_CUSTOMER_USER_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_user_id ON subscriptions(customer_user_id);
`;

const CREATE_SUBSCRIPTIONS_CUSTOMER_CONTACT_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_contact_id ON subscriptions(customer_contact_id);
`;

const CREATE_SUBSCRIPTIONS_STATUS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
`;

const CREATE_SUBSCRIPTION_ITEMS_SUBSCRIPTION_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_id ON subscription_items(subscription_id);
`;

const CREATE_QUOTATION_TEMPLATES_NAME_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_quotation_templates_name ON quotation_templates(name);
`;

const CREATE_QUOTATION_TEMPLATE_LINES_TEMPLATE_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_quotation_template_lines_template_id ON quotation_template_lines(template_id);
`;

const CREATE_INVOICES_NUMBER_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
`;

const CREATE_INVOICES_STATUS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
`;

const CREATE_INVOICES_SUBSCRIPTION_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
`;

const CREATE_INVOICE_ITEMS_INVOICE_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
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

    await appClient.query(CREATE_TAXES_TABLE);
    await appClient.query(ALTER_TAXES_TABLE);
    console.log("✅ Table: taxes — ready");

    await appClient.query(CREATE_PLANS_TABLE);
    await appClient.query(ALTER_PLANS_TABLE);
    console.log("✅ Table: plans — ready");

    await appClient.query(CREATE_PRODUCTS_TABLE);
    console.log("✅ Table: products — ready");

    await appClient.query(CREATE_PRODUCT_VARIANTS_TABLE);
    console.log("✅ Table: product_variants — ready");

    await appClient.query(CREATE_PRODUCT_RECURRING_PRICES_TABLE);
    console.log("✅ Table: product_recurring_prices — ready");

    await appClient.query(CREATE_SUBSCRIPTIONS_TABLE);
    console.log("✅ Table: subscriptions — ready");

    await appClient.query(CREATE_SUBSCRIPTION_ITEMS_TABLE);
    console.log("✅ Table: subscription_items — ready");

    await appClient.query(CREATE_QUOTATION_TEMPLATES_TABLE);
    console.log("✅ Table: quotation_templates — ready");

    await appClient.query(CREATE_QUOTATION_TEMPLATE_LINES_TABLE);
    console.log("✅ Table: quotation_template_lines — ready");

    await appClient.query(CREATE_INVOICES_TABLE);
    console.log("✅ Table: invoices — ready");

    await appClient.query(CREATE_INVOICE_ITEMS_TABLE);
    console.log("✅ Table: invoice_items — ready");

    await appClient.query(CREATE_DISCOUNTS_TABLE);
    console.log("✅ Table: discounts — ready");

    await appClient.query(CREATE_DISCOUNT_PRODUCTS_TABLE);
    console.log("✅ Table: discount_products — ready");

    await appClient.query(CREATE_PRODUCTS_NAME_INDEX);
    await appClient.query(CREATE_PRODUCT_VARIANTS_PRODUCT_ID_INDEX);
    await appClient.query(CREATE_PRODUCT_RECURRING_PRICES_PRODUCT_ID_INDEX);
    await appClient.query(CREATE_SUBSCRIPTIONS_NUMBER_INDEX);
    await appClient.query(CREATE_SUBSCRIPTIONS_CUSTOMER_USER_ID_INDEX);
    await appClient.query(CREATE_SUBSCRIPTIONS_CUSTOMER_CONTACT_ID_INDEX);
    await appClient.query(CREATE_SUBSCRIPTIONS_STATUS_INDEX);
    await appClient.query(CREATE_SUBSCRIPTION_ITEMS_SUBSCRIPTION_ID_INDEX);
    await appClient.query(CREATE_QUOTATION_TEMPLATES_NAME_INDEX);
    await appClient.query(CREATE_QUOTATION_TEMPLATE_LINES_TEMPLATE_ID_INDEX);
    await appClient.query(CREATE_INVOICES_NUMBER_INDEX);
    await appClient.query(CREATE_INVOICES_STATUS_INDEX);
    await appClient.query(CREATE_INVOICES_SUBSCRIPTION_ID_INDEX);
    await appClient.query(CREATE_INVOICE_ITEMS_INVOICE_ID_INDEX);
    await appClient.query(CREATE_TAXES_NAME_INDEX);
    await appClient.query(CREATE_PLANS_NAME_INDEX);
    await appClient.query(CREATE_DISCOUNTS_NAME_INDEX);
    await appClient.query(CREATE_DISCOUNT_PRODUCTS_DISCOUNT_ID_INDEX);
    await appClient.query(CREATE_DISCOUNT_PRODUCTS_PRODUCT_ID_INDEX);
    console.log("✅ Product indexes — ready");

    console.log("\n🎉 Database setup complete! You can now run: npm run dev");
  } catch (err) {
    console.error("❌ Failed to create tables:", err.message);
    process.exit(1);
  } finally {
    await appClient.end();
  }
};

run();
