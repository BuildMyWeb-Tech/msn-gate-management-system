// services/setupService.js
const repo = require("../repositories/setupRepo");

// ─────────────────────────────────────────────────────────────
// SP ResponseCode: 100/101 = success, 102+ = error
// ─────────────────────────────────────────────────────────────
function isSpError(row) {
  if (!row) return false;
  const code = row.ResponseCode ?? row.responseCode;
  if (code === undefined || code === null) return false;
  return code !== 100 && code !== 101;
}

function getMsg(row, fallback) {
  return row?.ResponseMessage ?? row?.responseMessage ??
         row?.Message         ?? row?.message         ?? fallback;
}

function isDataRow(r) {
  return r.uid !== undefined || r.gcode !== undefined || r.gname !== undefined;
}

// ─────────────────────────────────────────────────────────────
// GATES + DESIGNATIONS
// ─────────────────────────────────────────────────────────────
const GTYPE    = { gates: 2, designations: 1 };
const getGType = (typeStr) => GTYPE[typeStr?.toLowerCase()] ?? 0;

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

async function createSetup({ companyId, userId, typeStr, body }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 1, gTypeMUid, uid: 0,
    code: body.code || "", name: body.name || "", shortName: body.shortName || "",
  });
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code already exists"));
    err.status = 400; throw err;
  }
  return { ResponseMessage: getMsg(row, "Created successfully") };
}

async function updateSetup({ companyId, userId, typeStr, uid, body }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 2, gTypeMUid, uid: Number(uid),
    code: body.code || "", name: body.name || "", shortName: body.shortName || "",
  });
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code already exists"));
    err.status = 400; throw err;
  }
  return { ResponseMessage: getMsg(row, "Updated successfully") };
}

async function deleteSetup({ companyId, userId, typeStr, uid }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 3, gTypeMUid, uid: Number(uid),
    code: "", name: "", shortName: "",
  });
  return { ResponseMessage: getMsg(row, "Deleted successfully") };
}

async function restoreSetup({ companyId, userId, typeStr, uid }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId, userId, mode: 4, gTypeMUid, uid: Number(uid),
    code: "", name: "", shortName: "",
  });
  return { ResponseMessage: getMsg(row, "Restored successfully") };
}

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
// LOCATIONS
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

async function createLocation({ companyId, userId, body }) {
  const row = await repo.iudLocation({
    companyId, userId, mode: 1, uid: 0,
    code: body.code || "", name: body.name || "",
    gpsId1: body.gpsId1 || "", gpsId2: body.gpsId2 || "",
  });
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code already exists"));
    err.status = 400; throw err;
  }
  return { ResponseMessage: getMsg(row, "Location created successfully") };
}

async function updateLocation({ companyId, userId, uid, body }) {
  const row = await repo.iudLocation({
    companyId, userId, mode: 2, uid: Number(uid),
    code: body.code || "", name: body.name || "",
    gpsId1: body.gpsId1 || "", gpsId2: body.gpsId2 || "",
  });
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code already exists"));
    err.status = 400; throw err;
  }
  return { ResponseMessage: getMsg(row, "Location updated successfully") };
}

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
// SP columns returned: UId, SCode, SName, Gender, Smobile1(int),
//   SMobile2(int), SPassword, Address1-5, PhotoPath, Active
//
// SP: PR_IUD_Security — @Json NVARCHAR(MAX)
// JSON: { UId, SCode, SName, Gender, Smobile1(int), SMobile2(int),
//         SPassword, Address1-5, PhotoPath, Active,
//         Companyid, CreatedBy, CreatedOn, DeletedBy, DeletedOn }
// UId=0 for Add, existing uid for Update, Active=0 for Delete
// ─────────────────────────────────────────────────────────────
async function getSecurityData({ companyId, tag }) {
  const rows = await repo.getSecurityGrid({ companyId, tag: tag ?? 1 });
  // Log raw SP response to see exact column names and values
  if (rows.length > 0) {
    console.log("[getSecurityData] raw columns:", Object.keys(rows[0]));
    console.log("[getSecurityData] first row:", JSON.stringify(rows[0]));
  }
  return rows
    // Filter out SP message rows (only have ResponseCode/ResponseMessage)
    .filter(r => r.UId !== undefined || r.SCode !== undefined || r.uid !== undefined)
    .map(r => ({
      uid:      Number(r.UId      ?? r.uid      ?? 0),
      code:     r.SCode    ?? r.scode    ?? "",
      name:     r.SName    ?? r.sname    ?? "",
      // Fix #3: Gender — SP returns "Gender" column exactly
      gender:   r.Gender   ?? r.gender   ?? "",
      // Fix #3: Mobile — SP returns as integers
      mobile1:  String(r.Smobile1 ?? r.smobile1 ?? ""),
      mobile2:  String(r.SMobile2 ?? r.smobile2 ?? ""),
      password: r.SPassword?? r.spassword?? "",
      addr1:    r.Address1 ?? r.address1 ?? "",
      addr2:    r.Address2 ?? r.address2 ?? "",
      addr3:    r.Address3 ?? r.address3 ?? "",
      addr4:    r.Address4 ?? r.address4 ?? "",
      // PhotoPath is a server file path "/Security/xxx" — not base64
      // Store path for reference but don't render as image unless it IS base64
      photo:    "",
      photoPath: r.PhotoPath ?? r.photoPath ?? "/Security/",
      active:   r.Active   ?? r.active   ?? true,
    }));
}

