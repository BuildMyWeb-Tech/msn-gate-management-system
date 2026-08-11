const repo = require("../repositories/visitorRepo");

// ── Helpers ───────────────────────────────────────────────────
function safeMobile(raw) {
  if (!raw && raw !== 0) return "";
  try { return BigInt(Math.round(Number(raw))).toString(); }
  catch { return String(raw); }
}

function cleanPhoto(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (s.startsWith("/Photo/")) return "";           // old file path — reject
  if (s.startsWith("data:image")) return s;         // data URI — keep as-is
  return s; // Cloudinary URL (/9j/ base64 / https://) — return as-is
}

function normalise(r) {
  const vidcard = r.Vidcard ?? r.vidcard ?? "";
  const sep     = vidcard.indexOf(":");
  const idType  = sep > -1 ? vidcard.slice(0, sep)  : "";
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

// Get local date string in YYYY-MM-DD without UTC conversion
function localDateStr(d) {
  const dt = d ? new Date(d) : new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}

// Get local datetime string for SP — YYYY-MM-DD HH:MM:SS.mmm
function localNow() {
  const d   = new Date();
  const pad = (n, z=2) => String(n).padStart(z,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,"0")}`;
}

function buildJson({ companyId, gateId, userId, uid, body }) {
  const now    = localNow();
  // VDt must be local date — SP filters by this date
  const vdt    = body.inTime
    ? localDateStr(new Date(body.inTime)) + " " + now.split(" ")[1]
    : now;

  const vidcard = body.idType && body.idNumber
    ? `${body.idType}:${body.idNumber}` : (body.idNumber || "");

  return JSON.stringify([{
    uid:          Number(uid) || 0,
    YearSlno:     body.yearSlno    || 0,
    GateUid:      Number(gateId)   || 0,
    Companyid:    companyId,
    Vidcard:      vidcard,
    VDt:          now,          // local datetime — SP uses date part for @Dt filter
    VName:        body.name        || "",
    VMobile:      parseInt(body.mobile, 10) || 0,
    VType:        body.visitorType  || "",
    VCompany:     body.company      || "",
    ToMeet:       body.toMeet       || "",
    VNotes:       body.notes        || "",
    VVehicleNo:   body.vehicleNo    || "",
    VIntime:      now,              // local in-time
    VOuttime:     body.outTime      || null,
    VPhotoPath:   body.photo        || "",
    VisitorCount: body.visitorCount  || 1,
    Active:       1,
    Userid_in:    userId,
    Userid_out:   null,
  }]);
}

async function getVisitors({ companyId, gateId, date }) {
  const localDate = date || localDateStr();
  const rows = await repo.getVisitorGrid({
    companyId, gateId: gateId || 0, date: localDate, tag: 1,
  });
  return rows.filter(r => r.uid !== undefined || r.VName !== undefined).map(normalise);
}

async function getVisitorById({ companyId, uid }) {
  const today     = localDateStr();
  let rows = await repo.getVisitorGrid({ companyId, gateId:0, date:today, tag:1 });
  let row  = rows.find(r => Number(r.uid ?? r.Uid) === Number(uid));
  if (!row) {
    // Try yesterday
    const yd = new Date(); yd.setDate(yd.getDate()-1);
    rows = await repo.getVisitorGrid({ companyId, gateId:0, date:localDateStr(yd), tag:1 });
    row  = rows.find(r => Number(r.uid ?? r.Uid) === Number(uid));
  }
  return row ? normalise(row) : null;
}

async function getVisitorByMobile({ mobile, companyId }) {
  const rows = await repo.getVisitorByMobile({ mobile, companyId });
  const data = (rows||[]).find(r => r.VName !== undefined || r.VMobile !== undefined);
  if (!data) return null;
  const vidcard = data.Vidcard ?? data.vidcard ?? "";
  const sep     = vidcard.indexOf(":");
  return {
    name:        data.VName    ?? "",
    mobile:      String(data.VMobile ?? mobile ?? ""),
    visitorType: data.VType    ?? "",
    company:     data.VCompany ?? "",
    toMeet:      data.ToMeet   ?? "",
    notes:       "",
    vehicleNo:   "",
    idType:  sep > -1 ? vidcard.slice(0, sep)  : "",
    idNumber:sep > -1 ? vidcard.slice(sep + 1) : vidcard,
  };
}

async function searchAllVisitors({ str, companyId }) {
  const rows = await repo.searchVisitors({ str, companyId });
  return rows.filter(r => r.uid !== undefined || r.VName !== undefined).map(normalise);
}

async function createVisitor({ companyId, gateId, userId, body }) {
  const json = buildJson({ companyId, gateId, userId, uid:0, body });
  console.log("[createVisitor] JSON:", json);
  const row = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor registered" };
}

async function updateVisitor({ companyId, gateId, userId, uid, body }) {
  const json = buildJson({ companyId, gateId, userId, uid, body });
  const row  = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor updated" };
}

async function markVisitorOut({ companyId, userId, uid, body }) {
  const now  = localNow();
  const json = buildJson({
    companyId, gateId: body.gateUid||0, userId, uid,
    body: { ...body, outTime: now },
  });
  const row = await repo.iuVisitor(json);
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