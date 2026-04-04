const express = require("express");
const router = express.Router();

const {
  getQuotationTemplates,
  createQuotationTemplate,
  getQuotationTemplateById,
  updateQuotationTemplate,
  deleteQuotationTemplate,
} = require("../controllers/quotationTemplateController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, allowRoles("admin", "internal"), getQuotationTemplates);
router.post("/", protect, allowRoles("admin"), createQuotationTemplate);
router.get("/:id", protect, allowRoles("admin", "internal"), getQuotationTemplateById);
router.put("/:id", protect, allowRoles("admin"), updateQuotationTemplate);
router.delete("/:id", protect, allowRoles("admin"), deleteQuotationTemplate);

module.exports = router;
