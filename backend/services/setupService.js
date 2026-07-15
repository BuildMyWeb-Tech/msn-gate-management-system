// services/setupService.js
const repo = require("../repositories/setupRepo");

// gtypemuid mapping — confirmed by manager
const GTYPE = { gates: 2, designations: 1 };
const getGType = (typeStr) => GTYPE[typeStr?.toLowerCase()] ?? 0;

// ─────────────────────────────────────────────────────────────
// Helper — extract ResponseMessage safely from SP result
// SP may return: { ResponseMessage: "..." } or nothing
// If nothing returned, we still treat it as success
// (SP ran without throwing = operation succeeded)
// ─────────────────────────────────────────────────────────────
const getMsg = (row, fallback) =>
  row?.ResponseMessage ?? row?.responseMessage ?? row?.Message ?? row?.message ?? fallback;

// ─────────────────────────────────────────────────────────────
// GET grid
// ─────────────────────────────────────────────────────────────
async function getSetupData({ companyId, typeStr, tag }) {
  const gTypeMUid = getGType(typeStr);
  const rows = await repo.getGeneralGrid({ companyId, gTypeMUid, tag: tag ?? 1 });
  return rows.map(r => ({
    uid:       r.Uid       ?? r.uid       ?? 0,
    code:      r.gcode     ?? r.Gcode     ?? r.code      ?? "",
    name:      r.gname     ?? r.Gname     ?? r.name      ?? "",
    shortName: r.gsname    ?? r.Gsname    ?? r.shortName ?? "",
    active:    r.active    ?? r.Active    ?? 1,
  }));
}

// ─────────────────────────────────────────────────────────────
// CREATE — Mode 1
// ─────────────────────────────────────────────────────────────
async function createSetup({ companyId, userId, typeStr, body }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 1, gTypeMUid, uid: 0,
    code:      body.code      || "",
    name:      body.name      || "",
    shortName: body.shortName || "",
  });
  return { ResponseMessage: getMsg(row, "Created successfully") };
}

// ─────────────────────────────────────────────────────────────
// UPDATE — Mode 2
// SP may return empty recordset — that is OK, means success
// ─────────────────────────────────────────────────────────────
async function updateSetup({ companyId, userId, typeStr, uid, body }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 2, gTypeMUid, uid: Number(uid),
    code:      body.code      || "",
    name:      body.name      || "",
    shortName: body.shortName || "",
  });
  return { ResponseMessage: getMsg(row, "Updated successfully") };
}

// ─────────────────────────────────────────────────────────────
// DELETE — Mode 3 (soft delete)
// SP may return empty recordset — that is OK, means success
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
  return rows.map(r => ({
    id:   r.Uid   ?? r.uid   ?? 0,
    code: r.gcode ?? r.code  ?? "",
    name: r.gname ?? r.name  ?? "",
  }));
}

module.exports = {
  getSetupData, createSetup, updateSetup,
  deleteSetup, restoreSetup, getDropdown,
};