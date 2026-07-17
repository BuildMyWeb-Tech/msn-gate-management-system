// routes/setupRoutes.js
const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/setupController");
const { gmsProtect } = require("../middleware/authMiddleware");

router.use(gmsProtect);

// ── Location (separate SP) ────────────────────────────────────
router.get("/locations",          ctrl.getLocations);
router.post("/locations",         ctrl.createLocation);
router.put("/locations/:id",      ctrl.updateLocation);
router.delete("/locations/:id",   ctrl.removeLocation);

// ── Gates & Designations (PR_Get_GeneralMData + PR_IUD_GeneralM) ──
router.get("/:setupType/dropdown",        ctrl.getDropdown);
router.get("/:setupType",                 ctrl.getData);
router.post("/:setupType",                ctrl.create);
router.put("/:setupType/:id",             ctrl.update);
router.delete("/:setupType/:id",          ctrl.remove);
router.patch("/:setupType/:id/restore",   ctrl.restore);

module.exports = router;