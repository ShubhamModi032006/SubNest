const express = require("express");
const router = express.Router();

const {
  createPaymentSession,
  getPaymentSession,
} = require("../controllers/paymentController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.post("/create-session", protect, allowRoles("admin", "internal"), createPaymentSession);
router.get("/session/:id", protect, allowRoles("admin", "internal"), getPaymentSession);

module.exports = router;
