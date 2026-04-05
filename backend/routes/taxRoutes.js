const express = require("express");
const router = express.Router();

const {
  getTaxes,
  createTax,
  updateTax,
  deleteTax,
} = require("../controllers/taxController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, allowRoles("admin", "internal"), getTaxes);
router.post("/", protect, allowRoles("admin"), createTax);
router.put("/:id", protect, allowRoles("admin"), updateTax);
router.delete("/:id", protect, allowRoles("admin"), deleteTax);

module.exports = router;