// Fix #2: buildSecurityJson — exact JSON format SP expects
function buildSecurityJson({ companyId, userId, uid, body, isDelete = false }) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 23);
  return JSON.stringify({
    UId:       Number(uid) || 0,
    SCode:     body.code      || "",
    SName:     body.name      || "",
    Gender:    body.gender    || "",
    // Smobile1 and SMobile2 must be integers in JSON
    Smobile1:  parseInt(body.mobile1, 10) || 0,
    SMobile2:  parseInt(body.mobile2, 10) || 0,
    SPassword: body.password  || "",
    Address1:  body.addr1     || null,
    Address2:  body.addr2     || null,
    Address3:  body.addr3     || null,
    Address4:  body.addr4     || null,
    Address5:  null,
    PhotoPath: "/Security/",
    // Active=1 for add/update, Active=0 for soft delete
    Active:    isDelete ? 0 : 1,
    Companyid: companyId,
    CreatedBy: userId,
    CreatedOn: now,
    DeletedBy: isDelete ? userId : null,
    DeletedOn: isDelete ? now   : null,
  });
}

async function createSecurity({ companyId, userId, body }) {
  const json = buildSecurityJson({ companyId, userId, uid: 0, body });
  console.log("[createSecurity] JSON:", json); // debug — remove after confirming
  const row = await repo.iudSecurity(json);
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code already exists"));
    err.status = 400; throw err;
  }
  return { ResponseMessage: getMsg(row, "Security created successfully") };
}

async function updateSecurity({ companyId, userId, uid, body }) {
  const json = buildSecurityJson({ companyId, userId, uid, body });
  console.log("[updateSecurity] JSON:", json); // debug — remove after confirming
  const row = await repo.iudSecurity(json);
  if (isSpError(row)) {
    const err = new Error(getMsg(row, "Duplicate record — code already exists"));
    err.status = 400; throw err;
  }
  return { ResponseMessage: getMsg(row, "Security updated successfully") };
}

async function deleteSecurity({ companyId, userId, uid }) {
  // For delete: pass existing record data — need to fetch it first
  // Use placeholder body since SP only checks Active=0 for delete
  const body = { code:"", name:"", gender:"", mobile1:"0", mobile2:"0",
                 password:"", addr1:null, addr2:null, addr3:null, addr4:null };
  const json = buildSecurityJson({ companyId, userId, uid, body, isDelete: true });
  const row  = await repo.iudSecurity(json);
  return { ResponseMessage: getMsg(row, "Security deleted successfully") };
}

module.exports = {
  getSetupData, createSetup, updateSetup, deleteSetup, restoreSetup, getDropdown,
  getLocationData, createLocation, updateLocation, deleteLocation,
  getSecurityData, createSecurity, updateSecurity, deleteSecurity,
};