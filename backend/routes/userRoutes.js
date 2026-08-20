const express = require("express");
const router  = express.Router();
const { gmsProtect } = require("../middleware/authMiddleware");
const authRepo = require("../repositories/authRepo");

// GET /api/users/sidebar/:userId — for desktop sidebar menus
router.get("/sidebar/:userId", gmsProtect, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const rows   = await authRepo.getUserMenus(userId);
    // Normalise column names — SP returns SubMenuName
    const data = rows.map(r => ({
      menumuid:    r.menumuid    ?? r.MenuMUid    ?? 0,
      menuname:    r.menuname    ?? r.MenuName    ?? "",
      menudid:     r.menudid     ?? r.MenuDId     ?? 0,
      subMenuName: r.SubMenuName ?? r.subMenuName ?? r.submenuname ?? "",
    }));
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

// GET /api/users — user list (placeholder)
router.get("/", gmsProtect, (req, res) => {
  res.json({ success:true, data:[], message:"User management coming soon" });
});

module.exports = router;