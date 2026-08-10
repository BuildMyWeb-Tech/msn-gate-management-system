const repo = require("../repositories/visitorRepo");

// ── Helpers ───────────────────────────────────────────────────
function safeMobile(raw) {
  if (!raw && raw !== 0) return "";
  try { return BigInt(Math.round(Number(raw))).toString(); }
  catch { return String(raw); }
}

// Photo stored as base64 in VPhotoPath
// JPEG base64 always starts with "/9j/" — do NOT reject strings starting with "/"
// Only reject actual file paths like "/Photo/filename.jpg"
function cleanPhoto(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  // Reject file paths like "/Photo/..." but NOT "/9j/..." (JPEG base64)
  if (s.startsWith("/Photo/")) return "";
  // Strip data URI prefix if present
  if (s.startsWith("data:image")) return s.split(",")[1] || "";
  // Raw base64 (including JPEG base64 starting with /9j/) — return as-is
  return s;
}

function normalise(r) {
  const vidcard = r.Vidcard ?? r.vidcard ?? "";
  const sep     = vidcard.indexOf(":");
  const idType  = sep > -1 ? vidcard.slice(0, sep) : "";
  const idNumber= sep > -1 ? vidcard.slice(sep + 1) : vidcard;

  return {
    uid:          Number(r.uid      ?? r.Uid      ?? 0),
    name:         r.VName    ?? r.vname    ?? "",
    mobile:       safeMobile(r.VMobile ?? r.vmobile),
    visitorType:  r.VType    ?? r.vtype    ?? "",
    company:      r.VCompany ?? r.vcompany ?? "",
    toMeet:       r.ToMeet   ?? r.tomeet   ?? "",
    notes:        r.VNotes   ?? r.vnotes   ?? "",
    vehicleNo:    r.VVehicleNo ?? r.vvehicleno ?? "",
    inTime:       r.VIntime  ?? r.vintime  ?? null,
    outTime:      r.VOuttime ?? r.vouttime ?? null,
    photo:        cleanPhoto(r.VPhotoPath ?? r.vphotopath),
    visitorCount: r.VisitorCount ?? 1,
    yearSlno:     r.YearSlno ?? 0,
    gateUid:      r.GateUid  ?? r.gateuid  ?? 0,
    idType,
    idNumber,
    active:       r.Active   ?? r.active   ?? true,
  };
}

function buildJson({ companyId, gateId, userId, uid, body }) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 23);
  const vidcard = body.idType && body.idNumber
    ? `${body.idType}:${body.idNumber}` : (body.idNumber || "");
  return JSON.stringify([{
    uid:          Number(uid) || 0,
    YearSlno:     body.yearSlno    || 0,
    GateUid:      Number(gateId)   || 0,
    Companyid:    companyId,
    Vidcard:      vidcard,
    VDt:          body.inTime      || now,
    VName:        body.name        || "",
    VMobile:      parseInt(body.mobile, 10) || 0,
    VType:        body.visitorType  || "",
    VCompany:     body.company      || "",
    ToMeet:       body.toMeet       || "",
    VNotes:       body.notes        || "",
    VVehicleNo:   body.vehicleNo    || "",
    VIntime:      body.inTime       || now,
    VOuttime:     body.outTime      || null,
    // Send base64 directly in VPhotoPath
    VPhotoPath:   body.photo        || "",
    VisitorCount: body.visitorCount  || 1,
    Active:       1,
    Userid_in:    userId,
    Userid_out:   null,
  }]);
}

async function getVisitors({ companyId, gateId, date }) {
  const d = new Date();
  const localDate = date || `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const rows = await repo.getVisitorGrid({ companyId, gateId: gateId || 0, date: localDate, tag: 1 });
  return rows.filter(r => r.uid !== undefined || r.VName !== undefined).map(normalise);
}

async function getVisitorById({ companyId, uid }) {
  const d = new Date();
  const localToday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  let rows = await repo.getVisitorGrid({ companyId, gateId: 0, date: localToday, tag: 1 });
  let row  = rows.find(r => Number(r.uid ?? r.Uid) === Number(uid));
  if (!row) {
    const yd = new Date(d); yd.setDate(yd.getDate() - 1);
    const yesterday = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,"0")}-${String(yd.getDate()).padStart(2,"0")}`;
    rows = await repo.getVisitorGrid({ companyId, gateId: 0, date: yesterday, tag: 1 });
    row  = rows.find(r => Number(r.uid ?? r.Uid) === Number(uid));
  }
  return row ? normalise(row) : null;
}

async function getVisitorByMobile({ mobile, companyId }) {
  const rows = await repo.getVisitorByMobile({ mobile, companyId });
  const data = (rows || []).find(r => r.VName !== undefined || r.VMobile !== undefined);
  if (!data) return null;
  const vidcard  = data.Vidcard ?? data.vidcard ?? "";
  const sep      = vidcard.indexOf(":");
  return {
    name:        data.VName    ?? "",
    mobile:      String(data.VMobile ?? mobile ?? ""),
    visitorType: data.VType    ?? "",
    company:     data.VCompany ?? "",
    toMeet:      data.ToMeet   ?? "",
    notes:       "",
    vehicleNo:   "",
    idType:  sep > -1 ? vidcard.slice(0, sep) : "",
    idNumber:sep > -1 ? vidcard.slice(sep + 1) : vidcard,
  };
}

async function searchAllVisitors({ str, companyId }) {
  const rows = await repo.searchVisitors({ str, companyId });
  return rows.filter(r => r.uid !== undefined || r.VName !== undefined).map(normalise);
}

async function createVisitor({ companyId, gateId, userId, body }) {
  const json = buildJson({ companyId, gateId, userId, uid: 0, body });
  const row  = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor registered" };
}

async function updateVisitor({ companyId, gateId, userId, uid, body }) {
  const json = buildJson({ companyId, gateId, userId, uid, body });
  const row  = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor updated" };
}

async function markVisitorOut({ companyId, userId, uid, body }) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 23);
  const json = buildJson({ companyId, gateId: body.gateUid || 0, userId, uid, body: { ...body, outTime: now } });
  const row  = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor checked out" };
}

async function deleteVisitor({ uid }) {
  const row = await repo.deleteVisitor(uid);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor deleted" };
}

module.exports = {
  getVisitors, getVisitorById, getVisitorByMobile, searchAllVisitors,
  createVisitor, updateVisitor, markVisitorOut, deleteVisitor,
};