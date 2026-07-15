// middleware/authMiddleware.js
const DEFAULT_COMPANY_ID = parseInt(process.env.DEFAULT_COMPANY_ID) || 1;

// ─────────────────────────────────────────────────────────────
// GMS PROTECT
// Headers expected:
//   userid      — Int  (from login)
//   companyid   — Int  (from login response, e.g. 1)
//   gateid      — Int  (selected gate, optional)
//   devicetype  — String "mobile" | "desktop" (sent by frontend)
// ─────────────────────────────────────────────────────────────
const gmsProtect = (req, res, next) => {
  try {
    const userId     = req.headers["userid"];
    const companyId  = req.headers["companyid"]  || DEFAULT_COMPANY_ID;
    const gateId     = req.headers["gateid"]     || null;
    const deviceType = req.headers["devicetype"] || "desktop"; // "mobile" | "desktop"

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — userid header missing",
      });
    }

    req.gmsUser = {
      userId:     parseInt(userId),
      companyId:  parseInt(companyId),
      gateId:     gateId ? parseInt(gateId) : null,
      deviceType: deviceType.toLowerCase(), // "mobile" | "desktop"
      isMobile:   deviceType.toLowerCase() === "mobile",
    };

    next();
  } catch (err) {
    console.error("gmsProtect error:", err);
    return res.status(500).json({ success: false, message: "Authentication error" });
  }
};

const notFound = (req, res, next) => {
  const err  = new Error(`Route not found: ${req.originalUrl}`);
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