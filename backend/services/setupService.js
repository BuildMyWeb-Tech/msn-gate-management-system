// services/setupService.js
const repo = require('../repositories/setupRepo');

function isSpError(row) {
  if (!row) return false;
  const code = row.ResponseCode ?? row.responseCode;
  if (code === undefined || code === null) return false;
  return code !== 100 && code !== 101;
}
function getMsg(row, fallback) {
  return row?.ResponseMessage ?? row?.responseMessage ?? row?.Message ?? fallback;
}
function isDataRow(r) {
  return r.uid !== undefined || r.gcode !== undefined || r.gname !== undefined;
}

// ── GATES + DESIGNATIONS ─────────────────────────────────────
const GTYPE = { gates: 2, designations: 1 };
const getGType = (t) => GTYPE[t?.toLowerCase()] ?? 0;

async function getSetupData({ companyId, typeStr, tag }) {
  const gTypeMUid = getGType(typeStr);
  const rows = await repo.getGeneralGrid({ companyId, gTypeMUid, tag: tag ?? 1 });
  return rows.filter(isDataRow).map((r) => ({
    uid: Number(r.uid ?? r.Uid ?? 0),
    code: r.gcode ?? r.Gcode ?? '',
    name: r.gname ?? r.Gname ?? '',
    shortName: r.gsname ?? r.Gsname ?? '',
    active: r.active ?? r.Active ?? true,
  }));
}

async function createSetup({ companyId, userId, typeStr, body }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId,
    userId,
    mode: 1,
    gTypeMUid,
    uid: 0,
    code: body.code || '',
    name: body.name || '',
    shortName: body.shortName || '',
  });
  if (isSpError(row)) {
    const e = new Error(getMsg(row, 'Duplicate code'));
    e.status = 400;
    throw e;
  }
  return { ResponseMessage: getMsg(row, 'Created successfully') };
}

async function updateSetup({ companyId, userId, typeStr, uid, body }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId,
    userId,
    mode: 2,
    gTypeMUid,
    uid: Number(uid),
    code: body.code || '',
    name: body.name || '',
    shortName: body.shortName || '',
  });
  if (isSpError(row)) {
    const e = new Error(getMsg(row, 'Duplicate code'));
    e.status = 400;
    throw e;
  }
  return { ResponseMessage: getMsg(row, 'Updated successfully') };
}

async function deleteSetup({ companyId, userId, typeStr, uid }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId,
    userId,
    mode: 3,
    gTypeMUid,
    uid: Number(uid),
    code: '',
    name: '',
    shortName: '',
  });
  return { ResponseMessage: getMsg(row, 'Deleted successfully') };
}

async function restoreSetup({ companyId, userId, typeStr, uid }) {
  const gTypeMUid = getGType(typeStr);
  const row = await repo.iudGeneral({
    companyId,
    userId,
    mode: 4,
    gTypeMUid,
    uid: Number(uid),
    code: '',
    name: '',
    shortName: '',
  });
  return { ResponseMessage: getMsg(row, 'Restored successfully') };
}

async function getDropdown({ companyId, typeStr }) {
  const type = getGType(typeStr);
  const rows = await repo.getSetupDropdown({ companyId, type });
  return rows.filter(isDataRow).map((r) => ({
    id: r.uid ?? r.Uid ?? 0,
    code: r.gcode ?? r.code ?? '',
    name: r.gname ?? r.name ?? '',
  }));
}

// ── LOCATIONS ─────────────────────────────────────────────────
async function getLocationData({ companyId, tag }) {
  const rows = await repo.getLocationGrid({ companyId, tag: tag ?? 1 });
  return rows
    .filter((r) => r.uid !== undefined || r.gcode !== undefined)
    .map((r) => ({
      uid: Number(r.uid ?? r.Uid ?? 0),
      code: r.gcode ?? r.Gcode ?? '',
      name: r.gname ?? r.Gname ?? '',
      gpsId1: r.gpsid1 ?? r.GpsId1 ?? '',
      gpsId2: r.gpsid2 ?? r.GpsId2 ?? '',
      active: r.active ?? r.Active ?? true,
    }));
}

async function createLocation({ companyId, userId, body }) {
  const row = await repo.iudLocation({
    companyId,
    userId,
    mode: 1,
    uid: 0,
    code: body.code || '',
    name: body.name || '',
    gpsId1: body.gpsId1 || '',
    gpsId2: body.gpsId2 || '',
  });
  if (isSpError(row)) {
    const e = new Error(getMsg(row, 'Duplicate code'));
    e.status = 400;
    throw e;
  }
  return { ResponseMessage: getMsg(row, 'Created successfully') };
}

async function updateLocation({ companyId, userId, uid, body }) {
  const row = await repo.iudLocation({
    companyId,
    userId,
    mode: 2,
    uid: Number(uid),
    code: body.code || '',
    name: body.name || '',
    gpsId1: body.gpsId1 || '',
    gpsId2: body.gpsId2 || '',
  });
  if (isSpError(row)) {
    const e = new Error(getMsg(row, 'Duplicate code'));
    e.status = 400;
    throw e;
  }
  return { ResponseMessage: getMsg(row, 'Updated successfully') };
}

