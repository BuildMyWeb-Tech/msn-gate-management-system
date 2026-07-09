// services/authService.js
const authRepo = require("../repositories/authRepo");

// ─────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────
async function login(username, password, companyCode) {
  const result = await authRepo.validateUser(username, password, companyCode);

  if (result?.ResponseCode === 100) {
    return {
      success:     true,
      userId:      result.Userid,
      userName:    result.UserName  || username,
      companyCode: companyCode,
      gateId:      result.GateId   || null,
      gateName:    result.GateName || null,
    };
  }

  return {
    success: false,
    message: result?.ResponseMessage || "Invalid credentials",
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
