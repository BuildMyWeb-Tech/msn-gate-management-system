const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/generalMasterController");
const { erpProtect } = require("../middleware/authMiddleware");
 
router.get("/:type",                   erpProtect, controller.getData);
router.post("/:type",                  erpProtect, controller.create);
router.put("/:type/:id",               erpProtect, controller.update);
router.delete("/:type/:id",            erpProtect, controller.remove);
router.patch("/:type/:id/restore",     erpProtect, controller.restore);  // ← NEW
 
module.exports = router;