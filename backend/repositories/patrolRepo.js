// repositories/patrolRepo.js
const { poolPromise, sql } = require("../database/sqlConnection");

async function getPatrolLogs({ companyId, date, guardId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int,     companyId)
    .input("Date",      sql.VarChar, date)
    .input("GuardId",   sql.Int,     guardId || 0)
    .execute("PR_Get_PatrolLogs_ForGrid");
  return result.recordset;
}

async function insertPatrolLog({ companyId, guardId, locationId, gateId, visitedAt, remarks }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid",  sql.Int,           companyId)
    .input("GuardId",    sql.Int,           guardId)
    .input("LocationId", sql.Int,           locationId)
    .input("GateId",     sql.Int,           gateId || 0)
    .input("VisitedAt",  sql.VarChar,       visitedAt)
    .input("Remarks",    sql.NVarChar(500), remarks || "")
    .execute("PR_IU_PatrolLog");
  return result.recordset[0] ?? null;
}

// ── Patrol Sessions ───────────────────────────────────────────────────────────
// SP: SP_App_Get_PatrolM_FrontGrid @date date, @Gateid int, @Companyid int
async function getPatrolSessions({ date, gateUid, companyId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("date",      sql.Date, new Date(date))
    .input("Gateid",    sql.Int,  gateUid   || 0)
    .input("Companyid", sql.Int,  companyId || 1)
    .execute("SP_App_Get_PatrolM_FrontGrid");
  return result.recordset || [];
}

// SP: SP_App_Get_PatrolM_Edit_Grid @Uid int
// Returns TWO recordsets:
//   recordsets[0] — session header row (uid, PatrolID, Security, Gate)
//   recordsets[1] — checkpoint detail rows (SINo, PatrolPoint, Time)
async function getPatrolSessionLogs({ uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("Uid", sql.Int, uid)
    .execute("SP_App_Get_PatrolM_Edit_Grid");
  return {
    header: result.recordsets?.[0]?.[0] ?? null,
    rows:   result.recordsets?.[1]       ?? result.recordset ?? [],
  };
}

// SP: SP_APP_IUD_PatrolM — 9 params confirmed via error discovery
// @Uid, @Dt, @Gateid, @Securityid, @Companyid, @Userid, @PatrolId, @Active, @Patrolpointuid
async function iudPatrolM({ uid, dt, gateid, securityid, companyId, patrolId, active, patrolPointUid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("uid",            sql.BigInt,   uid            || 0)
    .input("Dt",             sql.Date,     new Date(dt))
    .input("PatrolId",       sql.Int,      patrolId       || 0)
    .input("Gateid",         sql.Int,      gateid         || 0)
    .input("securityid",     sql.Int,      securityid     || 0)
    .input("Active",         sql.Int,      active         ?? 1)
    .input("Companyid",      sql.Int,      companyId      || 1)
    .input("Patrolpointuid", sql.Int,      patrolPointUid || 0)
    .input("PunchTime",      sql.DateTime, new Date(dt))
    .execute("SP_APP_IUD_PatrolM");
  return result.recordset?.[0] ?? result.recordsets?.[0]?.[0] ?? null;
}

// SP: PR_Validate_PatrolPoints @c1 nvarchar(30), @c2 nvarchar(30), @Companyid int
// Returns: ResponseCode, ResponseMessage, uid, PatrolPointCode, PatrolPointName
async function validatePatrolPoints({ lat, lng, companyId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("c1",        sql.NVarChar(30), String(lat))
    .input("c2",        sql.NVarChar(30), String(lng))
    .input("Companyid", sql.Int,          companyId || 1)
    .execute("PR_Validate_PatrolPoints");
  return result.recordset?.[0] ?? null;
}

module.exports = {
  getPatrolLogs, insertPatrolLog,
  getPatrolSessions, getPatrolSessionLogs,
  iudPatrolM,
  validatePatrolPoints,
};
