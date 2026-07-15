// services/visitorService.js
const repo               = require("../repositories/visitorRepo");
const { generatePassNo } = require("../utils/passGenerator");

async function getVisitors({ companyId, date }) {
  return await repo.getVisitorGrid({ companyId, date });
}

async function getVisitorByMobile({ companyId, mobile }) {
  return await repo.getVisitorByMobile({ companyId, mobile });
}

async function getVisitorById({ companyId, uid }) {
  return await repo.getVisitorById({ companyId, uid });
}

async function createVisitor({ companyId, gateId, body }) {
  const passNo  = generatePassNo();
  const inTime  = new Date().toISOString();
  const payload = {
    uid:         0,
    companyid:   companyId,
    gateId:      gateId || 0,
    mobile:      body.mobile       || "",
    visitorType: body.visitorType  || "",
    visitorId:   body.visitorId    || "",
    name:        body.name         || "",
    company:     body.company      || "",
    toMeet:      body.toMeet       || "",
    remarks:     body.remarks      || "",
    vehicleNo:   body.vehicleNo    || "",
    passNo,
    inTime,
    outTime:     "",
    photo:       body.photo        || "",
    active:      1,
  };
  const result = await repo.iuVisitor(JSON.stringify(payload));
  return { ...result, passNo };
}

async function updateVisitor({ companyId, uid, body }) {
  const payload = {
    uid:         Number(uid),
    companyid:   companyId,
    mobile:      body.mobile       || "",
    visitorType: body.visitorType  || "",
    visitorId:   body.visitorId    || "",
    name:        body.name         || "",
    company:     body.company      || "",
    toMeet:      body.toMeet       || "",
    remarks:     body.remarks      || "",
    vehicleNo:   body.vehicleNo    || "",
    passNo:      body.passNo       || "",
    photo:       body.photo        || "",
    active:      body.active       ?? 1,
  };
  return await repo.iuVisitor(JSON.stringify(payload));
}

async function markVisitorOut({ companyId, uid }) {
  const outTime = new Date().toISOString();
  return await repo.visitorOut({ companyId, uid: Number(uid), outTime });
}

module.exports = { getVisitors, getVisitorByMobile, getVisitorById, createVisitor, updateVisitor, markVisitorOut };
