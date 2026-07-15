// services/patrolService.js
const repo = require("../repositories/patrolRepo");

async function getPatrolLogs({ companyId, date, guardId }) {
  return await repo.getPatrolLogs({ companyId, date, guardId });
}

async function markCheckpoint({ companyId, gateId, guardId, locationId, remarks }) {
  const visitedAt = new Date().toISOString();
  return await repo.insertPatrolLog({ companyId, guardId: Number(guardId), locationId: Number(locationId), gateId: gateId ? Number(gateId) : 0, visitedAt, remarks: remarks || "" });
}

module.exports = { getPatrolLogs, markCheckpoint };
