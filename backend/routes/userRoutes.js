// routes/userRoutes.js
const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/userController");
const { gmsProtect } = require("../middleware/authMiddleware");

router.use(gmsProtect);

router.get("/",                        ctrl.getUsers);
router.post("/",                       ctrl.create);
router.put("/:id",                     ctrl.update);
router.delete("/:id",                  ctrl.remove);
router.patch("/:id/restore",           ctrl.restore);
router.get("/:id/permissions",         ctrl.getPermissions);
router.post("/:id/permissions",        ctrl.savePermissions);
router.get("/menus/:userId",           ctrl.getGroupedMenus);

module.exports = router;
// already handled by controller — just verify route exists

// GET /api/users/sidebar/:userId — flat menu list with CRUD rights for sidebar
router.get("/sidebar/:userId", ctrl.getSidebarMenus);