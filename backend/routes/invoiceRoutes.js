const express = require("express");
const router = express.Router();

const {
  getInvoices,
  getInvoiceById,
  confirmInvoice,
  sendInvoice,
  cancelInvoice,
} = require("../controllers/invoiceController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, allowRoles("admin", "internal"), getInvoices);
router.get("/:id", protect, allowRoles("admin", "internal"), getInvoiceById);
router.post("/:id/confirm", protect, allowRoles("admin", "internal"), confirmInvoice);
router.post("/:id/send", protect, allowRoles("admin", "internal"), sendInvoice);
router.post("/:id/cancel", protect, allowRoles("admin", "internal"), cancelInvoice);

module.exports = router;
