// services/setupService.js
// Type map: 1=Gates, 2=Securities, 3=Designations, 4=Locations
const repo = require("../repositories/setupRepo");

const TYPE_MAP = { gates: 1, securities: 2, designations: 3, locations: 4 };

function getType(typeStr) {
  return TYPE_MAP[typeStr?.toLowerCase()] || 0;
}

async function getSetupData({ companyCode, typeStr, tag }) {
  const type = getType(typeStr);
  const rows  = await repo.getSetupGrid({ companyCode, type, tag: tag ?? 1 });
  return rows.map((r) => ({
    uid:       r.Uid       ?? r.uid       ?? 0,
    code:      r.Code      ?? r.code      ?? "",
    name:      r.Name      ?? r.name      ?? "",
    extra:     r.Extra     ?? r.extra     ?? "",
    photo:     r.Photo     ?? r.photo     ?? "",
    active:    r.Active    ?? r.active    ?? 1,
    mobile:    r.Mobile    ?? r.mobile    ?? "",
    gender:    r.Gender    ?? r.gender    ?? "",
  }));
}

async function createSetup({ companyCode, typeStr, body }) {
  const type = getType(typeStr);
  const result = await repo.iudSetup({
    companyCode, mode: 1, type, uid: 0,
    code:  body.code      || "",
    name:  body.name      || "",
    extra: JSON.stringify({ mobile: body.mobile || "", gender: body.gender || "", description: body.description || "" }),
    photo: body.photo     || "",
  });
  return result;
}

async function updateSetup({ companyCode, typeStr, uid, body }) {
  const type = getType(typeStr);
  const result = await repo.iudSetup({
    companyCode, mode: 2, type, uid: Number(uid),
    code:  body.code      || "",
    name:  body.name      || "",
    extra: JSON.stringify({ mobile: body.mobile || "", gender: body.gender || "", description: body.description || "" }),
    photo: body.photo     || "",
  });
  return result;
}

async function deleteSetup({ companyCode, typeStr, uid }) {
  const type = getType(typeStr);
  const result = await repo.iudSetup({
    companyCode, mode: 3, type, uid: Number(uid),
    code: "", name: "", extra: "", photo: "",
  });
  return result;
}

async function restoreSetup({ companyCode, uid }) {
  return await repo.undeleteSetup({ companyCode, uid: Number(uid) });
}

async function getDropdown({ companyCode, typeStr }) {
  const type = getType(typeStr);
  const rows  = await repo.getSetupDropdown({ companyCode, type });
  return rows.map((r) => ({
    id:   r.Uid  ?? r.uid  ?? 0,
    code: r.Code ?? r.code ?? "",
    name: r.Name ?? r.name ?? "",
  }));
}

module.exports = {
  getSetupData,
  createSetup,
  updateSetup,
  deleteSetup,
  restoreSetup,
  getDropdown,
};
