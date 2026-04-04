const pool = require("../models/db");

const run = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE"
    );
    await client.query(
      "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL"
    );

    await client.query(`
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        FOR constraint_name IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'subscriptions'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) ILIKE '%customer_type%'
        LOOP
          EXECUTE format('ALTER TABLE subscriptions DROP CONSTRAINT %I', constraint_name);
        END LOOP;

        ALTER TABLE subscriptions
        ADD CONSTRAINT subscriptions_customer_type_check
        CHECK (customer_type IN ('user', 'contact', 'public'));
      END $$;
    `);

    await client.query(`
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        FOR constraint_name IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'subscriptions'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) ILIKE '%customer_user_id%'
        LOOP
          EXECUTE format('ALTER TABLE subscriptions DROP CONSTRAINT %I', constraint_name);
        END LOOP;

        ALTER TABLE subscriptions
        ADD CONSTRAINT subscriptions_customer_assignment_check
        CHECK (
          is_public = TRUE OR
          (CASE WHEN customer_user_id IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN customer_contact_id IS NOT NULL THEN 1 ELSE 0 END) = 1
        );
      END $$;
    `);

    const migrated = await client.query(`
      UPDATE subscriptions
      SET customer_type = 'public',
          is_public = TRUE,
          customer_user_id = NULL,
          customer_contact_id = NULL,
          customer_id = NULL
      WHERE (customer_user_id IS NULL AND customer_contact_id IS NULL)
         OR customer_type = 'public'
      RETURNING id
    `);

    await client.query("COMMIT");
    console.log(`Migration complete. Public-compatible subscriptions updated: ${migrated.rowCount}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
