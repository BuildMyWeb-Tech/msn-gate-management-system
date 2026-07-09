const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const AdminUser = require('../models/AdminUser');


// ─────────────────────────────────────────────────────────────
// 🟢 1. ERP SIMPLE AUTH (FOR SQL APIs - NEW)
// ─────────────────────────────────────────────────────────────
const erpProtect = (req, res, next) => {
  try {
    const userId = req.headers["userid"];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - userId missing"
      });
    }

    req.erpUser = { userId: parseInt(userId) };
    next();

  } catch (err) {
    console.error("erpProtect error:", err);
    return res.status(500).json({
      success: false,
      message: "ERP authentication error"
    });
  }
};


// ─────────────────────────────────────────────────────────────
// 🔐 2. COMPANY USER JWT AUTH (EXISTING)
// ─────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer '))
      token = req.headers.authorization.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'printmixbox',
        audience: 'printmixbox-client',
      });
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'TOKEN_INVALID'
      });
    }

    const [user, company] = await Promise.all([
      User.findById(decoded.userId),
      Company.findById(decoded.companyId),
    ]);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive.'
      });
    }

    if (!company || !company.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Company account inactive.'
      });
    }

    req.user = {
      userId: decoded.userId,
      companyId: decoded.companyId,
      username: decoded.username,
      role: decoded.role
    };

    next();

  } catch (err) {
    console.error('protect middleware:', err);
    return res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};


// ─────────────────────────────────────────────────────────────
// 🛡️ 3. ADMIN JWT AUTH (EXISTING)
// ─────────────────────────────────────────────────────────────
const adminProtect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer '))
      token = req.headers.authorization.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Admin access denied. No token.'
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET,
        {
          issuer: 'printmixbox-admin',
          audience: 'printmixbox-admin-panel'
        }
      );
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Admin session expired.',
          code: 'TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid admin token.'
      });
    }

    const admin = await AdminUser.findById(decoded.adminId);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found or inactive.'
      });
    }

    req.admin = {
      adminId: decoded.adminId,
      username: decoded.username,
      role: decoded.role
    };

    next();

  } catch (err) {
    console.error('adminProtect middleware:', err);
    return res.status(500).json({
      success: false,
      message: 'Admin authentication error.'
    });
  }
};


// ─────────────────────────────────────────────────────────────
// 🔐 4. ROLE-BASED AUTHORIZATION
// ─────────────────────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}.`
    });
  }
  next();
};


// ─────────────────────────────────────────────────────────────
// 📦 EXPORTS
// ─────────────────────────────────────────────────────────────
module.exports = {
  protect,
  adminProtect,
  authorize,
  erpProtect   // 👈 NEW (USE THIS FOR SQL APIs)
};