const express = require("express");
const router = express.Router();

const {
  getContacts,
  createContact,
  getContactById,
  updateContact,
  deleteContact,
} = require("../controllers/contactController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, allowRoles("admin", "internal"), getContacts);
router.post("/", protect, allowRoles("admin", "internal"), createContact);
router.get("/:id", protect, allowRoles("admin", "internal"), getContactById);
router.put("/:id", protect, allowRoles("admin", "internal"), updateContact);
router.delete("/:id", protect, allowRoles("admin", "internal"), deleteContact);

module.exports = router;
