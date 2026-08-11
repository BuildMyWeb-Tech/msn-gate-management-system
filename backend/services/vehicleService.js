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
  if (s.startsWith("/Photo/")) return "";
  if (s.startsWith("data:image")) return s.split(",")[1] || "";
  return s; // Cloudinary URL or base64 — return as-is
}

function normalise(r) {
  const vidcard = r.Vidcard ?? r.vidcard ?? "";
  const sep     = vidcard.indexOf(":");
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
    idType:    sep > -1 ? vidcard.slice(0, sep) : "",
    idNumber:  sep > -1 ? vidcard.slice(sep + 1) : vidcard,
    active:    r.Active   ?? r.active   ?? true,
  };
}

function buildJson({ companyId, gateId, userId, uid, body }) {
  const now = new Date().toISOString().replace("T"," ").slice(0,23);
  const vidcard = body.idType && body.idNumber
    ? `${body.idType}:${body.idNumber}` : (body.idNumber || "");
  return JSON.stringify([{
    uid:          Number(uid) || 0,
    YearSlno:     body.yearSlno   || 0,
    GateUid:      Number(gateId)  || 0,
    Companyid:    companyId,
    Vidcard:      vidcard,
    VDt:          body.inTime     || now,
    VName:        body.name       || "",
    VMobile:      parseInt(body.mobile, 10) || 0,
    VType:        body.visitType  || "",
    VCompany:     body.company    || "",
    ToMeet:       body.toMeet     || "",
    VNotes:       body.notes      || "",
    VVehicleNo:   body.vehicleNo  || "",
    warehouseuid: Number(body.warehouse) || 0,
    VIntime:      body.inTime     || now,
    VOuttime:     body.outTime    || null,
    VPhotoPath:   body.photo      || "",
    Active:       1,
    Userid_in:    userId,
    Userid_out:   null,
  }]);
}

async function getVehicles({ companyId, gateId, date }) {
  const d = new Date();
  const localDate = date || `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const rows = await repo.getVehicleGrid({ companyId, gateId: gateId||0, date: localDate, tag: 1 });
  return rows.filter(r => r.uid !== undefined || r.VName !== undefined).map(normalise);
}

async function getVehicleById({ companyId, uid }) {
  const d = new Date();
  const localToday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const rows = await repo.getVehicleGrid({ companyId, gateId:0, date:localToday, tag:1 });
  const row  = rows.find(r => Number(r.uid ?? r.Uid) === Number(uid));
  return row ? normalise(row) : null;
}

async function createVehicle({ companyId, gateId, userId, body }) {
  const json = buildJson({ companyId, gateId, userId, uid:0, body });
  const row  = await repo.iuVehicle(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Vehicle registered" };
}

async function updateVehicle({ companyId, gateId, userId, uid, body }) {
  const json = buildJson({ companyId, gateId, userId, uid, body });
  const row  = await repo.iuVehicle(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Vehicle updated" };
}

async function markVehicleOut({ companyId, userId, uid, body }) {
  const now = new Date().toISOString().replace("T"," ").slice(0,23);
  const json = buildJson({ companyId, gateId: body.gateUid||0, userId, uid, body: { ...body, outTime: now } });
  const row  = await repo.iuVehicle(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Vehicle checked out" };
}

async function deleteVehicle({ uid }) {
  const row = await repo.deleteVehicle(uid);
  return { ResponseMessage: row?.ResponseMessage ?? "Vehicle deleted" };
}

module.exports = { getVehicles, getVehicleById, createVehicle, updateVehicle, markVehicleOut, deleteVehicle };