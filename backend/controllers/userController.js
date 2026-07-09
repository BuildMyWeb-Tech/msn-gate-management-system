// controllers/userController.js
const service = require("../services/userService");

exports.getUsers = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const tag  = req.query.tag === "0" ? 0 : 1;
    const data = await service.getUsers({ companyCode, tag });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { companyCode }        = req.gmsUser;
    const { userName, pwd, active } = req.body;
    if (!userName || !pwd)
      return res.status(400).json({ success: false, message: "Username and password are required" });
    const result = await service.createUser({ companyCode, userName, pwd, active: active ?? 1 });
    if (!result.success)
      return res.status(400).json({ success: false, message: result.responseMessage || "Failed to create user" });
    res.json({ success: true, message: result.responseMessage || "User created successfully", data: { userId: result.userId } });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const uid             = Number(req.params.id);
    const result          = await service.updateUser({ companyCode, uid, ...req.body });
    res.json({ success: true, message: result?.ResponseMessage || "User updated successfully" });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const uid             = Number(req.params.id);
    const result          = await service.deleteUser({ companyCode, uid });
    res.json({ success: true, message: result?.ResponseMessage || "User deleted successfully" });
  } catch (err) { next(err); }
};

exports.restore = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const uid             = Number(req.params.id);
    const result          = await service.restoreUser({ companyCode, uid });
    res.json({ success: true, message: result?.ResponseMessage || "User restored successfully" });
  } catch (err) { next(err); }
};

exports.getPermissions = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const userId          = Number(req.params.id);
    const data            = await service.getUserPermissions({ companyCode, userId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.savePermissions = async (req, res, next) => {
  try {
    const { companyCode }  = req.gmsUser;
    const userId           = Number(req.params.id);
    const { permissions }  = req.body;
    if (!permissions || typeof permissions !== "object")
      return res.status(400).json({ success: false, message: "Permissions object required" });
    const result = await service.savePermissions({ companyCode, userId, permissions });
    res.json({ success: true, message: result?.ResponseMessage || "Permissions saved successfully" });
  } catch (err) { next(err); }
};

exports.getGroupedMenus = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const userId          = Number(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: "userId is required" });
    const data = await service.getGroupedMenus({ companyCode, userId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
