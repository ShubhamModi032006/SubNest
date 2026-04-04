const pool = require("../models/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { ACTION_TYPES, ENTITY_TYPES, createApprovalRequest } = require("../utils/approvalService");
const { executeApprovedAction } = require("../services/approvalExecutionService");

const withTransaction = async (handler) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const normalizeText = (value) => (value === undefined || value === null ? null : String(value).trim());

const createApproval = async (req, res, next) => {
  try {
    const action_type = normalizeText(req.body.action_type);
    const entity_type = normalizeText(req.body.entity_type);
    const entity_id = normalizeText(req.body.entity_id);
    const reason = normalizeText(req.body.reason);
    const payload = req.body.payload && typeof req.body.payload === "object" ? req.body.payload : {};

    if (!ACTION_TYPES.includes(action_type)) {
      return sendError(res, 400, "Invalid action_type.");
    }

    if (!ENTITY_TYPES.includes(entity_type)) {
      return sendError(res, 400, "Invalid entity_type.");
    }

    if (!entity_id) {
      return sendError(res, 400, "entity_id is required.");
    }

    const { approval, deduped } = await createApprovalRequest({
      userId: req.user.id,
      actionType: action_type,
      entityType: entity_type,
      entityId: entity_id,
      reason,
      payload,
    });

    console.log(
      `[AUDIT] approval_requested requester=${req.user.id} action=${action_type} entity=${entity_type}:${entity_id} approval=${approval.id}`
    );

    return sendSuccess(
      res,
      deduped ? 200 : 201,
      { approval, deduped },
      deduped ? "Existing pending approval returned." : "Approval request created successfully."
    );
  } catch (error) {
    next(error);
  }
};

const getApprovals = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "admin";
    const params = [];
    let whereClause = "";

    if (!isAdmin) {
      params.push(req.user.id);
      whereClause = `WHERE a.user_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT a.id, a.user_id, a.action_type, a.entity_type, a.entity_id, a.reason, a.status, a.payload,
              a.created_at, a.reviewed_by, a.reviewed_at,
              ru.name AS requester_name, rv.name AS reviewer_name
       FROM approvals a
       LEFT JOIN users ru ON ru.id = a.user_id
       LEFT JOIN users rv ON rv.id = a.reviewed_by
       ${whereClause}
       ORDER BY a.created_at DESC`,
      params
    );

    return sendSuccess(res, 200, { approvals: result.rows }, "Approvals fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const approveApproval = async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const approvalResult = await client.query(
        `SELECT id, user_id, action_type, entity_type, entity_id, reason, status, payload
         FROM approvals
         WHERE id = $1
         FOR UPDATE`,
        [req.params.id]
      );

      if (approvalResult.rows.length === 0) {
        const error = new Error("Approval not found.");
        error.statusCode = 404;
        throw error;
      }

      const approval = approvalResult.rows[0];
      if (approval.status !== "pending") {
        const error = new Error("Only pending approvals can be approved.");
        error.statusCode = 400;
        throw error;
      }

      const execution = await executeApprovedAction(client, approval);

      const updateResult = await client.query(
        `UPDATE approvals
         SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
         WHERE id = $2
         RETURNING id, user_id, action_type, entity_type, entity_id, reason, status, payload, created_at, reviewed_by, reviewed_at`,
        [req.user.id, req.params.id]
      );

      return { approval: updateResult.rows[0], execution };
    });

    console.log(
      `[AUDIT] approval_approved reviewer=${req.user.id} approval=${result.approval.id} action=${result.approval.action_type} entity=${result.approval.entity_type}:${result.approval.entity_id}`
    );

    return sendSuccess(res, 200, result, "Approval approved and action executed successfully.");
  } catch (error) {
    next(error);
  }
};

const rejectApproval = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE approvals
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING id, user_id, action_type, entity_type, entity_id, reason, status, payload, created_at, reviewed_by, reviewed_at`,
      [req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "Pending approval not found.");
    }

    console.log(
      `[AUDIT] approval_rejected reviewer=${req.user.id} approval=${result.rows[0].id} action=${result.rows[0].action_type} entity=${result.rows[0].entity_type}:${result.rows[0].entity_id}`
    );

    return sendSuccess(res, 200, { approval: result.rows[0] }, "Approval rejected successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createApproval,
  getApprovals,
  approveApproval,
  rejectApproval,
};
