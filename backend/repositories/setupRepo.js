// repositories/setupRepo.js
// Gates  → gtypemuid = 2
// Designations → gtypemuid = 1
const { poolPromise, sql } = require("../database/sqlConnection");

// ─────────────────────────────────────────────────────────────
// GET grid  — PR_Get_GeneralMData_ForFrontgrid
// @tag int        (1=active, 0=inactive)
// @companyid int
// @gtypemuid int  (1=Designation, 2=Gate)
// ─────────────────────────────────────────────────────────────
async function getGeneralGrid({ companyId, gTypeMUid, tag }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("tag",       sql.Int, tag ?? 1)
    .input("companyid", sql.Int, companyId)
    .input("gtypemuid", sql.Int, gTypeMUid)
    .execute("PR_Get_GeneralMData_ForFrontgrid");
  return result.recordset || [];
}

// ─────────────────────────────────────────────────────────────
// IUD  — PR_IUD_GeneralM
// @Mode int           (1=Add, 2=Update, 3=Delete)
// @Userid int
// @GTypeMUid int
// @gcode nvarchar(100)
// @gname nvarchar(200)
// @gsname nvarchar(80)
// @Uid int            (0=Add, existing uid for Update/Delete)
// @companyid int
//
// SP response handling:
//   Mode 1 (Add)    → may return a recordset with ResponseMessage/Uid
//   Mode 2 (Update) → may return empty recordset or just rowsAffected
//   Mode 3 (Delete) → may return empty recordset or just rowsAffected
//
// Safe extraction: try recordset[0], then recordsets[0][0], then null
// This prevents "Cannot read properties of undefined (reading '0')" crash
// ─────────────────────────────────────────────────────────────
async function iudGeneral({ companyId, userId, mode, gTypeMUid, uid, code, name, shortName }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("Mode",      sql.Int,           mode)
    .input("Userid",    sql.Int,           userId)
    .input("GTypeMUid", sql.Int,           gTypeMUid)
    .input("gcode",     sql.NVarChar(100), code      || "")
    .input("gname",     sql.NVarChar(200), name      || "")
    .input("gsname",    sql.NVarChar(80),  shortName || "")
    .input("Uid",       sql.Int,           uid       || 0)
    .input("companyid", sql.Int,           companyId)
    .execute("PR_IUD_GeneralM");

  // Safely get first row regardless of how many recordsets SP returns
  const row =
    (result.recordset && result.recordset.length > 0)
      ? result.recordset[0]
      : (result.recordsets && result.recordsets[0] && result.recordsets[0].length > 0)
        ? result.recordsets[0][0]
        : null;

  return row;
}

// ─────────────────────────────────────────────────────────────
// DROPDOWN — for visitor "To Meet" search
// ─────────────────────────────────────────────────────────────
async function getSetupDropdown({ companyId, type }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int, companyId)
    .input("Type",      sql.Int, type)
    .execute("PR_Get_SetupDropdown");
  return result.recordset || [];
}

// exports moved to bottom

// ─────────────────────────────────────────────────────────────
// LOCATION — PR_Get_LocationData_ForFrontgrid
// @tag int, @companyid int
// ─────────────────────────────────────────────────────────────
async function getLocationGrid({ companyId, tag }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("tag",       sql.Int, tag ?? 1)
    .input("companyid", sql.Int, companyId)
    .execute("PR_Get_LocationData_ForFrontgrid");
  return result.recordset || [];
}

// ─────────────────────────────────────────────────────────────
// LOCATION — PR_IUD_Location
// @Mode int (1=Add, 2=Edit, 3=Delete)
// @Userid int
// @gcode nvarchar(100), @gname nvarchar(200)
// @gpsid1 nvarchar(80), @gpsid2 nvarchar(80)
// @Uid int (0 for Add)
// @companyid int
// ─────────────────────────────────────────────────────────────
async function iudLocation({ companyId, userId, mode, uid, code, name, gpsId1, gpsId2 }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
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
    (result.recordset && result.recordset.length > 0)
      ? result.recordset[0]
      : (result.recordsets?.[0]?.length > 0)
        ? result.recordsets[0][0]
        : null;
  return row;
}

// exports moved to bottom

// ─────────────────────────────────────────────────────────────
// SECURITIES
// ─────────────────────────────────────────────────────────────
async function getSecurityGrid({ companyId, tag }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("Tag",       sql.Bit, tag ?? 1)
    .input("companyid", sql.Int, companyId)
    .execute("PR_GetSecurityData_FrontGrid");
  return result.recordset || [];
}

async function iudSecurity(jsonData) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("Json", sql.NVarChar(sql.MAX), jsonData)
    .execute("PR_IUD_Security");
  const row =
    (result.recordset && result.recordset.length > 0)
      ? result.recordset[0]
      : (result.recordsets?.[0]?.length > 0)
        ? result.recordsets[0][0]
        : null;
  return row;
}

// Update exports
module.exports = {
  getGeneralGrid, iudGeneral, getSetupDropdown,
  getLocationGrid, iudLocation,
  getSecurityGrid, iudSecurity,
};