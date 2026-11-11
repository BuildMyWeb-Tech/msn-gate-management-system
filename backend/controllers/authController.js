const service = require("../services/authService");

// POST /api/auth/login — desktop login
exports.login = async (req, res, next) => {
  try {
    const { username, password, companyCode } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success:false, message:"Username and password required" });
    }
    const data = await service.loginUser({
      username, password,
      companyCode: String(companyCode || "514670"),
    });
    res.json({ success:true, data });
  } catch(err) { next(err); }
};

// POST /api/auth/mobile-login — mobile/security login using PR_AppValidate_SecurityLogin
exports.mobileLogin = async (req, res, next) => {
  try {
    console.log("[mobileLogin] Content-Type:", req.headers["content-type"]);
    console.log("[mobileLogin] req.body:", JSON.stringify(req.body));
    const { username, password, companyCode, gateId, gateName } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success:false, message:"Username and password required", received: req.body });
    }
    console.log("[mobileLogin] username:", username, "gateId:", gateId);
    const data = await service.loginSecurity({
      username, password,
      companyCode: String(companyCode || "514670"),
      gateId, gateName,
    });
    res.json({ success:true, data });
  } catch(err) { next(err); }
};

// GET /api/auth/gates?companyCode=514670
exports.getGates = async (req, res, next) => {
  try {
    const companyCode = req.query.companyCode || "514670";
    console.log("[getGates controller] companyCode:", companyCode);
    const gates = await service.getGatesForLogin(companyCode);
    console.log("[getGates controller] returning gates:", JSON.stringify(gates));
    res.json({ success:true, data:gates });
  } catch(err) { next(err); }
};

// GET /api/auth/company?shortname=msn
exports.getCompanyByShortname = async (req, res, next) => {
  try {
    const { shortname } = req.query;
    if (!shortname?.trim()) {
      return res.status(400).json({ success:false, message:"shortname is required" });
    }
    const company = await service.getCompanyByShortname(shortname.trim());
    console.log("[getCompany] shortname:", shortname, "| resolved:", JSON.stringify(company));
    if (!company || !company.companyId) {
      return res.status(404).json({ success:false, message:"Company not found" });
    }
    res.json({ success:true, data:company });
  } catch(err) {
    console.error("[getCompany] SP error:", err.message);
    next(err);
  }
};