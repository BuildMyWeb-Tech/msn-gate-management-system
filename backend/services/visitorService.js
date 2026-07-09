// services/visitorService.js
const repo               = require("../repositories/visitorRepo");
const { generatePassNo } = require("../utils/passGenerator");

async function getVisitors({ companyCode, date }) {
  return await repo.getVisitorGrid({ companyCode, date });
}

async function getVisitorByMobile({ companyCode, mobile }) {
  return await repo.getVisitorByMobile({ companyCode, mobile });
}

async function getVisitorById({ companyCode, uid }) {
  return await repo.getVisitorById({ companyCode, uid });
}

async function createVisitor({ companyCode, gateId, body }) {
  const passNo  = generatePassNo();
  const inTime  = new Date().toISOString();
  const payload = {
    uid:          0,
    companyCode,
    gateId:       gateId || 0,
    mobile:       body.mobile        || "",
    visitorType:  body.visitorType   || "",
    visitorId:    body.visitorId     || "",
    name:         body.name          || "",
    company:      body.company       || "",
    toMeet:       body.toMeet        || "",
    remarks:      body.remarks       || "",
    vehicleNo:    body.vehicleNo     || "",
    passNo,
    inTime,
    outTime:      "",
    photo:        body.photo         || "",
    active:       1,
  };
  const result = await repo.iuVisitor(JSON.stringify(payload));
  return { ...result, passNo };
}

async function updateVisitor({ companyCode, uid, body }) {
  const payload = {
    uid:          Number(uid),
    companyCode,
    mobile:       body.mobile        || "",
    visitorType:  body.visitorType   || "",
    visitorId:    body.visitorId     || "",
    name:         body.name          || "",
    company:      body.company       || "",
    toMeet:       body.toMeet        || "",
    remarks:      body.remarks       || "",
    vehicleNo:    body.vehicleNo     || "",
    passNo:       body.passNo        || "",
    photo:        body.photo         || "",
    active:       body.active        ?? 1,
  };
  const result = await repo.iuVisitor(JSON.stringify(payload));
  return result;
}

async function markVisitorOut({ companyCode, uid }) {
  const outTime = new Date().toISOString();
  return await repo.visitorOut({ companyCode, uid: Number(uid), outTime });
}

module.exports = {
  getVisitors,
  getVisitorByMobile,
  getVisitorById,
  createVisitor,
  updateVisitor,
  markVisitorOut,
};
