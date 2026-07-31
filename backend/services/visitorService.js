// services/visitorService.js
const repo = require('../repositories/visitorRepo');

// ─────────────────────────────────────────────────────────────
// Normalise SP response columns
// SP field names from manager JSON:
// uid, YearSlno, GateUid, Companyid, VDt, VName, VMobile,
// VType, VCompany, ToMeet, VNotes, VVehicleNo, VIntime,
// VOuttime, VPhotoPath, VisitorCount, Active, Userid_in, Userid_out
// ─────────────────────────────────────────────────────────────
function normalise(r) {
  return {
    uid: Number(r.uid ?? r.Uid ?? 0),
    name: r.VName ?? r.vname ?? r.Name ?? '',
    mobile: String(r.VMobile ?? r.vmobile ?? r.Mobile ?? ''),
    visitorType: r.VType ?? r.vtype ?? r.VistorType ?? '',
    company: r.VCompany ?? r.vcompany ?? r.Company ?? '',
    toMeet: r.ToMeet ?? r.tomeet ?? r.Tomeet ?? '',
    notes: r.VNotes ?? r.vnotes ?? r.Notes ?? '',
    vehicleNo: r.VVehicleNo ?? r.vvehicleno ?? r.VehicleNo ?? '',
    inTime: r.VIntime ?? r.vintime ?? r.InTime ?? null,
    outTime: r.VOuttime ?? r.vouttime ?? r.OutTime ?? null,
    photo: r.VPhotoPath ?? r.vphotopath ?? '',
    visitorCount: r.VisitorCount ?? r.visitorcount ?? 1,
    yearSlno: r.YearSlno ?? r.yearslno ?? 0,
    gateUid: r.GateUid ?? r.gateuid ?? 0,
    active: r.Active ?? r.active ?? true,
  };
}

async function getVisitors({ companyId, gateId, date }) {
  const rows = await repo.getVisitorGrid({
    companyId,
    gateId: gateId || 0,
    date: date || new Date().toISOString().split('T')[0],
    tag: 1,
  });
  return rows.filter((r) => r.uid !== undefined || r.VName !== undefined).map(normalise);
}

// ─────────────────────────────────────────────────────────────
// Build JSON array for PR_IU_Visitors
// ─────────────────────────────────────────────────────────────
function buildVisitorJson({ companyId, gateId, userId, uid, body }) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 23);
  const vDt = body.inTime || now;
  const record = {
    uid: Number(uid) || 0,
    YearSlno: body.yearSlno || 0,
    GateUid: Number(gateId) || 0,
    Companyid: companyId,
    VDt: vDt,
    VName: body.name || '',
    VMobile: parseInt(body.mobile, 10) || 0,
    VType: body.visitorType || '',
    VCompany: body.company || '',
    ToMeet: body.toMeet || '',
    VNotes: body.notes || '',
    VVehicleNo: body.vehicleNo || '',
    VIntime: body.inTime || now,
    VOuttime: body.outTime || null,
    VPhotoPath: '/Photo/',
    VisitorCount: body.visitorCount || 1,
    Active: 1,
    Userid_in: userId,
    Userid_out: null,
  };
  return JSON.stringify([record]);
}

async function createVisitor({ companyId, gateId, userId, body }) {
  const json = buildVisitorJson({ companyId, gateId, userId, uid: 0, body });
  console.log('[createVisitor] JSON:', json);
  const row = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? 'Visitor registered successfully' };
}

async function updateVisitor({ companyId, gateId, userId, uid, body }) {
  const json = buildVisitorJson({ companyId, gateId, userId, uid, body });
  console.log('[updateVisitor] JSON:', json);
  const row = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? 'Visitor updated successfully' };
}

async function markVisitorOut({ companyId, userId, uid, body }) {
  const outTime = new Date().toISOString().replace('T', ' ').slice(0, 23);
  const updated = { ...body, outTime, Userid_out: userId };
  const json = buildVisitorJson({
    companyId,
    gateId: body.gateUid || 0,
    userId,
    uid,
    body: updated,
  });
  const row = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? 'Visitor checked out' };
}

async function deleteVisitor({ uid }) {
  const row = await repo.deleteVisitor(uid);
  return { ResponseMessage: row?.ResponseMessage ?? 'Visitor deleted' };
}

module.exports = { getVisitors, createVisitor, updateVisitor, markVisitorOut, deleteVisitor };
