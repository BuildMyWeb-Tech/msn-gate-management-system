// repositories/patrolRepo.js
const { poolPromise, sql } = require("../database/sqlConnection");

// GET patrol logs grid
async function getPatrolLogs({ companyCode, date, guardId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,    companyCode)
    .input("Date",        sql.VarChar, date)
    .input("GuardId",     sql.Int,    guardId || 0)
    .execute("PR_Get_PatrolLogs_ForGrid");
  return result.recordset;
}

// INSERT patrol log (mark checkpoint visited)
async function insertPatrolLog({ companyCode, guardId, locationId, gateId, visitedAt, remarks }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("CompanyCode", sql.Int,          companyCode)
    .input("GuardId",     sql.Int,          guardId)
    .input("LocationId",  sql.Int,          locationId)
    .input("GateId",      sql.Int,          gateId || 0)
    .input("VisitedAt",   sql.VarChar,      visitedAt)
    .input("Remarks",     sql.NVarChar(500), remarks || "")
    .execute("PR_IU_PatrolLog");
  return result.recordset[0] ?? null;
}

module.exports = { getPatrolLogs, insertPatrolLog };
