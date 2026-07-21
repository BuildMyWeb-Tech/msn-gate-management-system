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


// ─────────────────────────────────────────────────────────────
// SECURITIES
// SP: PR_GetSecurityData_FrontGrid — @Tag bit, @companyid int
// SP: PR_IUD_Security              — @Json NVARCHAR(MAX)
// JSON fields: UId(0=Add), SCode, SName, Gender, Smobile1,
//              SMobile2, SPassword, Address1-5, PhotoPath,
//              Active(1=active, 0=delete), Companyid,
//              CreatedBy, CreatedOn, DeletedBy, DeletedOn
// ─────────────────────────────────────────────────────────────
async function getSecurityData({ companyId, tag }) {
  const rows = await repo.getSecurityGrid({ companyId, tag: tag ?? 1 });
  return rows
    .filter(r => r.UId !== undefined || r.SCode !== undefined || r.uid !== undefined)
    .map(r => ({
      uid:       Number(r.UId      ?? r.uid      ?? 0),
      code:      r.SCode    ?? r.scode    ?? "",
      name:      r.SName    ?? r.sname    ?? "",
      gender:    r.Gender   ?? r.gender   ?? "",
      mobile1:   String(r.Smobile1 ?? r.smobile1 ?? ""),
      mobile2:   String(r.SMobile2 ?? r.smobile2 ?? ""),
      password:  r.SPassword?? r.spassword?? "",
      addr1:     r.Address1 ?? r.address1 ?? "",
      addr2:     r.Address2 ?? r.address2 ?? "",
      addr3:     r.Address3 ?? r.address3 ?? "",
      addr4:     r.Address4 ?? r.address4 ?? "",
      photo:     r.PhotoPath?? r.photoPath?? "",
      active:    r.Active   ?? r.active   ?? true,
    }));
}

async function createSecurity({ companyId, userId, body }) {
  const now     = new Date().toISOString().replace("T", " ").slice(0, 23);
  const payload = {
    UId:       0,
    SCode:     body.code      || "",
    SName:     body.name      || "",
    Gender:    body.gender    || "",
    Smobile1:  Number(body.mobile1) || 0,
    SMobile2:  Number(body.mobile2) || 0,
    SPassword: body.password  || "",
    Address1:  body.addr1     || null,
    Address2:  body.addr2     || null,
    Address3:  body.addr3     || null,
    Address4:  body.addr4     || null,
    Address5:  null,
    PhotoPath: body.photo ? `/Security/${body.code}` : "/Security/",
    Active:    1,
    Companyid: companyId,
    CreatedBy: userId,
    CreatedOn: now,
    DeletedBy: null,
    DeletedOn: null,
  };
  const row = await repo.iudSecurity(JSON.stringify(payload));
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code already exists"));
    err.status = 400;
    throw err;
  }
  return { ResponseMessage: getMsg(row, "Security created successfully") };
}

async function updateSecurity({ companyId, userId, uid, body }) {
  const now     = new Date().toISOString().replace("T", " ").slice(0, 23);
  const payload = {
    UId:       Number(uid),
    SCode:     body.code      || "",
    SName:     body.name      || "",
    Gender:    body.gender    || "",
    Smobile1:  Number(body.mobile1) || 0,
    SMobile2:  Number(body.mobile2) || 0,
    SPassword: body.password  || "",
    Address1:  body.addr1     || null,
    Address2:  body.addr2     || null,
    Address3:  body.addr3     || null,
    Address4:  body.addr4     || null,
    Address5:  null,
    PhotoPath: body.photo ? `/Security/${body.code}` : "/Security/",
    Active:    1,
    Companyid: companyId,
    CreatedBy: userId,
    CreatedOn: now,
    DeletedBy: null,
    DeletedOn: null,
  };
  const row = await repo.iudSecurity(JSON.stringify(payload));
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code already exists"));
    err.status = 400;
    throw err;
  }
  return { ResponseMessage: getMsg(row, "Security updated successfully") };
}

async function deleteSecurity({ companyId, userId, uid }) {
  const now     = new Date().toISOString().replace("T", " ").slice(0, 23);
  const payload = {
    UId:       Number(uid),
    SCode:     "",
    SName:     "",
    Gender:    "",
    Smobile1:  0,
    SMobile2:  0,
    SPassword: "",
    Address1:  null,
    Address2:  null,
    Address3:  null,
    Address4:  null,
    Address5:  null,
    PhotoPath: "/Security/",
    Active:    0,            // Active=0 = soft delete
    Companyid: companyId,
    CreatedBy: userId,
    CreatedOn: now,
    DeletedBy: userId,
    DeletedOn: now,
  };
  const row = await repo.iudSecurity(JSON.stringify(payload));
  return { ResponseMessage: getMsg(row, "Security deleted successfully") };
}

module.exports = {
  getSetupData, createSetup, updateSetup, deleteSetup, restoreSetup, getDropdown,
  getLocationData, createLocation, updateLocation, deleteLocation,
  getSecurityData, createSecurity, updateSecurity, deleteSecurity,
};