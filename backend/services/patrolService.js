// services/patrolService.js
const repo          = require("../repositories/patrolRepo");
const cloudinarySvc = require("./cloudinaryService");

// ── Legacy checkpoint log ─────────────────────────────────────────────────────
async function getPatrolLogs({ companyId, date, guardId }) {
  return await repo.getPatrolLogs({ companyId, date, guardId });
}

async function markCheckpoint({ companyId, gateId, guardId, locationId, remarks }) {
  const visitedAt = new Date().toISOString();
  return await repo.insertPatrolLog({
    companyId,
    guardId:    Number(guardId),
    locationId: Number(locationId),
    gateId:     gateId ? Number(gateId) : 0,
    visitedAt,
    remarks:    remarks || "",
  });
}

// ── GPS Validation — PR_Validate_PatrolPoints @c1, @c2, @Companyid ────────────
// SP returns: ResponseCode, uid, PatrolPointCode, PatrolPointName
async function validateGPS({ companyId, lat, lng }) {
  const row = await repo.validatePatrolPoints({ lat, lng, companyId });
  if (!row) return null;
  if (row.ResponseCode != null && row.ResponseCode > 101) return null;
  if (!row.uid && !row.PatrolPointName) return null;
  return {
    uid:  row.uid,
    name: row.PatrolPointName,
    code: row.PatrolPointCode,
  };
}

// ── Patrol Sessions — SP_App_Get_PatrolM_FrontGrid ────────────────────────────
// SP columns: uid, PatrolID, Scurity (typo), Gate, Start, Endd (typo)
async function getPatrolSessions({ date, gateUid, companyId }) {
  const rows = await repo.getPatrolSessions({ date, gateUid, companyId });
  return rows
    .filter(r => r.ResponseCode == null || Number(r.ResponseCode) <= 101)
    .map(r => ({
    uid:          r.uid,
    patrolId:     r.PatrolID,
    securityName: r.Scurity,
    gateName:     r.Gate,
    startTime:    r.Start,
    endTime:      r.Endd ?? null,
  }));
}

// ── Session Checkpoints — SP_App_Get_PatrolM_Edit_Grid ────────────────────────
// SP returns two recordsets; use rows from recordsets[1]: SINo, PatrolPoint, Time
async function getSessionCheckpoints({ patrolMUid }) {
  const { rows } = await repo.getPatrolSessionLogs({ uid: patrolMUid });
  return rows.map(r => ({
    slNo:         r.SINo,
    locationName: r.PatrolPoint,
    visitedAt:    r.Time,
    selfieUrl:    null,
  }));
}

// ── Create / End Patrol Session — SP_APP_IUD_PatrolM ─────────────────────────
async function createPatrolSession({ companyId, userId, gateUid, securityUid, gateName, securityName, endUid }) {
  const now = new Date();
  const row = await repo.iudPatrolM({
    uid:           endUid      || 0,
    dt:            now,
    gateid:        gateUid     || 0,
    securityid:    securityUid || userId,
    companyId:     companyId   || 1,
    patrolId:      0,
    active:        1,
    patrolPointUid: 0,
  });

  const rc = row?.ResponseCode ?? 100;
  if (rc > 101) throw Object.assign(new Error(row?.ResponseMessage || "Failed to create patrol session"), { status: 400 });

  return {
    uid:          row?.PatrolUid  ?? row?.Uid  ?? row?.uid  ?? null,
    patrolId:     row?.PatrolID   ?? row?.PatrolId           ?? null,
    gateName:     row?.GateName   ?? gateName                ?? "",
    securityName: row?.SecurityName ?? securityName          ?? "",
    startTime:    row?.StartTime  ?? now.toISOString(),
    endTime:      null,
  };
}

// ── Log checkpoint — uploads selfie then logs via SP_APP_IUD_PatrolM ──────────
async function logCheckpoint({ companyId, userId, patrolMUid, locationUid, locationName, selfieImage }) {
  let selfieUrl = "";

  if (selfieImage) {
    try {
      const base64Only = selfieImage.replace(/^data:image\/\w+;base64,/, "");
      selfieUrl = await cloudinarySvc.uploadPhoto(base64Only, "msn-gms/patrol-selfies");
    } catch (err) {
      console.warn("[logCheckpoint] Selfie upload failed:", err.message);
    }
  }

  const now = new Date();
  const row = await repo.iudPatrolM({
    uid:          patrolMUid,
    dt:           now,
    gateid:       0,
    securityid:   userId,
    companyId:    companyId || 1,
    userid:       userId,
    patrolId:       patrolMUid,
    active:         1,
    patrolPointUid: locationUid || 0,
  });

  const rc = row?.ResponseCode ?? 100;
  if (rc > 101) throw Object.assign(new Error(row?.ResponseMessage || "Failed to log checkpoint"), { status: 400 });

  return {
    uid:          row?.Uid          ?? row?.uid,
    slNo:         row?.SlNo         ?? row?.slNo,
    locationName: row?.LocationName ?? locationName ?? "",
    visitedAt:    now.toISOString(),
    selfieUrl,
  };
}

module.exports = {
  getPatrolLogs, markCheckpoint,
  validateGPS,
  createPatrolSession, getPatrolSessions,
  getSessionCheckpoints, logCheckpoint,
};
