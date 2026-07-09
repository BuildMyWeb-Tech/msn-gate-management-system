// controllers/setupController.js
// Handles Gates, Securities, Designations, Locations
// Route param :setupType = "gates" | "securities" | "designations" | "locations"
const service = require("../services/setupService");

exports.getData = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const typeStr         = req.params.setupType;
    const tag             = req.query.tag === "0" ? 0 : 1;
    const data            = await service.getSetupData({ companyCode, typeStr, tag });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getDropdown = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const typeStr         = req.params.setupType;
    const data            = await service.getDropdown({ companyCode, typeStr });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const typeStr         = req.params.setupType;
    const result          = await service.createSetup({ companyCode, typeStr, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || "Created successfully" });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const typeStr         = req.params.setupType;
    const uid             = req.params.id;
    const result          = await service.updateSetup({ companyCode, typeStr, uid, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || "Updated successfully" });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const typeStr         = req.params.setupType;
    const uid             = req.params.id;
    const result          = await service.deleteSetup({ companyCode, typeStr, uid });
    res.json({ success: true, message: result?.ResponseMessage || "Deleted successfully" });
  } catch (err) { next(err); }
};

exports.restore = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const uid             = req.params.id;
    const result          = await service.restoreSetup({ companyCode, uid });
    res.json({ success: true, message: result?.ResponseMessage || "Restored successfully" });
  } catch (err) { next(err); }
};
