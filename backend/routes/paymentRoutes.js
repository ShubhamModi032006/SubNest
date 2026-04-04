const express = require("express");
const router = express.Router();

const {
  createPaymentSession,
  getPaymentSession,
  completePaymentSession,
  failPaymentSession,
} = require("../controllers/paymentController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.post("/create-session", protect, allowRoles("admin", "internal", "user"), createPaymentSession);
router.get("/session/:id", protect, allowRoles("admin", "internal", "user"), getPaymentSession);
router.post("/session/:id/complete", protect, allowRoles("admin", "internal", "user"), completePaymentSession);
router.post("/session/:id/fail", protect, allowRoles("admin", "internal", "user"), failPaymentSession);

module.exports = router;
