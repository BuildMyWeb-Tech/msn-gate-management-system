// repositories/authRepo.js
const { poolPromise, sql } = require("../database/sqlConnection");

// ─────────────────────────────────────────────────────────────
// Validate user login
// SP:     PR_Validate_UserLogin
// Params: @username VarChar, @password VarChar, @companycode VarChar
// Returns: ResponseCode (100=success), ResponseMessage, companyid (Int), Userid (Int)
// ─────────────────────────────────────────────────────────────
async function validateUser(username, password, companyCode) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("username",    sql.VarChar, String(username))
    .input("password",    sql.VarChar, String(password))
    .input("companycode", sql.VarChar, String(companyCode))
    .execute("PR_Validate_UserLogin");

  return result.recordset[0];
}

// ─────────────────────────────────────────────────────────────
// Get gates list for mobile login screen dropdown
// SP: PR_Get_ValidGates_forMobileLogin
// Param: @companyid int  (confirmed by manager)
// Used on: Login page — Gate dropdown (mobile only)
// ─────────────────────────────────────────────────────────────
async function getGatesForLogin(companyCode) {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("companyid", sql.Int, Number(companyCode))
      .execute("PR_Get_ValidGates_forMobileLogin");
    return result.recordset;
  } catch (err) {
    console.warn("PR_Get_ValidGates_forMobileLogin error:", err.message);
    return [];
  }
}

module.exports = { validateUser, getGatesForLogin };