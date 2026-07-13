// services/authService.js
const authRepo = require("../repositories/authRepo");

// ─────────────────────────────────────────────────────────────
// Login
// companyCode (VarChar) e.g. "514670"  → passed to SP as-is
// SP returns companyid (Int) e.g. 1    → stored in session, passed to all future SPs
// ─────────────────────────────────────────────────────────────
async function login(username, password, companyCode) {
  const result = await authRepo.validateUser(username, password, companyCode);

  if (result?.ResponseCode === 100) {
    return {
      success:         true,
      userId:          result.Userid,
      userName:        result.UserName   || username,
      companyCode:     String(companyCode),         // original login code e.g. "514670"
      companyId:       result.companyid  ?? result.Companyid ?? 1,  // internal DB int id e.g. 1
      gateId:          result.GateId     || null,
      gateName:        result.GateName   || null,
    };
  }

  return {
    success: false,
    message: result?.ResponseMessage || "Invalid username or password",
  };
}

// ─────────────────────────────────────────────────────────────
// Get gates for login dropdown
// ─────────────────────────────────────────────────────────────
async function getGatesForLogin(companyCode) {
  const rows = await authRepo.getGatesForLogin(companyCode);
  return rows.map((r) => ({
    id:   r.Uid      ?? r.uid,
    code: r.GateCode ?? r.gateCode ?? "",
    name: r.GateName ?? r.gateName ?? "",
  }));
}

module.exports = { login, getGatesForLogin };
