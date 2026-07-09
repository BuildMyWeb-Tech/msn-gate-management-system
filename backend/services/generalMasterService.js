const generalRepo = require("../repositories/generalRepo");
 
async function getGeneralMaster(type, tag) {
  const rows = await generalRepo.getGeneralData(type, tag);
  return rows.map(r => ({
    id:        r.Uid    ?? r.uid    ?? 0,
    code:      r.Gcode  ?? r.gcode  ?? "",
    name:      r.Gname  ?? r.gname  ?? "",
    shortName: r.Gsname ?? r.gsname ?? "",
    active:    r.Active ?? r.active ?? 1,
  }));
}
 
async function getAllGeneralMaster(type) {
  const [active, inactive] = await Promise.all([
    generalRepo.getGeneralData(type, 1),
    generalRepo.getGeneralData(type, 0),
  ]);
  return [...active, ...inactive].map(r => ({
    id:        r.Uid    ?? r.uid    ?? 0,
    code:      r.Gcode  ?? r.gcode  ?? "",
    name:      r.Gname  ?? r.gname  ?? "",
    shortName: r.Gsname ?? r.gsname ?? "",
    active:    r.Active ?? r.active ?? 1,
  }));
}
 
async function createGeneralMaster({ userId, type, code, name, shortName }) {
  const result = await generalRepo.iudGeneral({ mode: 1, userId, gtypeuid: type, code, name, shortName, uid: 0 });
  return result[0];
}
 
async function updateGeneralMaster({ userId, type, id, code, name, shortName }) {
  const result = await generalRepo.iudGeneral({ mode: 2, userId, gtypeuid: type, code, name, shortName, uid: id });
  return result[0];
}
 
async function deleteGeneralMaster({ userId, type, id }) {
  const result = await generalRepo.iudGeneral({ mode: 3, userId, gtypeuid: type, code: "", name: "", shortName: "", uid: id });
  return result[0];
}
 
// ✅ FIX 4: Only pass id — type not needed by SP
async function restoreGeneralMaster({ id }) {
  return await generalRepo.undeleteGeneral(id);
}
 
module.exports = {
  getGeneralMaster, getAllGeneralMaster,
  createGeneralMaster, updateGeneralMaster,
  deleteGeneralMaster, restoreGeneralMaster,
};