// controllers/vehicleController.js
const service = require("../services/vehicleService");

exports.getAll = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const data = await service.getVehicles({ companyId, date });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const data = await service.getVehicleById({ companyId, uid: Number(req.params.id) });
    if (!data) return res.status(404).json({ success: false, message: "Vehicle not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { companyId, gateId } = req.gmsUser;
    const result = await service.createVehicle({ companyId, gateId, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || "Vehicle registered", passNo: result?.passNo });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const result = await service.updateVehicle({ companyId, uid: req.params.id, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || "Vehicle updated" });
  } catch (err) { next(err); }
};

exports.markOut = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const result = await service.markVehicleOut({ companyId, uid: req.params.id });
    res.json({ success: true, message: result?.ResponseMessage || "Vehicle checked out" });
  } catch (err) { next(err); }
};
