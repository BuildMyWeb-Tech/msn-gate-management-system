// repositories/vehicleRepo.js
// SP names will be provided by manager before Phase 4
const { poolPromise, sql } = require("../database/sqlConnection");

// GET vehicle grid
async function getVehicleGrid({ companyCode, date }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,     companyCode)
    .input("Date",        sql.VarChar, date)
    .execute("PR_Get_Vehicles_ForGrid");
  return result.recordset;
}

// GET vehicle by id (for edit)
async function getVehicleById({ companyCode, uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,    companyCode)
    .input("Uid",         sql.BigInt, uid)
    .execute("PR_Get_Vehicle_ForEdit");
  return result.recordset[0] || null;
}

// INSERT / UPDATE vehicle
async function iuVehicle(jsonData) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("json", sql.NVarChar(sql.MAX), jsonData)
    .execute("PR_IU_Vehicle");
  return result.recordset[0] ?? null;
}

// VEHICLE OUT — mark exit time
async function vehicleOut({ companyCode, uid, outTime }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,     companyCode)
    .input("Uid",         sql.BigInt,  uid)
    .input("OutTime",     sql.VarChar, outTime)
    .execute("PR_Vehicle_Out");
  return result.recordset[0] ?? null;
}

module.exports = {
  getVehicleGrid,
  getVehicleById,
  iuVehicle,
  vehicleOut,
};
