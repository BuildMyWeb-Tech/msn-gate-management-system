// middleware/authMiddleware.js
// GMS uses simple header-based auth (userid + companycode)
// Same pattern as previous project but extended with companyCode + gateId

const DEFAULT_COMPANY_CODE = process.env.DEFAULT_COMPANY_CODE || 1;

// ─────────────────────────────────────────────────────────────
// GMS PROTECT — validates userid + companyCode headers
// All ERP/GMS API calls must pass these headers
// ─────────────────────────────────────────────────────────────
const gmsProtect = (req, res, next) => {
  try {
    const userId      = req.headers["userid"];
    const companyCode = req.headers["companycode"] || DEFAULT_COMPANY_CODE;
    const gateId      = req.headers["gateid"] || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — userId missing in headers",
      });
    }

    req.gmsUser = {
      userId:      parseInt(userId),
      companyCode: parseInt(companyCode),
      gateId:      gateId ? parseInt(gateId) : null,
    };

    next();
  } catch (err) {
    console.error("gmsProtect error:", err);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// ERROR HANDLER MIDDLEWARE
// ─────────────────────────────────────────────────────────────
const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
};

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[ERROR] ${status} — ${err.message}`);
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { gmsProtect, notFound, errorHandler };