// controllers/authController.js
const authService = require('../services/authService');

const DEFAULT_COMPANY_CODE = process.env.DEFAULT_COMPANY_CODE || '514670';

exports.login = async (req, res, next) => {
  try {
    const { username, password, gateId } = req.body;
    const companyCode = String(req.body.companyCode || DEFAULT_COMPANY_CODE);
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Username and password are required' });
    }
    const result = await authService.login(username, password, companyCode);
    if (!result.success) {
      return res.status(401).json({ success: false, message: result.message });
    }
    return res.json({
      success: true,
      data: {
        userId: result.userId,
        userName: result.userName,
        companyCode: result.companyCode,
        companyId: result.companyId,
        gateId: gateId || result.gateId,
        gateName: result.gateName,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getGates = async (req, res, next) => {
  try {
    const companyCode = String(req.query.companyCode || DEFAULT_COMPANY_CODE);
    console.log('[getGates controller] companyCode:', companyCode);
    const gates = await authService.getGatesForLogin(companyCode);
    console.log('[getGates controller] returning gates:', JSON.stringify(gates));
    return res.json({ success: true, data: gates });
  } catch (err) {
    next(err);
  }
};
