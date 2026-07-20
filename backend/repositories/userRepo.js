// repositories/userRepo.js
const { poolPromise, sql } = require("../database/sqlConnection");

async function getUsers({ companyId, tag }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int, companyId)
    .input("Tag",       sql.Int, tag)
    .execute("PR_Get_Users_ForFrontgrid");
  return result.recordset;
}

async function iudUser({ companyId, mode, uid, userName, pwd, active }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int,          companyId)
    .input("Mode",      sql.Int,          mode)
    .input("Userid",    sql.Int,          uid      || 0)
    .input("UserName",  sql.NVarChar(30), userName || "")
    .input("Pwd",       sql.NVarChar(30), pwd      || "")
    .input("active",    sql.Bit,          active   ?? 1)
    .execute("PR_IUD_UserM");
  return result.recordset;
}

async function undeleteUserById({ companyId, uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int, companyId)
    .input("Uid",       sql.Int, uid)
    .execute("PR_UnDelete_UserM");
  return result.recordset[0] ?? null;
}

// ─────────────────────────────────────────────────────────────
// PR_Get_MenuData_ForUsermanagement
// Manager confirmed: only @Userid needed — NO @companyid
// Returns 2 recordsets:
//   [0] menus:  { menumuid, menuname, menudid, SubMenuName }
//   [1] rights: { UID, UserUid, MenuDUid, MRead, MWrite, MUpdate, MDelete, MPrint }
// ─────────────────────────────────────────────────────────────
async function getUserPermissions({ companyId, userId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("Userid", sql.Int, userId)
    .execute("PR_Get_MenuData_ForUsermanagement");
  return {
    menus:  result.recordsets[0] || [],
    rights: result.recordsets[1] || [],
  };
}

// ─────────────────────────────────────────────────────────────
// PR_Insert_UserMenus
// From Excel: only @json parameter
// SP uses OPENJSON internally to parse
// JSON format: { userId, permissions: { [menuDUid]: { MWrite, MRead, MUpdate, MDelete, MPrint } } }
// ─────────────────────────────────────────────────────────────
async function savePermissions({ companyId, json }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("json", sql.NVarChar(sql.MAX), json)
    .execute("PR_Insert_UserMenus");
  return result.recordset || [];
}

async function getUserMenus({ companyId, userId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    // SP only takes @userid — no @companyid (same pattern as PR_Get_MenuData_ForUsermanagement)
    .input("userid", sql.Int, userId)
    .execute("PR_Get_UserMenus");
  return result.recordset;
}

async function getMenuRights({ companyId, userId, menuDid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int, companyId)
    .input("Userid",    sql.Int, userId)
    .input("Menudid",   sql.Int, menuDid)
    .execute("PR_Get_MenuRights_ForUser");
  return result.recordset[0];
}

module.exports = {
  getUsers, iudUser, undeleteUserById,
  getUserPermissions, savePermissions,
  getUserMenus, getMenuRights,
};