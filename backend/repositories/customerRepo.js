const { poolPromise, sql } = require("../database/sqlConnection");
 
// GET GRID → PR_GetPartyM_FrontGrid
async function getCustomerGrid(active) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("ptype",  sql.Int, 2)
    .input("active", sql.Bit, active)
    .execute("PR_GetPartyM_FrontGrid");
  return result.recordset;
}
 
// GET FOR EDIT → PR_GetPartyM_ForEdit
async function getCustomerForEdit(uid) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Uid", sql.BigInt, uid)
    .execute("PR_GetPartyM_ForEdit");
  return result.recordset[0] || null;
}
 
// INSERT / UPDATE → PR_IU_PartyM (renamed by manager from PR_IUD_PartyM)
async function iuCustomer(jsonData) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("json", sql.NVarChar(sql.MAX), jsonData)
    .execute("PR_IU_PartyM");
  return result.recordset;
}
 
// ✅ DELETE / RESTORE → PR_Delete_PartyM @Uid bigint, @Status int
//   Status = 0 → soft delete (inactive)
//   Status = 1 → restore (active)
async function deleteRestoreCustomer(uid, status) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Uid",    sql.BigInt, uid)
    .input("Status", sql.Int,    status)
    .execute("PR_Delete_PartyM");
  return result.recordset[0] ?? null;
}
 
module.exports = { getCustomerGrid, getCustomerForEdit, iuCustomer, deleteRestoreCustomer };
 