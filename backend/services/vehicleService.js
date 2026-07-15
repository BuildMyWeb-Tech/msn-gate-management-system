// services/vehicleService.js
const repo               = require("../repositories/vehicleRepo");
const { generatePassNo } = require("../utils/passGenerator");

async function getVehicles({ companyId, date }) {
  return await repo.getVehicleGrid({ companyId, date });
}

async function getVehicleById({ companyId, uid }) {
  return await repo.getVehicleById({ companyId, uid });
}

async function createVehicle({ companyId, gateId, body }) {
  const passNo  = generatePassNo();
  const inTime  = new Date().toISOString();
  const payload = {
    uid:       0,
    companyid: companyId,
    gateId:    gateId || 0,
    vehicleNo: body.vehicleNo  || "",
    mobile:    body.mobile     || "",
    visitType: body.visitType  || "",
    name:      body.name       || "",
    company:   body.company    || "",
    warehouse: body.warehouse  || "",
    remarks:   body.remarks    || "",
    passNo,
    inTime,
    outTime:   "",
    photo:     body.photo      || "",
    active:    1,
  };
  const result = await repo.iuVehicle(JSON.stringify(payload));
  return { ...result, passNo };
}

async function updateVehicle({ companyId, uid, body }) {
  const payload = {
    uid:       Number(uid),
    companyid: companyId,
    vehicleNo: body.vehicleNo  || "",
    mobile:    body.mobile     || "",
    visitType: body.visitType  || "",
    name:      body.name       || "",
    company:   body.company    || "",
    warehouse: body.warehouse  || "",
    remarks:   body.remarks    || "",
    passNo:    body.passNo     || "",
    photo:     body.photo      || "",
    active:    body.active     ?? 1,
  };
  return await repo.iuVehicle(JSON.stringify(payload));
}

async function markVehicleOut({ companyId, uid }) {
  const outTime = new Date().toISOString();
  return await repo.vehicleOut({ companyId, uid: Number(uid), outTime });
}

module.exports = { getVehicles, getVehicleById, createVehicle, updateVehicle, markVehicleOut };
