const { poolPromise: poolPromise2, sql: sql2 } = require("../database/sqlConnection");
 
async function getGeneralData(type, tag) {
  const pool = await poolPromise2;
  const result = await pool.request()
    .input("Gtypeuid", sql2.Int, type)
    .input("Tag",      sql2.Bit, tag)
    .execute("PR_GetGeneralMData_FrontGrid");
  return result.recordset;
}
 
async function iudGeneral({ mode, userId, gtypeuid, code, name, shortName, uid }) {
  const pool = await poolPromise2;
  const result = await pool.request()
    .input("Mode",      sql2.Int,           mode)
    .input("Userid",    sql2.Int,           userId)
    .input("GTypeMUid", sql2.Int,           gtypeuid)
    .input("gcode",     sql2.NVarChar(100), code      || "")
    .input("gname",     sql2.NVarChar(200), name      || "")
    .input("gsname",    sql2.NVarChar(80),  shortName || "")
    .input("Uid",       sql2.Int,           uid || 0)
    .execute("PR_IUD_GeneralM");
  return result.recordset;
}
 
// ✅ FIX 4: Only @Uid — remove @GTypeMUid (SP expects 1 param, not 2)
async function undeleteGeneral(uid) {
  const pool = await poolPromise2;
  const result = await pool.request()
    .input("Uid", sql2.Int, uid)
    .execute("PR_UnDelete_GeneralM");
  return result.recordset[0] ?? null;
}
 
module.exports = { getGeneralData, iudGeneral, undeleteGeneral };