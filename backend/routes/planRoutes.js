const express = require("express");
const router = express.Router();

const {
  getPlans,
  createPlan,
  getPlanById,
  updatePlan,
  deletePlan,
} = require("../controllers/planController");
const { protect, allowRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, allowRoles("admin"), getPlans);
router.post("/", protect, allowRoles("admin"), createPlan);
router.get("/:id", protect, allowRoles("admin"), getPlanById);
router.put("/:id", protect, allowRoles("admin"), updatePlan);
router.delete("/:id", protect, allowRoles("admin"), deletePlan);

module.exports = router;
