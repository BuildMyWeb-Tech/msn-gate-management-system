// middleware/authMiddleware.js
// Two company identifiers in this system:
//   companyCode  (VarChar) = login code e.g. "514670" — used for login SP only
//   companyId    (Int)     = internal DB id e.g. 1    — used for ALL other SPs
// Frontend stores both after login and sends companyId in "companyid" header

const DEFAULT_COMPANY_ID = parseInt(process.env.DEFAULT_COMPANY_CODE) || 1;

// ─────────────────────────────────────────────────────────────
// GMS PROTECT — validates userid + companyid headers
// All protected API calls must pass these headers
// ─────────────────────────────────────────────────────────────
const gmsProtect = (req, res, next) => {
  try {
    const userId    = req.headers["userid"];
    const companyId = req.headers["companyid"] || DEFAULT_COMPANY_ID;
    const gateId    = req.headers["gateid"]    || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — userid header missing",
      });
    }

    req.gmsUser = {
      userId:    parseInt(userId),
      companyId: parseInt(companyId),   // always Int for SP calls
      gateId:    gateId ? parseInt(gateId) : null,
    };

    next();
  } catch (err) {
    console.error("gmsProtect error:", err);
    return res.status(500).json({ success: false, message: "Authentication error" });
  }
};

// ─────────────────────────────────────────────────────────────
// ERROR HANDLERS
// ─────────────────────────────────────────────────────────────
const notFound = (req, res, next) => {
  const err   = new Error(`Route not found: ${req.originalUrl}`);
  err.status  = 404;
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
