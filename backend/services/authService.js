// services/authService.js
const authRepo = require('../repositories/authRepo');

async function login(username, password, companyCode) {
  const result = await authRepo.validateUser(username, password, companyCode);
  if (result?.ResponseCode === 100) {
    return {
      success: true,
      userId: result.Userid,
      userName: result.UserName || username,
      companyCode: String(companyCode),
      companyId: result.companyid ?? result.Companyid ?? 1,
      gateId: result.GateId || null,
      gateName: result.GateName || null,
    };
  }
  return {
    success: false,
    message: result?.ResponseMessage || 'Invalid username or password',
  };
}

async function getGatesForLogin(companyCode) {
  const companyId = Number(process.env.DEFAULT_COMPANY_ID) || 1;
  const rows = await authRepo.getGatesForLogin(companyId);

  // Log ALL keys from first row so we know exact column names
  if (rows.length > 0) {
    console.log('[getGatesForLogin] ALL columns:', Object.keys(rows[0]));
    console.log('[getGatesForLogin] ALL rows:', JSON.stringify(rows));
  }

  return rows
    .filter((r) => {
      const keys = Object.keys(r);
      return keys.some((k) => !['ResponseCode', 'ResponseMessage'].includes(k));
    })
    .map((r) => {
      // Log each row to find the right column
      console.log('[getGatesForLogin] row:', JSON.stringify(r));

      // Try every possible variation
      const id =
        r.Uid ??
        r.uid ??
        r.GateId ??
        r.gateId ??
        r.GateUID ??
        r.gateUID ??
        r.GateMUID ??
        r.gateMUID ??
        r.Id ??
        r.id ??
        r.gateid ??
        r.GATEID ??
        0;

      const name =
        r.GateName ??
        r.gateName ??
        r.GName ??
        r.gname ??
        r.Name ??
        r.name ??
        r.Gate ??
        r.gate ??
        r.GATENAME ??
        r.gate_name ??
        r.GateCode ??
        r.gateCode ??
        r.GCode ??
        r.gcode ??
        '';

      return { id, name: name || `Gate ${id}`, code: r.GCode ?? r.gcode ?? '' };
    })
    .filter((g) => g.id !== 0 || g.name !== '');
}

module.exports = { login, getGatesForLogin };
