const express = require("express");
const router = express.Router();

const {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  archiveProduct,
} = require("../controllers/productController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, allowRoles("admin", "internal"), getProducts);
router.post("/", protect, allowRoles("admin", "internal"), createProduct);
router.get("/:id", protect, allowRoles("admin", "internal"), getProductById);
router.put("/:id", protect, allowRoles("admin", "internal"), updateProduct);
router.delete("/:id", protect, allowRoles("admin"), deleteProduct);
router.patch("/:id/archive", protect, allowRoles("admin", "internal"), archiveProduct);

module.exports = router;
