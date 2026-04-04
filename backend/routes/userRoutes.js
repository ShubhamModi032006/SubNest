const express = require("express");
const router = express.Router();

const {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, allowRoles("admin", "internal"), getUsers);
router.post("/", protect, allowRoles("admin"), createUser);
router.get("/:id", protect, allowRoles("admin", "internal"), getUserById);
router.put("/:id", protect, allowRoles("admin"), updateUser);
router.delete("/:id", protect, allowRoles("admin"), deleteUser);

module.exports = router;
