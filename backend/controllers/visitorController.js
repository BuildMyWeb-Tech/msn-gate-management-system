// controllers/visitorController.js
const service = require("../services/visitorService");

exports.getAll = async (req, res, next) => {
  try {
    const { companyCode, gateId } = req.gmsUser;
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const data = await service.getVisitors({ companyCode, date });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getByMobile = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const { mobile }      = req.params;
    const data            = await service.getVisitorByMobile({ companyCode, mobile });
    res.json({ success: true, data: data || null });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const uid             = Number(req.params.id);
    const data            = await service.getVisitorById({ companyCode, uid });
    if (!data) return res.status(404).json({ success: false, message: "Visitor not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { companyCode, gateId } = req.gmsUser;
    const result = await service.createVisitor({ companyCode, gateId, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || "Visitor registered successfully", passNo: result?.passNo });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const uid             = req.params.id;
    const result          = await service.updateVisitor({ companyCode, uid, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || "Visitor updated successfully" });
  } catch (err) { next(err); }
};

exports.markOut = async (req, res, next) => {
  try {
    const { companyCode } = req.gmsUser;
    const uid             = req.params.id;
    const result          = await service.markVisitorOut({ companyCode, uid });
    res.json({ success: true, message: result?.ResponseMessage || "Visitor checked out successfully" });
  } catch (err) { next(err); }
};
