const repo = require("../repositories/visitorRepo");

function normalise(r) {
  const vidcard  = r.Vidcard ?? r.vidcard ?? "";
  const sepIdx   = vidcard.indexOf(":");
  const idType   = sepIdx > -1 ? vidcard.slice(0, sepIdx)  : "";
  const idNumber = sepIdx > -1 ? vidcard.slice(sepIdx + 1) : vidcard;

  // Fix: mobile stored as float in DB — convert via BigInt to avoid scientific notation
  const rawMobile = r.VMobile ?? r.vmobile ?? r.Mobile ?? "";
  let mobile = "";
  try {
    if (rawMobile !== "" && rawMobile !== null) {
      mobile = BigInt(Math.round(Number(rawMobile))).toString();
    }
  } catch { mobile = String(rawMobile); }

  return {
    uid:          Number(r.uid      ?? r.Uid      ?? 0),
    name:         r.VName    ?? r.vname    ?? "",
    mobile,
    visitorType:  r.VType    ?? r.vtype    ?? "",
    company:      r.VCompany ?? r.vcompany ?? "",
    toMeet:       r.ToMeet   ?? r.tomeet   ?? "",
    notes:        r.VNotes   ?? r.vnotes   ?? "",
    vehicleNo:    r.VVehicleNo ?? r.vvehicleno ?? "",
    inTime:       r.VIntime  ?? r.vintime  ?? null,
    outTime:      r.VOuttime ?? r.vouttime ?? null,
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
    VPhotoPath:   body.photo        || "/Photo/",
    VisitorCount: body.visitorCount  || 1,
    Active:       1,
    Userid_in:    userId,
    Userid_out:   null,
  }]);
}

async function getVisitors({ companyId, gateId, date }) {
  // Use provided date; fallback uses local date to avoid UTC timezone shift
  const localDate = date || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const rows = await repo.getVisitorGrid({
    companyId, gateId: gateId || 0,
    date: localDate, tag: 1,
  });
  return rows.filter(r => r.uid !== undefined || r.VName !== undefined).map(normalise);
}

async function getVisitorById({ companyId, uid }) {
  // Try today first, then yesterday if not found (for late-night edits)
  const d = new Date();
  const localToday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  let rows = await repo.getVisitorGrid({ companyId, gateId:0, date:localToday, tag:1 });
  let row  = rows.find(r => Number(r.uid ?? r.Uid) === Number(uid));
  if (!row) {
    // Try yesterday
    const yd = new Date(d); yd.setDate(yd.getDate()-1);
    const yesterday = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,'0')}-${String(yd.getDate()).padStart(2,'0')}`;
    rows = await repo.getVisitorGrid({ companyId, gateId:0, date:yesterday, tag:1 });
    row  = rows.find(r => Number(r.uid ?? r.Uid) === Number(uid));
  }
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
  const row  = await repo.iuVisitor(json);
  return { ResponseMessage: row?.ResponseMessage ?? "Visitor updated" };
}

async function markVisitorOut({ companyId, userId, uid, body }) {
  const now = new Date().toISOString().replace("T"," ").slice(0,23);
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


// ─────────────────────────────────────────────────────────────
// Mobile search — PR_Validate_Mobileno
// Returns last known visitor details for this mobile
// Used in New Visitor form Search button to auto-fill fields
// ─────────────────────────────────────────────────────────────
async function getVisitorByMobile({ mobile, companyId }) {
  const rows = await repo.getVisitorByMobile({ mobile, companyId });
  console.log("[getVisitorByMobile] rows:", JSON.stringify(rows?.slice(0,1)));
  if (!rows || rows.length === 0) return null;
  // SP may return ResponseCode row — filter it
  const data = rows.find(r =>
    r.VName !== undefined || r.vname !== undefined ||
    r.SCode !== undefined || r.Name  !== undefined
  );
  if (!data) return null;

  // Parse Vidcard into idType + idNumber
  const vidcard  = data.Vidcard ?? data.vidcard ?? "";
  const sepIdx   = vidcard.indexOf(":");
  const idType   = sepIdx > -1 ? vidcard.slice(0, sepIdx)  : "";
  const idNumber = sepIdx > -1 ? vidcard.slice(sepIdx + 1) : vidcard;

  const rawMobile = data.VMobile ?? data.vmobile ?? data.Mobile ?? mobile;
  let mob = "";
  try { mob = BigInt(Math.round(Number(rawMobile))).toString(); } catch { mob = String(rawMobile); }

  return {
    name:        data.VName    ?? data.vname    ?? data.Name    ?? "",
    mobile:      mob,
    visitorType: data.VType    ?? data.vtype    ?? "",
    company:     data.VCompany ?? data.vcompany ?? "",
    toMeet:      data.ToMeet   ?? data.tomeet   ?? "",
    notes:       data.VNotes   ?? data.vnotes   ?? "",
    vehicleNo:   data.VVehicleNo ?? data.vvehicleno ?? "",
    idType,
    idNumber,
  };
}

// ─────────────────────────────────────────────────────────────
// Global search — PR_Search_Visitors
// Search by mobile, name or company across all dates
// Used in VisitorList search box
// ─────────────────────────────────────────────────────────────
async function searchAllVisitors({ str, companyId }) {
  const rows = await repo.searchVisitors({ str, companyId });
  console.log("[searchAllVisitors] count:", rows?.length);
  return rows
    .filter(r => r.uid !== undefined || r.VName !== undefined)
    .map(normalise);
}


// ─────────────────────────────────────────────────────────────
// Validate mobile — auto-fill visitor form
// SP: PR_Validate_Mobileno @mobile, @companyid
// ─────────────────────────────────────────────────────────────
async function validateMobile({ mobile, companyId }) {
  const row = await repo.validateMobile({ mobile, companyId });
  if (!row) return null;

  // Normalise SP response — may return same columns as visitor grid
  const vidcard  = row.Vidcard  ?? row.vidcard  ?? "";
  const sepIdx   = vidcard.indexOf(":");
  const idType   = sepIdx > -1 ? vidcard.slice(0, sepIdx)  : "";
  const idNumber = sepIdx > -1 ? vidcard.slice(sepIdx + 1) : vidcard;

  const rawMobile = row.VMobile ?? row.vmobile ?? row.Mobile ?? mobile;
  let mob = "";
  try { mob = BigInt(Math.round(Number(rawMobile))).toString(); } catch { mob = String(rawMobile); }

  return {
    name:        row.VName    ?? row.vname    ?? row.Name    ?? "",
    mobile:      mob,
    visitorType: row.VType    ?? row.vtype    ?? "",
    company:     row.VCompany ?? row.vcompany ?? "",
    toMeet:      row.ToMeet   ?? row.tomeet   ?? "",
    idType,
    idNumber,
    notes:       row.VNotes   ?? row.vnotes   ?? "",
    vehicleNo:   row.VVehicleNo ?? row.vvehicleno ?? "",
  };
}

// ─────────────────────────────────────────────────────────────
// Search visitors — for list search box
// SP: PR_Search_Visitors @Str, @companyid
// ─────────────────────────────────────────────────────────────
async function searchVisitors({ str, companyId }) {
  const rows = await repo.searchVisitors({ str, companyId });
  return rows
    .filter(r => r.uid !== undefined || r.VName !== undefined)
    .map(normalise);
}

module.exports = { getVisitors, getVisitorById, createVisitor, updateVisitor, markVisitorOut, deleteVisitor, getVisitorByMobile, searchAllVisitors };