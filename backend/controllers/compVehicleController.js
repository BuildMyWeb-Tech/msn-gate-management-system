const { poolPromise, sql } = require("../database/sqlConnection");

// PR_Get_CompVehicleData_ForFrontgrid @tag int, @companyid int
async function getCompVehicles({ tag, companyId }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("tag",       sql.Int, tag ?? 1)
    .input("companyid", sql.Int, companyId)
    .execute("PR_Get_CompVehicleData_ForFrontgrid");
  return result.recordset || [];
}

// PR_IUD_GeneralM — Add/Edit Comp. Vehicle
// @Mode:1=add, 2=edit | @GTypeMUid:5 (fixed) | @gcode=VehicleNo | @gname=Brand | @gsname=DriverName
async function iudCompVehicle({ mode, userId, uid, vehicleNo, brand, driverName, companyId }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Mode",      sql.Int,           mode)
    .input("Userid",    sql.Int,           userId)
    .input("GTypeMUid", sql.Int,           5)           // always 5
    .input("gcode",     sql.NVarChar(100), vehicleNo)
    .input("gname",     sql.NVarChar(200), brand)
    .input("gsname",    sql.NVarChar(80),  driverName)
    .input("Uid",       sql.Int,           uid || 0)    // 0 for add
    .input("companyid", sql.Int,           companyId)
    .execute("PR_IUD_GeneralM");
  return result.recordset?.[0] ?? null;
}

module.exports = { getCompVehicles, iudCompVehicle };