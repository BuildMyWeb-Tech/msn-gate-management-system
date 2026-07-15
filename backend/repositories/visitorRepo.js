// repositories/visitorRepo.js
const { poolPromise, sql } = require("../database/sqlConnection");

async function getVisitorGrid({ companyId, date }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int,     companyId)
    .input("Date",      sql.VarChar, date)
    .execute("PR_Get_Visitors_ForGrid");
  return result.recordset;
}

async function getVisitorByMobile({ companyId, mobile }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int,     companyId)
    .input("Mobile",    sql.VarChar, mobile)
    .execute("PR_Get_Visitor_ByMobile");
  return result.recordset[0] || null;
}

async function getVisitorById({ companyId, uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int,    companyId)
    .input("Uid",       sql.BigInt, uid)
    .execute("PR_Get_Visitor_ForEdit");
  return result.recordset[0] || null;
}

async function iuVisitor(jsonData) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("json", sql.NVarChar(sql.MAX), jsonData)
    .execute("PR_IU_Visitor");
  return result.recordset[0] ?? null;
}

async function visitorOut({ companyId, uid, outTime }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int,     companyId)
    .input("Uid",       sql.BigInt,  uid)
    .input("OutTime",   sql.VarChar, outTime)
    .execute("PR_Visitor_Out");
  return result.recordset[0] ?? null;
}

module.exports = { getVisitorGrid, getVisitorByMobile, getVisitorById, iuVisitor, visitorOut };
