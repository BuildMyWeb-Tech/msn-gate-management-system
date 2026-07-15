// controllers/setupController.js
const service = require("../services/setupService");

exports.getData = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const tag  = req.query.tag === "0" ? 0 : 1;
    const data = await service.getSetupData({
      companyId, typeStr: req.params.setupType, tag,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getDropdown = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const data = await service.getDropdown({
      companyId, typeStr: req.params.setupType,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { companyId, userId } = req.gmsUser;
    const result = await service.createSetup({
      companyId, userId, typeStr: req.params.setupType, body: req.body,
    });
    res.json({ success: true, message: result?.ResponseMessage || "Created successfully" });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyId, userId } = req.gmsUser;
    const result = await service.updateSetup({
      companyId, userId, typeStr: req.params.setupType,
      uid: req.params.id, body: req.body,
    });
    res.json({ success: true, message: result?.ResponseMessage || "Updated successfully" });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { companyId, userId } = req.gmsUser;
    const result = await service.deleteSetup({
      companyId, userId, typeStr: req.params.setupType, uid: req.params.id,
    });
    res.json({ success: true, message: result?.ResponseMessage || "Deleted successfully" });
  } catch (err) { next(err); }
};

exports.restore = async (req, res, next) => {
  try {
    const { companyId, userId } = req.gmsUser;
    const result = await service.restoreSetup({
      companyId, userId, typeStr: req.params.setupType, uid: req.params.id,
    });
    res.json({ success: true, message: result?.ResponseMessage || "Restored successfully" });
  } catch (err) { next(err); }
};