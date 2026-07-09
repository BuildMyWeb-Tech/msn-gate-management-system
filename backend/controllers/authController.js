// controllers/authController.js
const authService = require("../services/authService");

const DEFAULT_COMPANY_CODE = parseInt(process.env.DEFAULT_COMPANY_CODE) || 1;

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { username, password, companyCode, gateId }
// ─────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { username, password, companyCode, gateId } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const code   = companyCode || DEFAULT_COMPANY_CODE;
    const result = await authService.login(username, password, code);

    if (!result.success) {
      return res.status(401).json({ success: false, message: result.message });
    }

    return res.json({
      success:     true,
      data: {
        userId:      result.userId,
        userName:    result.userName,
        companyCode: result.companyCode,
        gateId:      gateId || result.gateId,
        gateName:    result.gateName,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/gates?companyCode=1
// Returns gates list for login screen dropdown
// ─────────────────────────────────────────────────────────────
exports.getGates = async (req, res, next) => {
  try {
    const companyCode = parseInt(req.query.companyCode) || DEFAULT_COMPANY_CODE;
    const gates       = await authService.getGatesForLogin(companyCode);
    return res.json({ success: true, data: gates });
  } catch (err) {
    next(err);
  }
};
