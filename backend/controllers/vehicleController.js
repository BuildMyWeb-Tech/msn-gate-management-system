const service = require("../services/vehicleService");

exports.getAll = async (req, res, next) => {
  try {
    const { companyId, gateId } = req.gmsUser;
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const data = await service.getVehicles({ companyId, gateId, date });
    res.json({ success:true, data });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const data = await service.getVehicleById({ companyId, uid:req.params.id });
    if (!data) return res.status(404).json({ success:false, message:"Vehicle not found" });
    res.json({ success:true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { companyId, gateId, userId } = req.gmsUser;
    const result = await service.createVehicle({ companyId, gateId, userId, body:req.body });
    res.json({ success:true, message: result?.ResponseMessage || "Vehicle registered" });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyId, gateId, userId } = req.gmsUser;
    const result = await service.updateVehicle({ companyId, gateId, userId, uid:req.params.id, body:req.body });
    res.json({ success:true, message: result?.ResponseMessage || "Vehicle updated" });
  } catch (err) { next(err); }
};

exports.markOut = async (req, res, next) => {
  try {
    const { companyId, userId } = req.gmsUser;
    const result = await service.markVehicleOut({ companyId, userId, uid:req.params.id, body:req.body });
    res.json({ success:true, message: result?.ResponseMessage || "Vehicle checked out" });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await service.deleteVehicle({ uid:req.params.id });
    res.json({ success:true, message: result?.ResponseMessage || "Vehicle deleted" });
  } catch (err) { next(err); }
};