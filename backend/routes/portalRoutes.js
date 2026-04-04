const express = require("express");
const router = express.Router();

const {
  getPortalProducts,
  createOrder,
  getMyOrders,
  getMyOrderById,
  getMyInvoices,
  getReportsSummary,
  getRevenueTrend,
  getSubscriptionStats,
} = require("../controllers/portalController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/portal/products", getPortalProducts);

router.post("/orders", protect, allowRoles("admin", "internal", "user"), createOrder);

router.get("/my/orders", protect, allowRoles("admin", "internal", "user"), getMyOrders);
router.get("/my/orders/:id", protect, allowRoles("admin", "internal", "user"), getMyOrderById);
router.get("/my/invoices", protect, allowRoles("admin", "internal", "user"), getMyInvoices);

router.get("/reports/summary", protect, allowRoles("admin", "internal"), getReportsSummary);
router.get("/reports/revenue-trend", protect, allowRoles("admin", "internal"), getRevenueTrend);
router.get("/reports/subscription-stats", protect, allowRoles("admin", "internal"), getSubscriptionStats);

module.exports = router;