// repositories/authRepo.js
const { poolPromise, sql } = require("../database/sqlConnection");

// ─────────────────────────────────────────────────────────────
// Validate user login
// SP: PR_Validate_UserLogin
// Params: @username VarChar, @password VarChar, @companycode VarChar
// Returns: ResponseCode(100=success), ResponseMessage, companyid(Int), Userid(Int)
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
// Get gates for mobile login dropdown
// SP: PR_Get_ValidGates_forMobileLogin
// Param: @companyid int
// ─────────────────────────────────────────────────────────────
async function getGatesForLogin(companyCode) {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("companyid", sql.Int, Number(companyCode))
      .execute("PR_Get_ValidGates_forMobileLogin");

    // Log raw response to see exact column names
    console.log("[getGatesForLogin] raw:", JSON.stringify(result.recordset?.slice(0, 2)));
    return result.recordset || [];
  } catch (err) {
    console.warn("PR_Get_ValidGates_forMobileLogin error:", err.message);
    return [];
  }
}

module.exports = { validateUser, getGatesForLogin };