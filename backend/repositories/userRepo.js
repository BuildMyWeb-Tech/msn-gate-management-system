// repositories/userRepo.js
// Reused from previous project — extended with CompanyCode
const { poolPromise, sql } = require("../database/sqlConnection");

// GET users grid
async function getUsers({ companyCode, tag }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int, companyCode)
    .input("Tag",         sql.Int, tag)
    .execute("PR_Get_Users_ForFrontgrid");
  return result.recordset;
}

// INSERT / UPDATE / DELETE user
async function iudUser({ companyCode, mode, uid, userName, pwd, active }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,          companyCode)
    .input("Mode",        sql.Int,          mode)
    .input("Userid",      sql.Int,          uid       || 0)
    .input("UserName",    sql.NVarChar(30), userName  || "")
    .input("Pwd",         sql.NVarChar(30), pwd       || "")
    .input("active",      sql.Bit,          active    ?? 1)
    .execute("PR_IUD_UserM");
  return result.recordset;
}

// RESTORE deleted user
async function undeleteUser({ companyCode, uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int, companyCode)
    .input("Uid",         sql.Int, uid)
    .execute("PR_UnDelete_UserM");
  return result.recordset[0] ?? null;
}

// GET user permissions (menu data)
async function getUserPermissions({ companyCode, userId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int, companyCode)
    .input("Userid",      sql.Int, userId)
    .execute("PR_Get_MenuData_ForUsermanagement");
  return { menus: result.recordsets[0], rights: result.recordsets[1] };
}

// SAVE user permissions
async function savePermissions({ companyCode, json }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,                companyCode)
    .input("json",        sql.NVarChar(sql.MAX),  json)
    .execute("PR_Insert_UserMenus");
  return result.recordset;
}

// RESTORE deleted user
async function undeleteUserById({ companyCode, uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int, companyCode)
    .input("Uid",         sql.Int, uid)
    .execute("PR_UnDelete_UserM");
  return result.recordset[0] ?? null;
}

// GET menus for sidebar
async function getUserMenus({ companyCode, userId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int, companyCode)
    .input("userid",      sql.Int, userId)
    .execute("PR_Get_UserMenus");
  return result.recordset;
}

// GET menu rights per submenu
async function getMenuRights({ companyCode, userId, menuDid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int, companyCode)
    .input("Userid",      sql.Int, userId)
    .input("Menudid",     sql.Int, menuDid)
    .execute("PR_Get_MenuRights_ForUser");
  return result.recordset[0];
}

module.exports = {
  getUsers,
  iudUser,
  undeleteUser,
  undeleteUserById,
  getUserPermissions,
  savePermissions,
  getUserMenus,
  getMenuRights,
};
