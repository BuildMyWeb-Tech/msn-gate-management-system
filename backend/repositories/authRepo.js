// repositories/authRepo.js
const { poolPromise, sql } = require("../database/sqlConnection");

// ─────────────────────────────────────────────────────────────
// Validate user login
// SP: PR_Validate_UserLogin
// Returns: ResponseCode (100=success), ResponseMessage, Userid
// ─────────────────────────────────────────────────────────────
async function validateUser(username, password, companyCode) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("username",   sql.VarChar, username)
    .input("password",   sql.VarChar, password)
    .input("companyid",  sql.Int,     companyCode)
    .execute("PR_Validate_UserLogin");

  return result.recordset[0];
}

// ─────────────────────────────────────────────────────────────
// Get gates list for login screen dropdown
// SP: PR_Get_Gates_ForLogin  ← manager needs to create this
// Fallback: returns empty array if SP not yet available
// ─────────────────────────────────────────────────────────────
async function getGatesForLogin(companyCode) {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("companyid", sql.Int, companyCode)
      .execute("PR_Get_Gates_ForLogin");
    return result.recordset;
  } catch (err) {
    // SP not yet created — return empty array so login page still loads
    console.warn("PR_Get_Gates_ForLogin not found — returning empty gates list");
    return [];
  }
}

module.exports = { validateUser, getGatesForLogin };