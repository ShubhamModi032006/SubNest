const express = require("express");
const { body, query, param } = require("express-validator");
const { protect, allowRoles } = require("../middlewares/authMiddleware");
const { validateRequest } = require("../middlewares/validateRequest");
const { getNotifications, postNotification, markRead } = require("../controllers/notificationController");

const router = express.Router();

router.get(
  "/",
  protect,
  allowRoles("admin", "internal", "user"),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer."),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100."),
  ],
  validateRequest,
  getNotifications
);

router.post(
  "/",
  protect,
  allowRoles("admin", "internal", "user"),
  [
    body("message").trim().notEmpty().withMessage("message is required."),
    body("type").optional().isIn(["success", "error", "warning", "info"]).withMessage("Invalid notification type."),
    body("user_id").optional().isUUID().withMessage("user_id must be a valid UUID."),
  ],
  validateRequest,
  postNotification
);

router.patch(
  "/:id/read",
  protect,
  allowRoles("admin", "internal", "user"),
  [param("id").isUUID().withMessage("Notification id must be a valid UUID.")],
  validateRequest,
  markRead
);

module.exports = router;
