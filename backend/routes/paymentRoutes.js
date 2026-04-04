const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");

const {
  createPaymentSession,
  getPaymentSession,
  completePaymentSession,
  failPaymentSession,
} = require("../controllers/paymentController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");
const { validateRequest } = require("../middlewares/validateRequest");

router.post(
  "/create-session",
  protect,
  allowRoles("admin", "internal", "user"),
  [
    body("invoice_id").isUUID().withMessage("invoice_id must be a valid UUID."),
    body("success_url").optional().isURL().withMessage("success_url must be a valid URL."),
    body("cancel_url").optional().isURL().withMessage("cancel_url must be a valid URL."),
  ],
  validateRequest,
  createPaymentSession
);

router.get(
  "/session/:id",
  protect,
  allowRoles("admin", "internal", "user"),
  [param("id").trim().notEmpty().withMessage("session id is required.")],
  validateRequest,
  getPaymentSession
);

router.post(
  "/session/:id/complete",
  protect,
  allowRoles("admin", "internal", "user"),
  [param("id").trim().notEmpty().withMessage("session id is required.")],
  validateRequest,
  completePaymentSession
);

router.post(
  "/session/:id/fail",
  protect,
  allowRoles("admin", "internal", "user"),
  [param("id").trim().notEmpty().withMessage("session id is required.")],
  validateRequest,
  failPaymentSession
);

module.exports = router;
