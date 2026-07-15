// controllers/visitorController.js
const service = require("../services/visitorService");

exports.getAll = async (req, res, next) => {
  try {
    const { companyId, gateId } = req.gmsUser;
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const data = await service.getVisitors({ companyId, date });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getByMobile = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const data = await service.getVisitorByMobile({ companyId, mobile: req.params.mobile });
    res.json({ success: true, data: data || null });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const data = await service.getVisitorById({ companyId, uid: Number(req.params.id) });
    if (!data) return res.status(404).json({ success: false, message: "Visitor not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { companyId, gateId } = req.gmsUser;
    const result = await service.createVisitor({ companyId, gateId, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || "Visitor registered successfully", passNo: result?.passNo });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const result = await service.updateVisitor({ companyId, uid: req.params.id, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || "Visitor updated" });
  } catch (err) { next(err); }
};

exports.markOut = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const result = await service.markVisitorOut({ companyId, uid: req.params.id });
    res.json({ success: true, message: result?.ResponseMessage || "Visitor checked out" });
  } catch (err) { next(err); }
};
