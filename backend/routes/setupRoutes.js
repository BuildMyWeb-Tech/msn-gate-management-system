// routes/setupRoutes.js
// :setupType = gates | securities | designations | locations
const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/setupController");
const { gmsProtect } = require("../middleware/authMiddleware");

router.use(gmsProtect);

router.get("/:setupType/dropdown",        ctrl.getDropdown);
router.get("/:setupType",                 ctrl.getData);
router.post("/:setupType",                ctrl.create);
router.put("/:setupType/:id",             ctrl.update);
router.delete("/:setupType/:id",          ctrl.remove);
router.patch("/:setupType/:id/restore",   ctrl.restore);

module.exports = router;
