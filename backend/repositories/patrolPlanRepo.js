const { poolPromise, sql } = require("../database/sqlConnection");

// Front grid — PR_Get_PatrolPlanData_ForFrontgrid @tag int, @companyid int
async function getPatrolPlanGrid({ tag, companyId }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("tag",       sql.Int, tag ?? 1)
    .input("companyid", sql.Int, companyId)
    .execute("PR_Get_PatrolPlanData_ForFrontgrid");
  return result.recordset || [];
}

// Patrol points for combo — PR_Get_PatrolPointsData_ForPatrolPlan @companyid int
async function getPatrolPointsForPlan({ companyId }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("companyid", sql.Int, companyId)
    .execute("PR_Get_PatrolPointsData_ForPatrolPlan");
  return result.recordset || [];
}

// Plan detail list for edit — PR_Get_PatrolPlanList @companyid int, @uid int
async function getPatrolPlanList({ companyId, uid }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("companyid", sql.Int, companyId)
    .input("uid",       sql.Int, uid)
    .execute("PR_Get_PatrolPlanList");
  return result.recordset || [];
}

// Insert/Update/Delete plan header — PR_IUD_PatrolPlan
// @Mode: 1=Add, 2=Edit, 3=Delete
async function iudPatrolPlan({ mode, userId, planName, uid, companyId }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Mode",      sql.Int,           mode)
    .input("Userid",    sql.Int,           userId)
    .input("PlanName",  sql.NVarChar(100), planName || "")
    .input("Uid",       sql.Int,           uid || 0)
    .input("companyid", sql.Int,           companyId)
    .execute("PR_IUD_PatrolPlan");
  const row = result.recordset?.[0] ?? result.recordsets?.[0]?.[0] ?? null;
  return row;
}

// Insert/Delete plan detail line — PR_ID_PatrolPlanD
// @Mode: 1=Insert, 2=Delete
async function idPatrolPlanDetail({ mode, userId, planMUid, patrolPointUid, planOrder, leadTime, uid, companyId }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("Mode",           sql.Int,    mode)
    .input("Userid",         sql.Int,    userId)
    .input("PlanMUid",       sql.BigInt, planMUid)
    .input("patrolpointuid", sql.BigInt, patrolPointUid)
    .input("planorder",      sql.Int,    planOrder)
    .input("leadtime",       sql.Int,    leadTime || 0)
    .input("Uid",            sql.Int,    uid || 0)
    .input("companyid",      sql.Int,    companyId)
    .execute("PR_ID_PatrolPlanD");
  const row = result.recordset?.[0] ?? result.recordsets?.[0]?.[0] ?? null;
  return row;
}

module.exports = {
  getPatrolPlanGrid, getPatrolPointsForPlan, getPatrolPlanList,
  iudPatrolPlan, idPatrolPlanDetail,
};