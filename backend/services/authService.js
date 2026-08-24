const repo = require("../repositories/authRepo");
const jwt  = require("jsonwebtoken");

const JWT_SECRET  = process.env.JWT_SECRET  || "msn-gms-secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "8h";

// ── Desktop login ─────────────────────────────────────────────
async function loginUser({ username, password, companyCode }) {
  const rows = await repo.validateUserLogin({ username, password, companyCode });
  const row  = rows.find(r => r.ResponseCode === 100 || r.ResponseCode === 101 || r.userid || r.Userid);
  if (!row || (row.ResponseCode && row.ResponseCode > 101)) {
    throw Object.assign(new Error(row?.ResponseMessage || "Invalid credentials"), { status:401 });
  }
  const userId    = Number(row.userid ?? row.Userid ?? 0);
  const companyId = Number(row.companyid ?? row.Companyid ?? 1);
  const token = jwt.sign(
    { userId, companyId, loginType:"desktop" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
  return { token, userId, companyId, userName: row.username ?? row.UserName ?? username, loginType:"desktop" };
}

// ── Mobile login (security guard) ────────────────────────────
async function loginSecurity({ username, password, companyCode, gateId, gateName }) {
  const rows = await repo.validateSecurityLogin({ username, password, companyCode });

  // Accept ResponseCode 100 or 101 as success
  const row = rows.find(r => r.ResponseCode === 100 || r.ResponseCode === 101);

  if (!row) {
    const msg = rows[0]?.ResponseMessage || "Invalid credentials";
    console.log("[loginSecurity] Failed for:", username, "ResponseCode:", rows[0]?.ResponseCode, "Msg:", msg);
    throw Object.assign(new Error(msg), { status:401 });
  }

  const userId    = Number(row.Userid ?? row.userid ?? 0);
  const companyId = Number(row.companyid ?? row.Companyid ?? 1);
  // Get security guard's name from SP
  const sname     = row.Sname ?? row.sname ?? row.SName ?? null;

  console.log("[loginSecurity] Success:", username, "userId:", userId, "Sname:", sname);

  // Get mobile menus
  const menuRows = await repo.getAppUserMenus(userId);
  const menus = menuRows
    .filter(r => r.ResponseCode === 100 || r.ResponseCode === 101 || r.menuname)
    .map(r => ({ menumuid: r.menumuid, menuname: r.menuname }));

  const token = jwt.sign(
    { userId, companyId, gateId: Number(gateId)||0, loginType:"mobile" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return {
    token,
    userId,
    companyId,
    userName:  sname || username,
    gateId:    Number(gateId) || 0,
    gateName:  gateName || "",
    loginType: "mobile",
    menus,
  };
}

// ── Gate list ─────────────────────────────────────────────────
async function getGatesForLogin(companyCode) {
  const companyId = 1;
  const rows = await repo.getGatesForLogin(companyId);
  return rows
    .filter(r => r.gateid || r.gname)
    .map(r => ({
      id:   String(r.gateid ?? r.GateId ?? ""),
      name: r.gname ?? r.GateName ?? "",
      code: r.gcode ?? r.GateCode ?? "",
    }));
}

async function getUserMenus(userId) {
  return repo.getUserMenus(userId);
}

module.exports = { loginUser, loginSecurity, getGatesForLogin, getUserMenus };