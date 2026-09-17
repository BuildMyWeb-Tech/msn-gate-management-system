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
// Expected SP: PR_IU_PatrolSession
// @Mode int (1=Create, 2=End, 3=Delete)
// @Uid int (0 for new)
// @companyid int, @Userid int, @GateId int
// Returns: ResponseCode, ResponseMessage, PatrolUid, PatrolID (formatted)
async function iudPatrolSession({ companyId, userId, gateId, mode, uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("Mode",      sql.Int, mode)
    .input("Uid",       sql.Int, uid || 0)
    .input("companyid", sql.Int, companyId)
    .input("Userid",    sql.Int, userId)
    .input("GateId",    sql.Int, gateId || 0)
    .execute("PR_IU_PatrolSession");
  return result.recordset?.[0] ?? result.recordsets?.[0]?.[0] ?? null;
}

// Expected SP: PR_Get_PatrolSessions
// @companyid int, @Date varchar, @GateId int (0=all), @GuardId int (0=all)
// Returns: Uid, PatrolID, SecurityName, GateName, StartTime, EndTime
async function getPatrolSessions({ companyId, date, gateId, guardId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid", sql.Int,     companyId)
    .input("Date",      sql.VarChar, date)
    .input("GateId",    sql.Int,     gateId  || 0)
    .input("GuardId",   sql.Int,     guardId || 0)
    .execute("PR_Get_PatrolSessions");
  return result.recordset || [];
}

// ── Session Checkpoints ───────────────────────────────────────────────────────
// Expected SP: PR_IU_PatrolSessionD
// @Mode int (1=Insert, 2=Delete)
// @Uid int (0 for new), @PatrolMUid int
// @companyid int, @Userid int, @LocationUid int
// @VisitedAt varchar, @SelfieUrl nvarchar
// Returns: ResponseCode, ResponseMessage, Uid, SlNo, LocationName
async function iudPatrolCheckpoint({ companyId, userId, patrolMUid, locationUid, visitedAt, selfieUrl, mode, uid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("Mode",       sql.Int,              mode)
    .input("Uid",        sql.Int,              uid || 0)
    .input("PatrolMUid", sql.Int,              patrolMUid)
    .input("companyid",  sql.Int,              companyId)
    .input("Userid",     sql.Int,              userId)
    .input("LocationUid",sql.Int,              locationUid)
    .input("VisitedAt",  sql.VarChar(50),      visitedAt)
    .input("SelfieUrl",  sql.NVarChar(sql.MAX), selfieUrl || "")
    .execute("PR_IU_PatrolSessionD");
  return result.recordset?.[0] ?? result.recordsets?.[0]?.[0] ?? null;
}

// Expected SP: PR_Get_PatrolSessionLogs
// @companyid int, @PatrolMUid int
// Returns: Uid, SlNo, LocationName, VisitedAt, SelfieUrl
async function getPatrolSessionLogs({ companyId, patrolMUid }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("companyid",  sql.Int, companyId)
    .input("PatrolMUid", sql.Int, patrolMUid)
    .execute("PR_Get_PatrolSessionLogs");
  return result.recordset || [];
}

// Fetch all patrol points with GPS (lat=gpsid1, lng=gpsid2)
// Uses existing PR_Get_LocationData_ForFrontgrid
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
  iudPatrolSession, getPatrolSessions,
  iudPatrolCheckpoint, getPatrolSessionLogs,
  getPatrolPointsWithGPS,
};
