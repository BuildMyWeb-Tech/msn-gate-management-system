// services/authService.js
const authRepo = require("../repositories/authRepo");

async function login(username, password, companyCode) {
  const result = await authRepo.validateUser(username, password, companyCode);
  if (result?.ResponseCode === 100) {
    return {
      success:     true,
      userId:      result.Userid,
      userName:    result.UserName   || username,
      companyCode: String(companyCode),
      companyId:   result.companyid  ?? result.Companyid ?? 1,
      gateId:      result.GateId     || null,
      gateName:    result.GateName   || null,
    };
  }
  return {
    success: false,
    message: result?.ResponseMessage || "Invalid username or password",
  };
}

async function getGatesForLogin(companyCode) {
  const rows = await authRepo.getGatesForLogin(companyCode);
  // Log to see what columns SP actually returns
  console.log("[getGatesForLogin] rows:", JSON.stringify(rows?.slice(0, 2)));

  return rows.map(r => ({
    // Try all possible column name variations SP might return
    id:   r.Uid      ?? r.uid      ?? r.GateId   ?? r.gateid   ??
          r.GateUID  ?? r.gateUID  ?? r.Id        ?? r.id       ?? 0,
    code: r.GateCode ?? r.gateCode ?? r.Code      ?? r.code     ??
          r.GCode    ?? r.gcode    ?? "",
    name: r.GateName ?? r.gateName ?? r.Name      ?? r.name     ??
          r.GName    ?? r.gname    ?? r.Gate       ?? r.gate     ?? "",
  })).filter(g => g.id !== 0 || g.name !== ""); // filter empty rows
}

module.exports = { login, getGatesForLogin };