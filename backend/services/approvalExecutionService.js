const executeApprovedAction = async (client, approval) => {
  const payload = approval.payload || {};

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

    const error = new Error("MODIFY_PRICING supports only plan, tax, or discount entities.");
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
