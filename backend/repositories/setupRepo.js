// repositories/setupRepo.js
// Gates  → gtypemuid = 2
// Designations → gtypemuid = 1
const { poolPromise, sql } = require("../database/sqlConnection");

// PR_Get_GeneralMData_ForFrontgrid
// @tag int, @companyid int, @gtypemuid int (1=Designation, 2=Gate)
async function getGeneralGrid({ companyId, gTypeMUid, tag }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("tag",       sql.Int, tag ?? 1)
    .input("companyid", sql.Int, companyId)
    .input("gtypemuid", sql.Int, gTypeMUid)
    .execute("PR_Get_GeneralMData_ForFrontgrid");
  return result.recordset || [];
}

// PR_IUD_GeneralM
// @Mode int (1=Add, 2=Update, 3=Delete)
async function iudGeneral({ companyId, userId, mode, gTypeMUid, uid, code, name, shortName }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Mode",      sql.Int,           mode)
    .input("Userid",    sql.Int,           userId)
    .input("GTypeMUid", sql.Int,           gTypeMUid)
    .input("gcode",     sql.NVarChar(100), code      || "")
    .input("gname",     sql.NVarChar(200), name      || "")
    .input("gsname",    sql.NVarChar(80),  shortName || "")
    .input("Uid",       sql.Int,           uid       || 0)
    .input("companyid", sql.Int,           companyId)
    .execute("PR_IUD_GeneralM");
  const row =
    result.recordset?.length > 0       ? result.recordset[0] :
    result.recordsets?.[0]?.length > 0 ? result.recordsets[0][0] : null;
  return row;
}

// PR_Get_SetupDropdown
async function getSetupDropdown({ companyId, type }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("companyid", sql.Int, companyId)
    .input("Type",      sql.Int, type)
    .execute("PR_Get_SetupDropdown");
  return result.recordset || [];
}

// PR_Get_LocationData_ForFrontgrid (Patrol Points)
async function getLocationGrid({ companyId, tag }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("tag",       sql.Int, tag ?? 1)
    .input("companyid", sql.Int, companyId)
    .execute("PR_Get_LocationData_ForFrontgrid");
  return result.recordset || [];
}

// PR_IUD_Location
// @Mode int (1=Add, 2=Edit, 3=Delete)
async function iudLocation({ companyId, userId, mode, uid, code, name, gpsId1, gpsId2 }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Mode",      sql.Int,           mode)
    .input("Userid",    sql.Int,           userId)
    .input("gcode",     sql.NVarChar(100), code   || "")
    .input("gname",     sql.NVarChar(200), name   || "")
    .input("gpsid1",    sql.NVarChar(80),  gpsId1 || "")
    .input("gpsid2",    sql.NVarChar(80),  gpsId2 || "")
    .input("Uid",       sql.Int,           uid    || 0)
    .input("companyid", sql.Int,           companyId)
    .execute("PR_IUD_Location");
  const row =
    result.recordset?.length > 0       ? result.recordset[0] :
    result.recordsets?.[0]?.length > 0 ? result.recordsets[0][0] : null;
  return row;
}

// PR_GetSecurityData_FrontGrid
async function getSecurityGrid({ companyId, tag }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Tag",       sql.Bit, tag ?? 1)
    .input("companyid", sql.Int, companyId)
    .execute("PR_GetSecurityData_FrontGrid");
  return result.recordset || [];
}

// PR_IUD_Security @Json NVARCHAR(MAX)
async function iudSecurity(jsonData) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Json", sql.NVarChar(sql.MAX), jsonData)
    .execute("PR_IUD_Security");
  const row =
    result.recordset?.length > 0       ? result.recordset[0] :
    result.recordsets?.[0]?.length > 0 ? result.recordsets[0][0] : null;
  return row;
}

module.exports = {
  getGeneralGrid, iudGeneral, getSetupDropdown,
  getLocationGrid, iudLocation,
  getSecurityGrid, iudSecurity,
};