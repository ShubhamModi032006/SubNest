const express = require("express");
const router = express.Router();

const {
  createApproval,
  getApprovals,
  approveApproval,
  rejectApproval,
} = require("../controllers/approvalController");
const { protect, allowRoles, requirePermission } = require("../middlewares/authMiddleware");

router.post("/", protect, allowRoles("admin", "internal"), requirePermission("APPROVAL_CREATE"), createApproval);
router.get("/", protect, allowRoles("admin", "internal"), requirePermission("APPROVAL_VIEW"), getApprovals);
router.post("/:id/approve", protect, allowRoles("admin"), requirePermission("APPROVAL_REVIEW"), approveApproval);
router.post("/:id/reject", protect, allowRoles("admin"), requirePermission("APPROVAL_REVIEW"), rejectApproval);

module.exports = router;
