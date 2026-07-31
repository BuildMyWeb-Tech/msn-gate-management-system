// repositories/visitorRepo.js
const { poolPromise, sql } = require('../database/sqlConnection');

// ─────────────────────────────────────────────────────────────
// PR_GetVisitorData_FrontGrid
// @Tag bit       (1=active, 0=deleted)
// @companyid int
// @Dt date       (filter date)
// @Gateuid bigint
// ─────────────────────────────────────────────────────────────
async function getVisitorGrid({ companyId, gateId, date, tag }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input('Tag', sql.Bit, tag ?? 1)
    .input('companyid', sql.Int, companyId)
    .input('Dt', sql.Date, new Date(date))
    .input('Gateuid', sql.BigInt, gateId || 0)
    .execute('PR_GetVisitorData_FrontGrid');
  return result.recordset || [];
}

// ─────────────────────────────────────────────────────────────
// PR_IU_Visitors @json
// JSON format from manager (array):
// [{ uid, YearSlno, GateUid, Companyid, VDt, VName, VMobile,
//    VType, VCompany, ToMeet, VNotes, VVehicleNo, VIntime,
//    VOuttime, VPhotoPath, VisitorCount, Active,
//    Userid_in, Userid_out }]
// ─────────────────────────────────────────────────────────────
async function iuVisitor(jsonData) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input('json', sql.NVarChar(sql.MAX), jsonData)
    .execute('PR_IU_Visitors');
  const row =
    result.recordset && result.recordset.length > 0
      ? result.recordset[0]
      : result.recordsets?.[0]?.length > 0
        ? result.recordsets[0][0]
        : null;
  return row;
}

// ─────────────────────────────────────────────────────────────
// PR_Delete_Visitors @Uid bigint
// ─────────────────────────────────────────────────────────────
async function deleteVisitor(uid) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input('Uid', sql.BigInt, Number(uid))
    .execute('PR_Delete_Visitors');
  return result.recordset?.[0] ?? null;
}

module.exports = { getVisitorGrid, iuVisitor, deleteVisitor };
