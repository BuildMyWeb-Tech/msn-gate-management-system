const express        = require("express");
const router         = express.Router();
const ctrl           = require("../controllers/visitorController");
const { gmsProtect } = require("../middleware/authMiddleware");

router.use(gmsProtect);

// ── Specific routes BEFORE /:id — order matters ───────────────
router.get("/search",          ctrl.search);      // GET /api/visitors/search?q=xxx
router.get("/mobile/:mobile",  ctrl.getByMobile); // GET /api/visitors/mobile/9842450500

// ── CRUD ─────────────────────────────────────────────────────
router.get("/",          ctrl.getAll);
router.get("/:id",       ctrl.getById);
router.post("/",         ctrl.create);
router.put("/:id",       ctrl.update);
router.patch("/:id/out", ctrl.markOut);
router.delete("/:id",    ctrl.remove);

module.exports = router;