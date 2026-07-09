// services/vehicleService.js
const repo               = require("../repositories/vehicleRepo");
const { generatePassNo } = require("../utils/passGenerator");

async function getVehicles({ companyCode, date }) {
  return await repo.getVehicleGrid({ companyCode, date });
}

async function getVehicleById({ companyCode, uid }) {
  return await repo.getVehicleById({ companyCode, uid });
}

async function createVehicle({ companyCode, gateId, body }) {
  const passNo  = generatePassNo();
  const inTime  = new Date().toISOString();
  const payload = {
    uid:         0,
    companyCode,
    gateId:      gateId || 0,
    vehicleNo:   body.vehicleNo   || "",
    mobile:      body.mobile      || "",
    visitType:   body.visitType   || "",
    name:        body.name        || "",
    company:     body.company     || "",
    warehouse:   body.warehouse   || "",
    remarks:     body.remarks     || "",
    passNo,
    inTime,
    outTime:     "",
    photo:       body.photo       || "",
    active:      1,
  };
  const result = await repo.iuVehicle(JSON.stringify(payload));
  return { ...result, passNo };
}

async function updateVehicle({ companyCode, uid, body }) {
  const payload = {
    uid:         Number(uid),
    companyCode,
    vehicleNo:   body.vehicleNo   || "",
    mobile:      body.mobile      || "",
    visitType:   body.visitType   || "",
    name:        body.name        || "",
    company:     body.company     || "",
    warehouse:   body.warehouse   || "",
    remarks:     body.remarks     || "",
    passNo:      body.passNo      || "",
    photo:       body.photo       || "",
    active:      body.active      ?? 1,
  };
  const result = await repo.iuVehicle(JSON.stringify(payload));
  return result;
}

async function markVehicleOut({ companyCode, uid }) {
  const outTime = new Date().toISOString();
  return await repo.vehicleOut({ companyCode, uid: Number(uid), outTime });
}

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  markVehicleOut,
};
