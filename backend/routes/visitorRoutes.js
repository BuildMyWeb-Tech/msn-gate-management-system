// routes/visitorRoutes.js
const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/visitorController");
const { gmsProtect } = require("../middleware/authMiddleware");

router.use(gmsProtect);

router.get("/",                      ctrl.getAll);
router.get("/mobile/:mobile",        ctrl.getByMobile);
router.get("/:id",                   ctrl.getById);
router.post("/",                     ctrl.create);
router.put("/:id",                   ctrl.update);
router.patch("/:id/out",             ctrl.markOut);

module.exports = router;
