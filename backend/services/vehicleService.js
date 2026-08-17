const repo = require("../repositories/vehicleRepo");

function safeMobile(raw) {
  if (!raw && raw !== 0) return "";
  try { return BigInt(Math.round(Number(raw))).toString(); }
  catch { return String(raw); }
}

function cleanPhoto(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (s.startsWith("/Photo/") || s.startsWith("/Vehicle/")) return ""; // old file paths
  if (s.startsWith("data:image")) return s;  // data URI
  return s; // Cloudinary URL or base64
}

function normalise(r) {
  const vidcard  = r.Vidcard ?? r.vidcard ?? "";
  const sep      = vidcard.indexOf(":");
  return {
    uid:       Number(r.uid      ?? r.Uid      ?? 0),
    name:      r.VName    ?? r.vname    ?? "",
    mobile:    safeMobile(r.VMobile ?? r.vmobile),
    visitType: r.VType    ?? r.vtype    ?? "",
    company:   r.VCompany ?? r.vcompany ?? "",
    toMeet:    r.ToMeet   ?? r.tomeet   ?? "",
    notes:     r.VNotes   ?? r.vnotes   ?? "",
    vehicleNo: r.VVehicleNo ?? r.vvehicleno ?? "",
    warehouse: r.warehouseuid ?? r.WarehouseUid ?? 0,
    inTime:    r.VIntime  ?? r.vintime  ?? null,
    outTime:   r.VOuttime ?? r.vouttime ?? null,
    photo:     cleanPhoto(r.VPhotoPath ?? r.vphotopath),
    yearSlno:  r.YearSlno ?? 0,
    gateUid:   r.GateUid  ?? r.gateuid  ?? 0,
    idType:    sep > -1 ? vidcard.slice(0, sep)  : "",
    idNumber:  sep > -1 ? vidcard.slice(sep + 1) : vidcard,
    active:    r.Active   ?? r.active   ?? true,
  };
}

function localNow() {
  const d = new Date();
  const p = (n, z=2) => String(n).padStart(z, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,"0")}`;
}

function localDateStr(d) {
  const dt = d ? new Date(d) : new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}

function buildJson({ companyId, gateId, userId, uid, body }) {
  const now     = localNow();
  const vidcard = body.idType && body.idNumber
    ? `${body.idType}:${body.idNumber}` : (body.idNumber || "");

  return JSON.stringify([{
    uid:          Number(uid) || 0,
    YearSlno:     body.yearSlno   || 0,
    GateUid:      Number(gateId)  || 0,
    Companyid:    companyId,
    Vidcard:      vidcard,
    VDt:          now,
    VName:        body.name       || "",
    VMobile:      parseInt(body.mobile, 10) || 0,
    VType:        body.visitType  || body.visitorType || "",
    VCompany:     body.company    || "",
    ToMeet:       body.toMeet     || "",
    VNotes:       body.notes      || "",
    VVehicleNo:   body.vehicleNo  || "",
    warehouseuid: Number(body.warehouse) || 0,
    VIntime:      now,
    VOuttime:     body.outTime    || null,
    // Photo: Cloudinary URL stored directly in VPhotoPath
    VPhotoPath:   body.photo      || "",
    Active:       1,
    Userid_in:    userId,
    Userid_out:   null,
  }]);
}

async function getVehicles({ companyId, gateId, date }) {
  const localDate = date || localDateStr();
  const rows = await repo.getVehicleGrid({
    companyId, gateId: gateId || 0, date: localDate, tag: 1,
  });
  return rows.filter(r => r.uid !== undefined || r.VName !== undefined).map(normalise);
}

async function getVehicleById({ companyId, uid }) {
  const today = localDateStr();
  let rows = await repo.getVehicleGrid({ companyId, gateId:0, date:today, tag:1 });
  let row  = rows.find(r => Number(r.uid ?? r.Uid) === Number(uid));
  if (!row) {
    const yd = new Date(); yd.setDate(yd.getDate()-1);
    rows = await repo.getVehicleGrid({ companyId, gateId:0, date:localDateStr(yd), tag:1 });
    row  = rows.find(r => Number(r.uid ?? r.Uid) === Number(uid));
  }
  return row ? normalise(row) : null;
}

async function createVehicle({ companyId, gateId, userId, body }) {
  const json = buildJson({ companyId, gateId, userId, uid:0, body });
  console.log("[createVehicle] JSON:", json);
  const row  = await repo.iuVehicle(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Vehicle registered" };
}

async function updateVehicle({ companyId, gateId, userId, uid, body }) {
  const json = buildJson({ companyId, gateId, userId, uid, body });
  const row  = await repo.iuVehicle(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Vehicle updated" };
}

async function markVehicleOut({ companyId, userId, uid, body }) {
  const now  = localNow();
  const json = buildJson({
    companyId, gateId: body.gateUid||0, userId, uid,
    body: { ...body, outTime: now },
  });
  const row = await repo.iuVehicle(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Vehicle checked out" };
}

async function deleteVehicle({ uid }) {
  const row = await repo.deleteVehicle(uid);
  return { ResponseMessage: row?.ResponseMessage ?? "Vehicle deleted" };
}

module.exports = {
  getVehicles, getVehicleById, createVehicle,
  updateVehicle, markVehicleOut, deleteVehicle,
};