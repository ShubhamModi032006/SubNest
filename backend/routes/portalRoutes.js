const express = require("express");
const router = express.Router();

const {
  getPortalProducts,
  getPortalSubscriptions,
  purchasePortalSubscription,
  createOrder,
  previewOrderPricing,
  getPortalPurchaseHistory,
  getMyOrders,
  getMyOrderById,
  getMySubscriptions,
  getMyInvoices,
  getReportsSummary,
  getRevenueTrend,
  getSubscriptionStats,
} = require("../controllers/portalController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/portal/products", getPortalProducts);
router.get("/portal/subscriptions", protect, allowRoles("admin", "internal", "user"), getPortalSubscriptions);
router.post("/portal/subscriptions/:id/purchase", protect, allowRoles("admin", "internal", "user"), purchasePortalSubscription);

router.post("/orders", protect, allowRoles("admin", "internal", "user"), createOrder);
router.post("/orders/preview", protect, allowRoles("admin", "internal", "user"), previewOrderPricing);
router.get("/portal/purchases/history", protect, allowRoles("admin", "internal"), getPortalPurchaseHistory);

router.get("/my/orders", protect, allowRoles("admin", "internal", "user"), getMyOrders);
router.get("/my/orders/:id", protect, allowRoles("admin", "internal", "user"), getMyOrderById);
router.get("/my/subscriptions", protect, allowRoles("admin", "internal", "user"), getMySubscriptions);
router.get("/my/invoices", protect, allowRoles("admin", "internal", "user"), getMyInvoices);

router.get("/reports/summary", protect, allowRoles("admin", "internal"), getReportsSummary);
router.get("/reports/revenue-trend", protect, allowRoles("admin", "internal"), getRevenueTrend);
router.get("/reports/subscription-stats", protect, allowRoles("admin", "internal"), getSubscriptionStats);

module.exports = router;