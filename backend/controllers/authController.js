// controllers/authController.js
const authService = require("../services/authService");

const DEFAULT_COMPANY_CODE = process.env.DEFAULT_COMPANY_CODE || "514670";

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { username, password, companyCode, gateId }
// ─────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { username, password, gateId } = req.body;
    const companyCode = String(req.body.companyCode || DEFAULT_COMPANY_CODE);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const result = await authService.login(username, password, companyCode);

    if (!result.success) {
      return res.status(401).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      data: {
        userId:      result.userId,
        userName:    result.userName,
        companyCode: result.companyCode,   // "514670" — login code
        companyId:   result.companyId,     // 1 — internal DB int id for SP calls
        gateId:      gateId || result.gateId,
        gateName:    result.gateName,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/gates?companyCode=514670
// ─────────────────────────────────────────────────────────────
exports.getGates = async (req, res, next) => {
  try {
    const companyCode = String(req.query.companyCode || DEFAULT_COMPANY_CODE);
    const gates       = await authService.getGatesForLogin(companyCode);
    return res.json({ success: true, data: gates });
  } catch (err) {
    next(err);
  }
};
