const express = require("express");
const { query } = require("express-validator");
const { search } = require("../controllers/searchController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");
const { validateRequest } = require("../middlewares/validateRequest");

const router = express.Router();

router.get(
  "/",
  protect,
  allowRoles("admin", "internal", "user"),
  [
    query("q").trim().isLength({ min: 2 }).withMessage("q must be at least 2 characters."),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer."),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit must be between 1 and 50."),
  ],
  validateRequest,
  search
);

module.exports = router;
