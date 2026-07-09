// repositories/visitorRepo.js
// SP names will be provided by manager before Phase 3
const { poolPromise, sql } = require("../database/sqlConnection");

// GET visitor grid
async function getVisitorGrid({ companyCode, date }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,      companyCode)
    .input("Date",        sql.VarChar,  date)
    .execute("PR_Get_Visitors_ForGrid");
  return result.recordset;
}

// GET visitor by mobile (for auto-fill)
async function getVisitorByMobile({ companyCode, mobile }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,     companyCode)
    .input("Mobile",      sql.VarChar, mobile)
    .execute("PR_Get_Visitor_ByMobile");
  return result.recordset[0] || null;
}

// GET visitor by id (for edit)
async function getVisitorById({ companyCode, uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,    companyCode)
    .input("Uid",         sql.BigInt, uid)
    .execute("PR_Get_Visitor_ForEdit");
  return result.recordset[0] || null;
}

// INSERT / UPDATE visitor
async function iuVisitor(jsonData) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("json", sql.NVarChar(sql.MAX), jsonData)
    .execute("PR_IU_Visitor");
  return result.recordset[0] ?? null;
}

// VISITOR OUT — mark exit time
async function visitorOut({ companyCode, uid, outTime }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,      companyCode)
    .input("Uid",         sql.BigInt,   uid)
    .input("OutTime",     sql.VarChar,  outTime)
    .execute("PR_Visitor_Out");
  return result.recordset[0] ?? null;
}

module.exports = {
  getVisitorGrid,
  getVisitorByMobile,
  getVisitorById,
  iuVisitor,
  visitorOut,
};
