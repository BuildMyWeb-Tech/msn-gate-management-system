const { poolPromise, sql } = require("../database/sqlConnection");

// ✅ GET ALL MENUS
async function getUserMenus(userId) {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("userid", sql.Int, userId)
    .execute("PR_Get_UserMenus");

  return result.recordset;
}


// ✅ GET PERMISSION FOR ONE MENU
async function getMenuRights(userId, menuDid) {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("Userid", sql.Int, userId)
    .input("Menudid", sql.Int, menuDid) // 🔥 REQUIRED
    .execute("PR_Get_MenuRights_ForUser");

  return result.recordset[0]; // single row
}

module.exports = {
  getUserMenus,
  getMenuRights
};