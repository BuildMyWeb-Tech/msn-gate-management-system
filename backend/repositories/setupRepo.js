// repositories/setupRepo.js
// Handles Gates, Securities, Designations, Locations
const { poolPromise, sql } = require("../database/sqlConnection");

// ─────────────────────────────────────────────────────────────
// GENERIC — Get setup grid by type
// SP: PR_GetSetupM_FrontGrid
// @Type: 1=Gates, 2=Securities, 3=Designations, 4=Locations
// ─────────────────────────────────────────────────────────────
async function getSetupGrid({ companyCode, type, tag }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int, companyCode)
    .input("Type",        sql.Int, type)
    .input("Tag",         sql.Bit, tag)
    .execute("PR_GetSetupM_FrontGrid");
  return result.recordset;
}

// ─────────────────────────────────────────────────────────────
// GENERIC — Insert / Update / Delete setup master
// SP: PR_IUD_SetupM
// @Mode: 1=Insert, 2=Update, 3=Delete
// ─────────────────────────────────────────────────────────────
async function iudSetup({ companyCode, mode, type, uid, code, name, extra, photo }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,                companyCode)
    .input("Mode",        sql.Int,                mode)
    .input("Type",        sql.Int,                type)
    .input("Uid",         sql.Int,                uid        || 0)
    .input("Code",        sql.NVarChar(100),      code       || "")
    .input("Name",        sql.NVarChar(200),      name       || "")
    .input("Extra",       sql.NVarChar(sql.MAX),  extra      || "")
    .input("Photo",       sql.NVarChar(sql.MAX),  photo      || "")
    .execute("PR_IUD_SetupM");
  return result.recordset[0] ?? null;
}

// ─────────────────────────────────────────────────────────────
// GENERIC — Restore soft-deleted setup record
// SP: PR_UnDelete_SetupM
// ─────────────────────────────────────────────────────────────
async function undeleteSetup({ companyCode, uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int, companyCode)
    .input("Uid",         sql.Int, uid)
    .execute("PR_UnDelete_SetupM");
  return result.recordset[0] ?? null;
}

// ─────────────────────────────────────────────────────────────
// GET dropdown data (for form selects — e.g. gate list, designation list)
// SP: PR_Get_SetupDropdown
// ─────────────────────────────────────────────────────────────
async function getSetupDropdown({ companyCode, type }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int, companyCode)
    .input("Type",        sql.Int, type)
    .execute("PR_Get_SetupDropdown");
  return result.recordset;
}

module.exports = {
  getSetupGrid,
  iudSetup,
  undeleteSetup,
  getSetupDropdown,
};
