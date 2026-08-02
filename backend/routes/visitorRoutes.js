const express        = require("express");
const router         = express.Router();
const ctrl           = require("../controllers/visitorController");
const { gmsProtect } = require("../middleware/authMiddleware");

router.use(gmsProtect);
router.get("/",          ctrl.getAll);
router.get("/:id",       ctrl.getById);
router.post("/",         ctrl.create);
router.put("/:id",       ctrl.update);
router.patch("/:id/out", ctrl.markOut);
router.delete("/:id",    ctrl.remove);
module.exports = router;