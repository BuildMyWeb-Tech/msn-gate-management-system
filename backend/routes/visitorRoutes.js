const express        = require("express");
const router         = express.Router();
const ctrl           = require("../controllers/visitorController");
const { gmsProtect } = require("../middleware/authMiddleware");

router.use(gmsProtect);

// ── Specific routes BEFORE /:id ───────────────────────────────
router.get("/validate-mobile", ctrl.validateMobile); // PR_Validate_Mobileno
router.get("/search",          ctrl.searchAll);      // PR_Search_Visitors

// ── CRUD ─────────────────────────────────────────────────────
router.get("/",          ctrl.getAll);
router.get("/:id",       ctrl.getById);
router.post("/",         ctrl.create);
router.put("/:id",       ctrl.update);
router.patch("/:id/out", ctrl.markOut);
router.delete("/:id",    ctrl.remove);

module.exports = router;