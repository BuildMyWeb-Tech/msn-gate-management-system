// repositories/authRepo.js
const { poolPromise, sql } = require('../database/sqlConnection');

async function validateUser(username, password, companyCode) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input('username', sql.VarChar, String(username))
    .input('password', sql.VarChar, String(password))
    .input('companycode', sql.VarChar, String(companyCode))
    .execute('PR_Validate_UserLogin');
  return result.recordset[0];
}

// ─────────────────────────────────────────────────────────────
// PR_Get_ValidGates_forMobileLogin
// @companyid int — confirmed by manager
// ─────────────────────────────────────────────────────────────
async function getGatesForLogin(companyId) {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('companyid', sql.Int, Number(companyId))
      .execute('PR_Get_ValidGates_forMobileLogin');

    const rows = result.recordset || [];
    // Print exact SP response so we know column names
    console.log('[getGatesForLogin] count:', rows.length);
    if (rows.length > 0) {
      console.log('[getGatesForLogin] columns:', Object.keys(rows[0]));
      console.log('[getGatesForLogin] first row:', JSON.stringify(rows[0]));
    }
    return rows;
  } catch (err) {
    console.error('[getGatesForLogin] SP error:', err.message);
    return [];
  }
}

module.exports = { validateUser, getGatesForLogin };
