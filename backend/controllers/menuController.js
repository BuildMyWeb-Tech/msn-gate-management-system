// backend/controllers/menuController.js

const service = require("../services/menuService");

exports.getGroupedMenus = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    // Calls PR_Get_MenuRights_ForUser via service → repo
    const data = await service.getGroupedMenus(userId);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};