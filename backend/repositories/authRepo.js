const { poolPromise, sql } = require("../database/sqlConnection");

// Desktop login — PR_Validate_UserLogin
async function validateUserLogin({ username, password, companyCode }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("username",    sql.VarChar(100), username)
    .input("password",    sql.VarChar(100), password)
    .input("companycode", sql.VarChar(50),  String(companyCode))
    .execute("PR_Validate_UserLogin");
  return result.recordset || [];
}

// Mobile login — PR_AppValidate_SecurityLogin
async function validateSecurityLogin({ username, password, companyCode }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("UserName",    sql.NVarChar(50),  String(username))
    .input("Password",    sql.NVarChar(50),  String(password))
    .input("companycode", sql.NVarChar(100), String(companyCode))
    .execute("PR_AppValidate_SecurityLogin");
  return result.recordset || [];
}

// Gate list — PR_Get_ValidGates_forMobileLogin
async function getGatesForLogin(companyId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("companyid", sql.Int, Number(companyId))
    .execute("PR_Get_ValidGates_forMobileLogin");
  return result.recordset || [];
}

// Desktop menus — PR_Get_UserMenus
async function getUserMenus(userId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("userid", sql.Int, Number(userId))
    .execute("PR_Get_UserMenus");
  return result.recordset || [];
}

// Mobile menus — PR_GetApp_UserMenus
async function getAppUserMenus(userId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Userid", sql.Int, Number(userId))
    .execute("PR_GetApp_UserMenus");
  return result.recordset || [];
}

module.exports = {
  validateUserLogin,
  validateSecurityLogin,
  getGatesForLogin,
  getUserMenus,
  getAppUserMenus,
};
