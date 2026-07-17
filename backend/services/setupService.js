// services/setupService.js
const repo = require("../repositories/setupRepo");

const GTYPE    = { gates: 2, designations: 1 };
const getGType = (typeStr) => GTYPE[typeStr?.toLowerCase()] ?? 0;

// ─────────────────────────────────────────────────────────────
// SP returns ResponseCode in every row:
//   ResponseCode = 100 → Success rows (actual data)
//   ResponseCode = 101 → No Data Found (empty result)
// Filter out non-data rows before returning to frontend
// ─────────────────────────────────────────────────────────────
function isDataRow(r) {
  // Row is actual data if it has uid/gcode/gname
  // Row is SP message if it only has ResponseCode/ResponseMessage
  return (r.uid !== undefined || r.gcode !== undefined || r.gname !== undefined);
}

async function getSetupData({ companyId, typeStr, tag }) {
  const gTypeMUid = getGType(typeStr);
  const rows = await repo.getGeneralGrid({ companyId, gTypeMUid, tag: tag ?? 1 });

  // Filter out ResponseCode/ResponseMessage rows, keep only data rows
  return rows
    .filter(isDataRow)
    .map(r => ({
      uid:       Number(r.uid ?? r.Uid ?? 0),  // SP returns uid as string — convert
      code:      r.gcode  ?? r.Gcode  ?? "",
      name:      r.gname  ?? r.Gname  ?? "",
      shortName: r.gsname ?? r.Gsname ?? "",
      active:    r.active ?? r.Active ?? true,
    }));
}

// ─────────────────────────────────────────────────────────────
// CREATE — Mode 1
// ─────────────────────────────────────────────────────────────
async function createSetup({ companyId, userId, typeStr, body }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 1, gTypeMUid, uid: 0,
    code: body.code || "", name: body.name || "", shortName: body.shortName || "",
  });
  return { ResponseMessage: row?.ResponseMessage ?? "Created successfully" };
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
  return { ResponseMessage: row?.ResponseMessage ?? "Updated successfully" };
}

// ─────────────────────────────────────────────────────────────
// DELETE — Mode 3
// rowsAffected=[1,1] confirms DB update happens
// SP returns empty recordset after delete — that is OK
// ─────────────────────────────────────────────────────────────
async function deleteSetup({ companyId, userId, typeStr, uid }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 3, gTypeMUid, uid: Number(uid),
    code: "", name: "", shortName: "",
  });
  return { ResponseMessage: row?.ResponseMessage ?? "Deleted successfully" };
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
  return { ResponseMessage: row?.ResponseMessage ?? "Restored successfully" };
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

// exports moved to bottom

// ─────────────────────────────────────────────────────────────
// LOCATION service functions
// ─────────────────────────────────────────────────────────────
async function getLocationData({ companyId, tag }) {
  const rows = await repo.getLocationGrid({ companyId, tag: tag ?? 1 });
  return rows
    .filter(r => r.uid !== undefined || r.gcode !== undefined)
    .map(r => ({
      uid:    Number(r.uid    ?? r.Uid    ?? 0),   // SP returns uid as string — convert to number
      code:   r.gcode  ?? r.Gcode  ?? "",
      name:   r.gname  ?? r.Gname  ?? "",
      gpsId1: r.gpsid1 ?? r.GpsId1 ?? "",
      gpsId2: r.gpsid2 ?? r.GpsId2 ?? "",
      active: r.active ?? r.Active ?? true,
    }));
}

async function createLocation({ companyId, userId, body }) {
  const row = await repo.iudLocation({
    companyId, userId, mode: 1, uid: 0,
    code: body.code || "", name: body.name || "",
    gpsId1: body.gpsId1 || "", gpsId2: body.gpsId2 || "",
  });
  return { ResponseMessage: row?.ResponseMessage ?? "Location created successfully" };
}

async function updateLocation({ companyId, userId, uid, body }) {
  const row = await repo.iudLocation({
    companyId, userId, mode: 2, uid: Number(uid),
    code: body.code || "", name: body.name || "",
    gpsId1: body.gpsId1 || "", gpsId2: body.gpsId2 || "",
  });
  return { ResponseMessage: row?.ResponseMessage ?? "Location updated successfully" };
}

async function deleteLocation({ companyId, userId, uid }) {
  const row = await repo.iudLocation({
    companyId, userId, mode: 3, uid: Number(uid),
    code: "", name: "", gpsId1: "", gpsId2: "",
  });
  return { ResponseMessage: row?.ResponseMessage ?? "Location deleted successfully" };
}

// Re-export including location functions
module.exports = {
  getSetupData, createSetup, updateSetup, deleteSetup, restoreSetup, getDropdown,
  getLocationData, createLocation, updateLocation, deleteLocation,
};