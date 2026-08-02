const repo = require("../repositories/visitorRepo");

const ID_TYPES = ["Aadhar", "PAN", "VoterId"];

// ── SP column normaliser ──────────────────────────────────────
function normalise(r) {
  // Split Vidcard into idType + idNumber on retrieve
  // Stored as "Aadhar:123456789012"
  const vidcard  = r.Vidcard ?? r.vidcard ?? "";
  const sepIdx   = vidcard.indexOf(":");
  const idType   = sepIdx > -1 ? vidcard.slice(0, sepIdx)  : "";
  const idNumber = sepIdx > -1 ? vidcard.slice(sepIdx + 1) : vidcard;

  return {
    uid:          Number(r.uid      ?? r.Uid      ?? 0),
    name:         r.VName    ?? r.vname    ?? "",
    mobile:       String(r.VMobile  ?? r.vmobile  ?? ""),
    visitorType:  r.VType    ?? r.vtype    ?? "",
    company:      r.VCompany ?? r.vcompany ?? "",
    toMeet:       r.ToMeet   ?? r.tomeet   ?? "",
    notes:        r.VNotes   ?? r.vnotes   ?? "",
    vehicleNo:    r.VVehicleNo?? r.vvehicleno ?? "",
    inTime:       r.VIntime  ?? r.vintime  ?? null,
    outTime:      r.VOuttime ?? r.vouttime ?? null,
    // Photo: stored as base64 in VPhotoPath if it starts with data:
    // or use the path directly as src if it's a URL
    photo:        r.VPhotoPath ?? r.vphotopath ?? "",
    visitorCount: r.VisitorCount ?? 1,
    yearSlno:     r.YearSlno ?? 0,
    gateUid:      r.GateUid  ?? r.gateuid  ?? 0,
    idType,
    idNumber,
    active:       r.Active   ?? r.active   ?? true,
  };
}

function buildJson({ companyId, gateId, userId, uid, body }) {
  const now = new Date().toISOString().replace("T"," ").slice(0,23);
  // Concat idType:idNumber → Vidcard
  const vidcard = body.idType && body.idNumber
    ? `${body.idType}:${body.idNumber}`
    : (body.idNumber || "");

  return JSON.stringify([{
    uid:          Number(uid) || 0,
    YearSlno:     body.yearSlno    || 0,
    GateUid:      Number(gateId)   || 0,
    Companyid:    companyId,
    Vidcard:      vidcard,
    VDt:          body.inTime      || now,
    VName:        body.name        || "",
    VMobile:      parseInt(body.mobile,10) || 0,
    VType:        body.visitorType  || "",
    VCompany:     body.company      || "",
    ToMeet:       body.toMeet       || "",
    VNotes:       body.notes        || "",
    VVehicleNo:   body.vehicleNo    || "",
    VIntime:      body.inTime       || now,
    VOuttime:     body.outTime      || null,
    // Photo: send base64 in VPhotoPath field
    VPhotoPath:   body.photo        || "/Photo/",
    VisitorCount: body.visitorCount  || 1,
    Active:       1,
    Userid_in:    userId,
    Userid_out:   null,
  }]);
}

async function getVisitors({ companyId, gateId, date }) {
  const rows = await repo.getVisitorGrid({
    companyId, gateId: gateId || 0,
    date: date || new Date().toISOString().split("T")[0], tag: 1,
  });
  return rows
    .filter(r => r.uid !== undefined || r.VName !== undefined)
    .map(normalise);
}

async function getVisitorById({ companyId, uid }) {
  // Fetch all today and find by uid — no dedicated single-record SP
  const today = new Date().toISOString().split("T")[0];
  const rows  = await repo.getVisitorGrid({ companyId, gateId:0, date:today, tag:1 });
  const row   = rows.find(r => Number(r.uid ?? r.Uid) === Number(uid));
  return row ? normalise(row) : null;
}

async function createVisitor({ companyId, gateId, userId, body }) {
  const json = buildJson({ companyId, gateId, userId, uid:0, body });
  console.log("[createVisitor] JSON:", json);
  const row = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor registered" };
}

async function updateVisitor({ companyId, gateId, userId, uid, body }) {
  const json = buildJson({ companyId, gateId, userId, uid, body });
  console.log("[updateVisitor] JSON:", json);
  const row = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor updated" };
}

async function markVisitorOut({ companyId, userId, uid, body }) {
  const now  = new Date().toISOString().replace("T"," ").slice(0,23);
  const json = buildJson({
    companyId, gateId: body.gateUid || 0, userId, uid,
    body: { ...body, outTime: now, Userid_out: userId },
  });
  const row = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor checked out" };
}

async function deleteVisitor({ uid }) {
  const row = await repo.deleteVisitor(uid);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor deleted" };
}

module.exports = {
  getVisitors, getVisitorById, createVisitor,
  updateVisitor, markVisitorOut, deleteVisitor,
};