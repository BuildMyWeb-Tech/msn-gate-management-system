// routes/customerRoutes.js
const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/customerController");
const { erpProtect } = require("../middleware/authMiddleware");
 
router.get("/",               erpProtect, controller.getAll);
router.get("/:id",            erpProtect, controller.getById);
router.post("/",              erpProtect, controller.create);
router.put("/:id",            erpProtect, controller.update);
router.delete("/:id",         erpProtect, controller.remove);
router.patch("/:id/restore",  erpProtect, controller.restore);   // ← NEW
 
module.exports = router;