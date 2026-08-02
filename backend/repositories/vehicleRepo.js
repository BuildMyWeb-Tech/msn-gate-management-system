const { poolPromise, sql } = require("../database/sqlConnection");

// PR_Get_vehicles — manager SP name
async function getVehicleGrid({ companyId, gateId, date, tag }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Tag",       sql.Bit,    tag ?? 1)
    .input("companyid", sql.Int,    companyId)
    .input("Dt",        sql.Date,   new Date(date))
    .input("Gateuid",   sql.BigInt, gateId || 0)
    .execute("PR_Get_vehicles");
  return result.recordset || [];
}

// PR_IU_Vehicles @json (array format)
async function iuVehicle(jsonData) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("json", sql.NVarChar(sql.MAX), jsonData)
    .execute("PR_IU_Vehicles");
  const row =
    result.recordset?.length > 0 ? result.recordset[0] :
    result.recordsets?.[0]?.length > 0 ? result.recordsets[0][0] : null;
  return row;
}

// PR_Delete_vehicles @Uid bigint
async function deleteVehicle(uid) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Uid", sql.BigInt, Number(uid))
    .execute("PR_Delete_vehicles");
  return result.recordset?.[0] ?? null;
}

module.exports = { getVehicleGrid, iuVehicle, deleteVehicle };