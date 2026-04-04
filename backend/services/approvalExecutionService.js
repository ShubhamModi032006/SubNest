const executeApprovedAction = async (client, approval) => {
  const payload = approval.payload || {};

  const normalizeText = (value) =>
    value === undefined || value === null ? null : String(value).trim();

  const toPositiveNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  };

  const normalizeProductPayload = (productPayload) => {
    const product = productPayload && typeof productPayload === "object" ? productPayload : {};
    const type = String(product.type || "").toLowerCase();
    return {
      name: normalizeText(product.name),
      type,
      sales_price: toPositiveNumber(product.sales_price ?? product.salesPrice),
      cost_price: toPositiveNumber(product.cost_price ?? product.costPrice),
      tax_id: product.tax_id ?? product.taxId ?? null,
      variants: Array.isArray(product.variants) ? product.variants : [],
      recurring_prices: Array.isArray(product.recurring_prices)
        ? product.recurring_prices
        : Array.isArray(product.recurringPrices)
          ? product.recurringPrices
          : [],
    };
  };

  const insertProductWithChildren = async (productInput) => {
    if (!productInput.name || !["service", "goods"].includes(productInput.type)) {
      const error = new Error("Invalid product payload for approval execution.");
      error.statusCode = 400;
      throw error;
    }

    if (!productInput.sales_price || !productInput.cost_price) {
      const error = new Error("Product prices must be positive numbers.");
      error.statusCode = 400;
      throw error;
    }

    if (productInput.tax_id) {
      const taxResult = await client.query("SELECT id FROM taxes WHERE id = $1", [productInput.tax_id]);
      if (taxResult.rows.length === 0) {
        const error = new Error("Referenced tax record does not exist.");
        error.statusCode = 400;
        throw error;
      }
    }

    const inserted = await client.query(
      `INSERT INTO products (name, type, sales_price, cost_price, tax_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, type, sales_price, cost_price, tax_id, is_archived, created_at`,
      [productInput.name, productInput.type, productInput.sales_price, productInput.cost_price, productInput.tax_id || null]
    );

    const createdProduct = inserted.rows[0];

    if (productInput.variants.length > 0) {
      const variantValues = [];
      const variantPlaceholders = productInput.variants.map((variant, index) => {
        const baseIndex = index * 4;
        variantValues.push(
          createdProduct.id,
          normalizeText(variant.attribute),
          normalizeText(variant.value),
          Number(variant.extra_price ?? variant.extraPrice ?? 0)
        );
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
      });

      await client.query(
        `INSERT INTO product_variants (product_id, attribute, value, extra_price)
         VALUES ${variantPlaceholders.join(", ")}`,
        variantValues
      );
    }

    if (productInput.recurring_prices.length > 0) {
      const recurringValues = [];
      const recurringPlaceholders = productInput.recurring_prices.map((row, index) => {
        const baseIndex = index * 6;
        recurringValues.push(
          createdProduct.id,
          row.plan_id ?? row.planId ?? null,
          Number(row.price ?? 0),
          Number(row.min_quantity ?? row.minQuantity ?? 1),
          row.start_date ?? row.startDate,
          row.end_date ?? row.endDate ?? null
        );
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
      });

      await client.query(
        `INSERT INTO product_recurring_prices (product_id, plan_id, price, min_quantity, start_date, end_date)
         VALUES ${recurringPlaceholders.join(", ")}`,
        recurringValues
      );
    }

    return createdProduct;
  };

  if (approval.action_type === "DELETE_PRODUCT") {
    const result = await client.query(
      "DELETE FROM products WHERE id = $1 RETURNING id, name",
      [approval.entity_id]
    );
    if (result.rows.length === 0) {
      const error = new Error("Product not found or already deleted.");
      error.statusCode = 404;
      throw error;
    }
    return { action: approval.action_type, entity: result.rows[0] };
  }

  if (approval.action_type === "CANCEL_INVOICE") {
    const result = await client.query(
      `UPDATE invoices
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1 AND status IN ('draft', 'confirmed')
       RETURNING id, status, cancelled_at`,
      [approval.entity_id]
    );
    if (result.rows.length === 0) {
      const error = new Error("Invoice cannot be cancelled in current status.");
      error.statusCode = 400;
      throw error;
    }
    return { action: approval.action_type, entity: result.rows[0] };
  }

  if (approval.action_type === "CLOSE_SUBSCRIPTION") {
    const result = await client.query(
      `UPDATE subscriptions
       SET status = 'closed'
       WHERE id = $1 AND status IN ('draft', 'quotation', 'confirmed', 'active')
       RETURNING id, status`,
      [approval.entity_id]
    );
    if (result.rows.length === 0) {
      const error = new Error("Subscription cannot be closed in current status.");
      error.statusCode = 400;
      throw error;
    }
    return { action: approval.action_type, entity: result.rows[0] };
  }

  if (approval.action_type === "MODIFY_PRICING") {
    if (!payload || typeof payload !== "object") {
      const error = new Error("Pricing payload is required for MODIFY_PRICING.");
      error.statusCode = 400;
      throw error;
    }

    if (approval.entity_type === "product") {
      const operation = String(payload.operation || (payload.product ? "CREATE_PRODUCT" : "")).toUpperCase();

      if (operation === "CREATE_PRODUCT") {
        const productInput = normalizeProductPayload(payload.product);
        const createdProduct = await insertProductWithChildren(productInput);
        return { action: "CREATE_PRODUCT", entity: createdProduct };
      }

      if (operation === "UPDATE_PRODUCT") {
        const productInput = normalizeProductPayload(payload.product || payload);
        const updated = await client.query(
          `UPDATE products
           SET name = COALESCE($1, name),
               type = COALESCE($2, type),
               sales_price = COALESCE($3, sales_price),
               cost_price = COALESCE($4, cost_price),
               tax_id = COALESCE($5, tax_id)
           WHERE id = $6
           RETURNING id, name, type, sales_price, cost_price, tax_id, is_archived, created_at`,
          [
            productInput.name,
            productInput.type || null,
            productInput.sales_price,
            productInput.cost_price,
            productInput.tax_id,
            approval.entity_id,
          ]
        );

        if (updated.rows.length === 0) {
          const error = new Error("Product not found.");
          error.statusCode = 404;
          throw error;
        }

        return { action: "UPDATE_PRODUCT", entity: updated.rows[0] };
      }

      const error = new Error("Unsupported product operation for MODIFY_PRICING.");
      error.statusCode = 400;
      throw error;
    }

    if (approval.entity_type === "plan") {
      const result = await client.query(
        `UPDATE plans
         SET price = COALESCE($1, price),
             min_quantity = COALESCE($2, min_quantity)
         WHERE id = $3
         RETURNING id, name, price, min_quantity`,
        [payload.price ?? null, payload.min_quantity ?? null, approval.entity_id]
      );
      if (result.rows.length === 0) {
        const error = new Error("Plan not found.");
        error.statusCode = 404;
        throw error;
      }
      return { action: approval.action_type, entity: result.rows[0] };
    }

    if (approval.entity_type === "tax") {
      const result = await client.query(
        `UPDATE taxes
         SET type = COALESCE($1, type),
             value = COALESCE($2, value)
         WHERE id = $3
         RETURNING id, name, type, value`,
        [payload.type ?? null, payload.value ?? null, approval.entity_id]
      );
      if (result.rows.length === 0) {
        const error = new Error("Tax not found.");
        error.statusCode = 404;
        throw error;
      }
      return { action: approval.action_type, entity: result.rows[0] };
    }

    if (approval.entity_type === "discount") {
      const result = await client.query(
        `UPDATE discounts
         SET type = COALESCE($1, type),
             value = COALESCE($2, value),
             min_purchase = COALESCE($3, min_purchase),
             min_quantity = COALESCE($4, min_quantity)
         WHERE id = $5
         RETURNING id, name, type, value, min_purchase, min_quantity`,
        [
          payload.type ?? null,
          payload.value ?? null,
          payload.min_purchase ?? null,
          payload.min_quantity ?? null,
          approval.entity_id,
        ]
      );
      if (result.rows.length === 0) {
        const error = new Error("Discount not found.");
        error.statusCode = 404;
        throw error;
      }
      return { action: approval.action_type, entity: result.rows[0] };
    }

    const error = new Error("MODIFY_PRICING supports only product, plan, tax, or discount entities.");
    error.statusCode = 400;
    throw error;
  }

  const error = new Error("Unsupported action type.");
  error.statusCode = 400;
  throw error;
};

module.exports = {
  executeApprovedAction,
};
