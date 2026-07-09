// services/patrolService.js
const repo = require("../repositories/patrolRepo");

async function getPatrolLogs({ companyCode, date, guardId }) {
  return await repo.getPatrolLogs({ companyCode, date, guardId });
}

async function markCheckpoint({ companyCode, gateId, guardId, locationId, remarks }) {
  const visitedAt = new Date().toISOString();
  return await repo.insertPatrolLog({
    companyCode,
    guardId:    Number(guardId),
    locationId: Number(locationId),
    gateId:     gateId ? Number(gateId) : 0,
    visitedAt,
    remarks:    remarks || "",
  });
}

module.exports = { getPatrolLogs, markCheckpoint };