async function deleteLocation({ companyId, userId, uid }) {
  const row = await repo.iudLocation({
    companyId,
    userId,
    mode: 3,
    uid: Number(uid),
    code: '',
    name: '',
    gpsId1: '',
    gpsId2: '',
  });
  return { ResponseMessage: getMsg(row, 'Deleted successfully') };
}

// ── SECURITIES ────────────────────────────────────────────────
// Fix 2: Photo — SP returns PhotoPath as server file path "/Security/xxx"
// Frontend can't render file paths as images — needs base64
// Solution: store photo as base64 in SP via PhotoPath field
// When PhotoPath starts with "data:" it's base64, else it's a server path

async function getSecurityData({ companyId, tag }) {
  const rows = await repo.getSecurityGrid({ companyId, tag: tag ?? 1 });
  if (rows.length > 0) {
    console.log('[getSecurityData] columns:', Object.keys(rows[0]));
    console.log('[getSecurityData] sample:', JSON.stringify(rows[0]));
  }
  return rows
    .filter((r) => r.UId !== undefined || r.SCode !== undefined || r.uid !== undefined)
    .map((r) => {
      const photoPath = r.PhotoPath ?? r.photoPath ?? r.Photo ?? r.photo ?? '';
      // If PhotoPath contains base64 data, use it; otherwise keep as path reference
      const photo = photoPath && photoPath.startsWith('data:') ? photoPath : '';

      return {
        uid: Number(r.UId ?? r.uid ?? 0),
        code: r.SCode ?? r.scode ?? r.code ?? '',
        name: r.SName ?? r.sname ?? r.name ?? '',
        gender: r.Gender ?? r.gender ?? '',
        mobile1: String(r.Smobile1 ?? r.smobile1 ?? r.mobile1 ?? ''),
        mobile2: String(r.SMobile2 ?? r.smobile2 ?? r.mobile2 ?? ''),
        password: r.SPassword ?? r.spassword ?? r.password ?? '',
        addr1: r.Address1 ?? r.address1 ?? r.addr1 ?? '',
        addr2: r.Address2 ?? r.address2 ?? r.addr2 ?? '',
        addr3: r.Address3 ?? r.address3 ?? r.addr3 ?? '',
        addr4: r.Address4 ?? r.address4 ?? r.addr4 ?? '',
        photoPath, // keep original path for reference
        photo, // base64 only
        active: r.Active ?? r.active ?? true,
      };
    });
}

function buildSecurityJson({ companyId, userId, uid, body, isDelete = false }) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 23);
  return JSON.stringify({
    UId: Number(uid) || 0,
    SCode: body.code || '',
    SName: body.name || '',
    Gender: body.gender || '',
    Smobile1: parseInt(body.mobile1, 10) || 0,
    SMobile2: parseInt(body.mobile2, 10) || 0,
    SPassword: body.password || '',
    Address1: body.addr1 || null,
    Address2: body.addr2 || null,
    Address3: body.addr3 || null,
    Address4: body.addr4 || null,
    Address5: null,
    PhotoPath: '/Security/',
    Active: isDelete ? 0 : 1,
    Companyid: companyId,
    CreatedBy: userId,
    CreatedOn: now,
    DeletedBy: isDelete ? userId : null,
    DeletedOn: isDelete ? now : null,
  });
}

async function createSecurity({ companyId, userId, body }) {
  const json = buildSecurityJson({ companyId, userId, uid: 0, body });
  console.log('[createSecurity] JSON:', json);
  const row = await repo.iudSecurity(json);
  if (isSpError(row)) {
    const e = new Error(getMsg(row, 'Duplicate code'));
    e.status = 400;
    throw e;
  }
  return { ResponseMessage: getMsg(row, 'Created successfully') };
}

async function updateSecurity({ companyId, userId, uid, body }) {
  const json = buildSecurityJson({ companyId, userId, uid, body });
  console.log('[updateSecurity] JSON:', json);
  const row = await repo.iudSecurity(json);
  if (isSpError(row)) {
    const e = new Error(getMsg(row, 'Duplicate code'));
    e.status = 400;
    throw e;
  }
  return { ResponseMessage: getMsg(row, 'Updated successfully') };
}

async function deleteSecurity({ companyId, userId, uid }) {
  const body = {
    code: '',
    name: '',
    gender: '',
    mobile1: '0',
    mobile2: '0',
    password: '',
    addr1: null,
    addr2: null,
    addr3: null,
    addr4: null,
  };
  const json = buildSecurityJson({ companyId, userId, uid, body, isDelete: true });
  const row = await repo.iudSecurity(json);
  return { ResponseMessage: getMsg(row, 'Deleted successfully') };
}

module.exports = {
  getSetupData,
  createSetup,
  updateSetup,
  deleteSetup,
  restoreSetup,
  getDropdown,
  getLocationData,
  createLocation,
  updateLocation,
  deleteLocation,
  getSecurityData,
  createSecurity,
  updateSecurity,
  deleteSecurity,
};
