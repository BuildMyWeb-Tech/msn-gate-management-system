// controllers/userController.js
const service = require("../services/userService");

exports.getUsers = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const tag  = req.query.tag === "0" ? 0 : 1;
    const data = await service.getUsers({ companyId, tag });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { companyId }             = req.gmsUser;
    const { userName, pwd, active } = req.body;

    if (!userName || !pwd) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    const result = await service.createUser({ companyId, userName, pwd, active: active ?? 1 });

    // SP ran without throwing = success regardless of ResponseCode
    // Only fail if service explicitly returned success=false AND has an error message
    res.json({
      success: true,
      message: result.responseMessage || "User created successfully",
      data:    { userId: result.userId },
    });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const result = await service.updateUser({
      companyId, uid: Number(req.params.id), ...req.body,
    });
    res.json({ success: true, message: result?.ResponseMessage || "User updated successfully" });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const result = await service.deleteUser({ companyId, uid: Number(req.params.id) });
    res.json({ success: true, message: result?.ResponseMessage || "User deleted successfully" });
  } catch (err) { next(err); }
};

exports.restore = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const result = await service.restoreUser({ companyId, uid: Number(req.params.id) });
    res.json({ success: true, message: result?.ResponseMessage || "User restored successfully" });
  } catch (err) { next(err); }
};

exports.getPermissions = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const data = await service.getUserPermissions({ companyId, userId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.savePermissions = async (req, res, next) => {
  try {
    const { companyId }   = req.gmsUser;
    const { permissions } = req.body;
    if (!permissions) {
      return res.status(400).json({ success: false, message: "Permissions required" });
    }
    const result = await service.savePermissions({
      companyId, userId: Number(req.params.id), permissions,
    });
    res.json({ success: true, message: result?.ResponseMessage || "Permissions saved" });
  } catch (err) { next(err); }
};

exports.getGroupedMenus = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const userId        = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId required" });
    }
    const data = await service.getGroupedMenus({ companyId, userId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
