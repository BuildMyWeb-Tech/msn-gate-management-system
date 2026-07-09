// controllers/vehicleController.js
const service = require("../services/vehicleService");

exports.getAll = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const data = await service.getVehicles({ companyCode, date });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const uid             = Number(req.params.id);
    const data            = await service.getVehicleById({ companyCode, uid });
    if (!data) return res.status(404).json({ success: false, message: "Vehicle not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { companyCode, gateId } = req.gmsUser;
    const result = await service.createVehicle({ companyCode, gateId, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || "Vehicle registered successfully", passNo: result?.passNo });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const uid             = req.params.id;
    const result          = await service.updateVehicle({ companyCode, uid, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || "Vehicle updated successfully" });
  } catch (err) { next(err); }
};

exports.markOut = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const uid             = req.params.id;
    const result          = await service.markVehicleOut({ companyCode, uid });
    res.json({ success: true, message: result?.ResponseMessage || "Vehicle checked out successfully" });
  } catch (err) { next(err); }
};
