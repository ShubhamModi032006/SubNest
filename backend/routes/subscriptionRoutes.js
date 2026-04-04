const express = require("express");
const router = express.Router();

const {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  sendSubscription,
  confirmSubscription,
  closeSubscription,
  renewSubscription,
  upsellSubscription,
} = require("../controllers/subscriptionController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, allowRoles("admin", "internal"), getSubscriptions);
router.post("/", protect, allowRoles("admin", "internal"), createSubscription);
router.get("/:id", protect, allowRoles("admin", "internal"), getSubscriptionById);
router.put("/:id", protect, allowRoles("admin", "internal"), updateSubscription);
router.post("/:id/send", protect, allowRoles("admin", "internal"), sendSubscription);
router.post("/:id/confirm", protect, allowRoles("admin", "internal"), confirmSubscription);
router.post("/:id/close", protect, allowRoles("admin", "internal"), closeSubscription);
router.post("/:id/renew", protect, allowRoles("admin", "internal"), renewSubscription);
router.post("/:id/upsell", protect, allowRoles("admin", "internal"), upsellSubscription);

module.exports = router;
