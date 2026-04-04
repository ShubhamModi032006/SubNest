const express = require("express");
const router = express.Router();

const {
  getDiscounts,
  createDiscount,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
} = require("../controllers/discountController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, allowRoles("admin"), getDiscounts);
router.post("/", protect, allowRoles("admin"), createDiscount);
router.get("/:id", protect, allowRoles("admin"), getDiscountById);
router.put("/:id", protect, allowRoles("admin"), updateDiscount);
router.delete("/:id", protect, allowRoles("admin"), deleteDiscount);

module.exports = router;
