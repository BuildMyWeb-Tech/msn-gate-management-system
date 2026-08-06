const { poolPromise, sql } = require("../database/sqlConnection");

// PR_GetVisitorData_FrontGrid
async function getVisitorGrid({ companyId, gateId, date, tag }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Tag",       sql.Bit,    tag ?? 1)
    .input("companyid", sql.Int,    companyId)
    .input("Dt",        sql.Date,   new Date(date))
    .input("Gateuid",   sql.BigInt, gateId || 0)
    .execute("PR_GetVisitorData_FrontGrid");
  return result.recordset || [];
}

// PR_IU_Visitors @json
async function iuVisitor(jsonData) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("json", sql.NVarChar(sql.MAX), jsonData)
    .execute("PR_IU_Visitors");
  const row =
    result.recordset?.length > 0 ? result.recordset[0] :
    result.recordsets?.[0]?.length > 0 ? result.recordsets[0][0] : null;
  return row;
}

// PR_Delete_Visitors @Uid bigint
async function deleteVisitor(uid) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Uid", sql.BigInt, Number(uid))
    .execute("PR_Delete_Visitors");
  return result.recordset?.[0] ?? null;
}

// PR_Validate_Mobileno @mobile nvarchar(50), @companyid int
async function getVisitorByMobile({ mobile, companyId }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("mobile",    sql.NVarChar(50), String(mobile))
    .input("companyid", sql.Int,          companyId)
    .execute("PR_Validate_Mobileno");
  return result.recordset || [];
}

// PR_Search_Visitors @Str nvarchar(200), @companyid int
async function searchVisitors({ str, companyId }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Str",       sql.NVarChar(200), String(str))
    .input("companyid", sql.Int,           companyId)
    .execute("PR_Search_Visitors");
  return result.recordset || [];
}

module.exports = {
  getVisitorGrid,
  iuVisitor,
  deleteVisitor,
  getVisitorByMobile,
  searchVisitors,
};