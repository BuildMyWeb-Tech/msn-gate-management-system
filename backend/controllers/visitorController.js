const service = require("../services/visitorService");

exports.getAll = async (req, res, next) => {
  try {
    const { companyId, gateId: userGateId } = req.gmsUser;
    const date   = req.query.date   || new Date().toISOString().split("T")[0];
    // Frontend sends gateId in query (0 for desktop/all, actual id for mobile)
    const gateId = req.query.gateId !== undefined
      ? Number(req.query.gateId)
      : (userGateId || 0);
    const data = await service.getVisitors({ companyId, gateId, date });
    res.json({ success:true, data });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const data = await service.getVisitorById({ companyId, uid:req.params.id });
    if (!data) return res.status(404).json({ success:false, message:"Visitor not found" });
    res.json({ success:true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { companyId, gateId, userId } = req.gmsUser;
    const result = await service.createVisitor({ companyId, gateId, userId, body:req.body });
    res.json({ success:true, message: result?.ResponseMessage || "Visitor registered" });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { companyId, gateId, userId } = req.gmsUser;
    const result = await service.updateVisitor({ companyId, gateId, userId, uid:req.params.id, body:req.body });
    res.json({ success:true, message: result?.ResponseMessage || "Visitor updated" });
  } catch (err) { next(err); }
};

exports.markOut = async (req, res, next) => {
  try {
    const { companyId, userId } = req.gmsUser;
    const result = await service.markVisitorOut({ companyId, userId, uid:req.params.id, body:req.body });
    res.json({ success:true, message: result?.ResponseMessage || "Visitor checked out" });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await service.deleteVisitor({ uid:req.params.id });
    res.json({ success:true, message: result?.ResponseMessage || "Visitor deleted" });
  } catch (err) { next(err); }
};

// GET /api/visitors/mobile/:mobile — PR_Validate_Mobileno
exports.getByMobile = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const data = await service.getVisitorByMobile({
      mobile:    req.params.mobile,
      companyId,
    });
    if (!data) return res.json({ success:false, message:"No visitor found for this mobile" });
    res.json({ success:true, data });
  } catch (err) { next(err); }
};

// GET /api/visitors/search?q=xxx — PR_Search_Visitors
exports.search = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const str = req.query.q || "";
    if (!str.trim()) return res.json({ success:true, data:[] });
    const data = await service.searchAllVisitors({ str, companyId });
    res.json({ success:true, data });
  } catch (err) { next(err); }
};


// PR_Validate_Mobileno — GET /api/visitors/validate-mobile?mobile=9876543210
exports.validateMobile = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const { mobile }    = req.query;
    if (!mobile) return res.status(400).json({ success:false, message:"mobile required" });
    const data = await service.validateMobile({ mobile, companyId });
    res.json({ success:true, found: Boolean(data), data });
  } catch (err) { next(err); }
};

// PR_Search_Visitors — GET /api/visitors/search?str=Naren
exports.searchAll = async (req, res, next) => {
  try {
    const { companyId } = req.gmsUser;
    const { str }       = req.query;
    if (!str) return res.json({ success:true, data:[] });
    const data = await service.searchVisitors({ str, companyId });
    res.json({ success:true, data });
  } catch (err) { next(err); }
};