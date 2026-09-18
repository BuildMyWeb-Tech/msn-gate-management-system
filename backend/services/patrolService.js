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

// ── GPS Haversine distance (metres) ──────────────────────────────────────────
function haversineM(lat1, lng1, lat2, lng2) {
  const R  = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GPS validation — returns matching patrol point within 6 m or null
async function validateGPS({ companyId, lat, lng }) {
  const points = await repo.getPatrolPointsWithGPS(companyId);
  const RADIUS_M = 6;
  let best = null, bestDist = Infinity;

  for (const p of points) {
    const pLat = parseFloat(p.gpsid1 ?? p.GpsId1 ?? p.Lat ?? 0);
    const pLng = parseFloat(p.gpsid2 ?? p.GpsId2 ?? p.Lng ?? 0);
    if (!pLat || !pLng) continue;
    const dist = haversineM(lat, lng, pLat, pLng);
    if (dist <= RADIUS_M && dist < bestDist) {
      bestDist = dist;
      best = {
        uid:  p.uid ?? p.Uid ?? p.locationuid ?? p.LocationUid,
        name: p.gname ?? p.GName ?? p.locationname ?? p.LocationName ?? "Unknown Point",
        dist: Math.round(dist * 10) / 10,
      };
    }
  }
  return best;
}

// ── Patrol Sessions — using SP_App_Get_PatrolM_FrontGrid ──────────────────────
async function getPatrolSessions({ date, gateUid, companyId }) {
  const rows = await repo.getPatrolSessions({ date, gateUid, companyId });
  return rows.map(r => ({
    uid:          r.Uid          ?? r.uid,
    patrolId:     r.PatrolID     ?? r.PatrolId    ?? r.patrolId,
    securityName: r.SecurityName ?? r.securityName,
    gateName:     r.GateName     ?? r.gateName,
    startTime:    r.StartTime    ?? r.startTime,
    endTime:      r.EndTime      ?? r.endTime ?? null,
  }));
}

// ── Session Checkpoints — using SP_App_Get_PatrolM_Edit_Grid ─────────────────
async function getSessionCheckpoints({ patrolMUid }) {
  const rows = await repo.getPatrolSessionLogs({ uid: patrolMUid });
  return rows.map(r => ({
    uid:          r.Uid          ?? r.uid,
    slNo:         r.SlNo         ?? r.slNo,
    locationName: r.LocationName ?? r.locationName,
    visitedAt:    r.VisitedAt    ?? r.visitedAt,
    selfieUrl:    r.SelfieUrl    ?? r.selfieUrl ?? null,
  }));
}

// ── Create / End Patrol Session — using SP_APP_IUD_PatrolM ───────────────────
// SP_APP_IUD_PatrolM 0,'2026-09-17 00:00:00.000',1,3,1,1,1,6,'2026-09-17 10:00:00.000'
// Params: Uid, PatrolDate, GateUid, SecurityUid, CompanyId, UserId, PatrolPlanUid, SlNo, StartTime
// Uid=0 → new session; Uid>0 → end existing session
async function createPatrolSession({ companyId, userId, gateUid, securityUid, gateName, securityName, endUid }) {
  const now = new Date();
  const row = await repo.iudPatrolM({
    uid:           endUid || 0,
    patrolDate:    now,
    gateUid:       gateUid    || 0,
    securityUid:   securityUid || userId,
    companyId:     companyId  || 1,
    userId:        userId     || 0,
    patrolPlanUid: 0,
    slNo:          0,
    startTime:     now,
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

// ── Log checkpoint — uploads selfie then calls SP_APP_IUD_PatrolM with detail ─
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
    uid:           patrolMUid,   // existing session uid — SP updates detail
    patrolDate:    now,
    gateUid:       0,
    securityUid:   userId,
    companyId:     companyId || 1,
    userId:        userId,
    patrolPlanUid: locationUid,  // location being validated
    slNo:          0,            // SP auto-increments
    startTime:     now,
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
