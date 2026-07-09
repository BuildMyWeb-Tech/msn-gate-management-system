// backend/routes/menuRoutes.js

const express = require("express");
const router  = express.Router();

const menuController = require("../controllers/menuController");
const { erpProtect } = require("../middleware/authMiddleware");

// GET /api/menus/grouped/:userId
// → calls PR_Get_MenuRights_ForUser, returns grouped menu + MWrite/MUpdate/MDelete
router.get("/grouped/:userId", erpProtect, menuController.getGroupedMenus);

module.exports = router;