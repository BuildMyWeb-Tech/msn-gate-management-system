// repositories/vehicleRepo.js
const { poolPromise, sql } = require("../database/sqlConnection");

async function getVehicleGrid({ companyId, date }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int,     companyId)
    .input("Date",      sql.VarChar, date)
    .execute("PR_Get_Vehicles_ForGrid");
  return result.recordset;
}

async function getVehicleById({ companyId, uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int,    companyId)
    .input("Uid",       sql.BigInt, uid)
    .execute("PR_Get_Vehicle_ForEdit");
  return result.recordset[0] || null;
}

async function iuVehicle(jsonData) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("json", sql.NVarChar(sql.MAX), jsonData)
    .execute("PR_IU_Vehicle");
  return result.recordset[0] ?? null;
}

async function vehicleOut({ companyId, uid, outTime }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int,     companyId)
    .input("Uid",       sql.BigInt,  uid)
    .input("OutTime",   sql.VarChar, outTime)
    .execute("PR_Vehicle_Out");
  return result.recordset[0] ?? null;
}

module.exports = { getVehicleGrid, getVehicleById, iuVehicle, vehicleOut };
