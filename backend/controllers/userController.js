const service = require("../services/userService");
 
exports.getUsers = async (req, res, next) => {
  try {
    const tag  = req.query.tag === "0" ? 0 : 1;
    const data = await service.getUsers(tag);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
 
exports.create = async (req, res, next) => {
  try {
    const { userName, pwd, active } = req.body;
    if (!userName || !pwd)
      return res.status(400).json({ success: false, message: "Username and password are required" });
    const result = await service.createUser({ userName, pwd, active: active ?? 1 });
    if (!result.success)
      return res.status(400).json({ success: false, message: result.responseMessage || "Failed to create user" });
    res.json({ success: true, message: result.responseMessage || "User created successfully", data: { userId: result.userId } });
  } catch (err) { next(err); }
};
 
exports.update = async (req, res, next) => {
  try {
    const uid    = Number(req.params.id);
    const result = await service.updateUser({ uid, ...req.body });
    res.json({ success: true, message: result?.ResponseMessage || "User updated successfully" });
  } catch (err) { next(err); }
};
 
exports.remove = async (req, res, next) => {
  try {
    const uid    = Number(req.params.id);
    const result = await service.deleteUser({ uid });
    res.json({ success: true, message: result?.ResponseMessage || "User deleted successfully" });
  } catch (err) { next(err); }
};
 
// ✅ NEW — restore
exports.restore = async (req, res, next) => {
  try {
    const uid    = Number(req.params.id);
    const result = await service.restoreUser({ uid });
    res.json({ success: true, message: result?.ResponseMessage || "User restored successfully" });
  } catch (err) { next(err); }
};
 
exports.getPermissions = async (req, res, next) => {
  try {
    const data = await service.getUserPermissions(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
 
exports.savePermissions = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== "object")
      return res.status(400).json({ success: false, message: "Permissions object required" });
    const result = await service.savePermissions(userId, permissions);
    res.json({ success: true, message: result?.ResponseMessage || "Permissions saved successfully" });
  } catch (err) { next(err); }
};