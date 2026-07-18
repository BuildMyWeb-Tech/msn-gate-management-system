// services/setupService.js
const repo = require("../repositories/setupRepo");

const GTYPE    = { gates: 2, designations: 1 };
const getGType = (typeStr) => GTYPE[typeStr?.toLowerCase()] ?? 0;

// ─────────────────────────────────────────────────────────────
// SP ResponseCode meanings:
//   100 / 101 = Success
//   102+      = Error (duplicate code, validation failure, etc.)
// ─────────────────────────────────────────────────────────────
function isSpError(row) {
  if (!row) return false;
  const code = row.ResponseCode ?? row.responseCode;
  if (code === undefined || code === null) return false;
  return code !== 100 && code !== 101;
}

function getMsg(row, fallback) {
  return row?.ResponseMessage ?? row?.responseMessage ??
         row?.Message        ?? row?.message         ??
         fallback;
}

function isDataRow(r) {
  return r.uid !== undefined || r.gcode !== undefined || r.gname !== undefined;
}

// ─────────────────────────────────────────────────────────────
// GET grid
// ─────────────────────────────────────────────────────────────
async function getSetupData({ companyId, typeStr, tag }) {
  const gTypeMUid = getGType(typeStr);
  const rows = await repo.getGeneralGrid({ companyId, gTypeMUid, tag: tag ?? 1 });
  return rows
    .filter(isDataRow)
    .map(r => ({
      uid:       Number(r.uid ?? r.Uid ?? 0),
      code:      r.gcode  ?? r.Gcode  ?? "",
      name:      r.gname  ?? r.Gname  ?? "",
      shortName: r.gsname ?? r.Gsname ?? "",
      active:    r.active ?? r.Active ?? true,
    }));
}

// ─────────────────────────────────────────────────────────────
// CREATE — Mode 1
// SP returns ResponseCode=102 for duplicate code/name
// ─────────────────────────────────────────────────────────────
async function createSetup({ companyId, userId, typeStr, body }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 1, gTypeMUid, uid: 0,
    code: body.code || "", name: body.name || "", shortName: body.shortName || "",
  });
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code or name already exists"));
    err.status = 400;
    throw err;
  }
  return { ResponseMessage: getMsg(row, "Created successfully") };
}

// ─────────────────────────────────────────────────────────────
// UPDATE — Mode 2
// ─────────────────────────────────────────────────────────────
async function updateSetup({ companyId, userId, typeStr, uid, body }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 2, gTypeMUid, uid: Number(uid),
    code: body.code || "", name: body.name || "", shortName: body.shortName || "",
  });
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code or name already exists"));
    err.status = 400;
    throw err;
  }
  return { ResponseMessage: getMsg(row, "Updated successfully") };
}

// ─────────────────────────────────────────────────────────────
// DELETE — Mode 3
// ─────────────────────────────────────────────────────────────
async function deleteSetup({ companyId, userId, typeStr, uid }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 3, gTypeMUid, uid: Number(uid),
    code: "", name: "", shortName: "",
  });
  return { ResponseMessage: getMsg(row, "Deleted successfully") };
}

// ─────────────────────────────────────────────────────────────
// RESTORE — Mode 4
// ─────────────────────────────────────────────────────────────
async function restoreSetup({ companyId, userId, typeStr, uid }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 4, gTypeMUid, uid: Number(uid),
    code: "", name: "", shortName: "",
  });
  return { ResponseMessage: getMsg(row, "Restored successfully") };
}

// ─────────────────────────────────────────────────────────────
// DROPDOWN
// ─────────────────────────────────────────────────────────────
async function getDropdown({ companyId, typeStr }) {
  const type = getGType(typeStr);
  const rows = await repo.getSetupDropdown({ companyId, type });
  return rows
    .filter(isDataRow)
    .map(r => ({
      id:   r.uid   ?? r.Uid   ?? 0,
      code: r.gcode ?? r.code  ?? "",
      name: r.gname ?? r.name  ?? "",
    }));
}

// ─────────────────────────────────────────────────────────────
// LOCATION — GET grid
// ─────────────────────────────────────────────────────────────
async function getLocationData({ companyId, tag }) {
  const rows = await repo.getLocationGrid({ companyId, tag: tag ?? 1 });
  return rows
    .filter(r => r.uid !== undefined || r.gcode !== undefined)
    .map(r => ({
      uid:    Number(r.uid ?? r.Uid ?? 0),
      code:   r.gcode  ?? r.Gcode  ?? "",
      name:   r.gname  ?? r.Gname  ?? "",
      gpsId1: r.gpsid1 ?? r.GpsId1 ?? "",
      gpsId2: r.gpsid2 ?? r.GpsId2 ?? "",
      active: r.active ?? r.Active ?? true,
    }));
}

// ─────────────────────────────────────────────────────────────
// LOCATION — CREATE
// ─────────────────────────────────────────────────────────────
async function createLocation({ companyId, userId, body }) {
  const row = await repo.iudLocation({
    companyId, userId, mode: 1, uid: 0,
    code: body.code || "", name: body.name || "",
    gpsId1: body.gpsId1 || "", gpsId2: body.gpsId2 || "",
  });
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code or name already exists"));
    err.status = 400;
    throw err;
  }
  return { ResponseMessage: getMsg(row, "Location created successfully") };
}

// ─────────────────────────────────────────────────────────────
// LOCATION — UPDATE
// ─────────────────────────────────────────────────────────────
async function updateLocation({ companyId, userId, uid, body }) {
  const row = await repo.iudLocation({
    companyId, userId, mode: 2, uid: Number(uid),
    code: body.code || "", name: body.name || "",
    gpsId1: body.gpsId1 || "", gpsId2: body.gpsId2 || "",
  });
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code or name already exists"));
    err.status = 400;
    throw err;
  }
  return { ResponseMessage: getMsg(row, "Location updated successfully") };
}

// ─────────────────────────────────────────────────────────────
// LOCATION — DELETE
// ─────────────────────────────────────────────────────────────
async function deleteLocation({ companyId, userId, uid }) {
  const row = await repo.iudLocation({
    companyId, userId, mode: 3, uid: Number(uid),
    code: "", name: "", gpsId1: "", gpsId2: "",
  });
  return { ResponseMessage: getMsg(row, "Location deleted successfully") };
}

module.exports = {
  getSetupData, createSetup, updateSetup, deleteSetup, restoreSetup, getDropdown,
  getLocationData, createLocation, updateLocation, deleteLocation,
};