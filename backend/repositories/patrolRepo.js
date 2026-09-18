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
// Returns patrol session list for the Patrol List screen
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
// Returns checkpoint rows for a patrol session (edit view)
async function getPatrolSessionLogs({ uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("Uid", sql.Int, uid)
    .execute("SP_App_Get_PatrolM_Edit_Grid");
  return result.recordset || [];
}

// SP: SP_APP_IUD_PatrolM
// Handles INSERT into both PatrolM (session header) and PatrolMlist (checkpoint detail)
// Params: Uid, PatrolDate, GateUid, SecurityUid, CompanyId, UserId, PatrolPlanUid, SlNo, StartTime
// Uid=0 → new session insert
async function iudPatrolM({ uid, patrolDate, gateUid, securityUid, companyId, userId, patrolPlanUid, slNo, startTime }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("Uid",          sql.Int,      uid          || 0)
    .input("PatrolDate",   sql.DateTime, new Date(patrolDate))
    .input("GateUid",      sql.Int,      gateUid      || 0)
    .input("SecurityUid",  sql.Int,      securityUid  || 0)
    .input("CompanyId",    sql.Int,      companyId    || 1)
    .input("UserId",       sql.Int,      userId       || 0)
    .input("PatrolPlanUid",sql.Int,      patrolPlanUid|| 0)
    .input("SlNo",         sql.Int,      slNo         || 0)
    .input("StartTime",    sql.DateTime, new Date(startTime))
    .execute("SP_APP_IUD_PatrolM");
  return result.recordset?.[0] ?? result.recordsets?.[0]?.[0] ?? null;
}

// Fetch all patrol points with GPS coords (lat=gpsid1, lng=gpsid2)
// Uses existing SP: PR_Get_LocationData_ForFrontgrid
async function getPatrolPointsWithGPS(companyId) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("tag",       sql.Int, 1)
    .input("companyid", sql.Int, companyId)
    .execute("PR_Get_LocationData_ForFrontgrid");
  return result.recordset || [];
}

module.exports = {
  getPatrolLogs, insertPatrolLog,
  getPatrolSessions, getPatrolSessionLogs,
  iudPatrolM,
  getPatrolPointsWithGPS,
};
