// controllers/patrolController.js
const service = require("../services/patrolService");

exports.getLogs = async (req, res, next) => {
  try {
    const { companyCode, userId } = req.gmsUser;
    const date    = req.query.date    || new Date().toISOString().split("T")[0];
    const guardId = req.query.guardId || userId;
    const data    = await service.getPatrolLogs({ companyCode, date, guardId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.markCheckpoint = async (req, res, next) => {
  try {
    const { companyCode, userId, gateId } = req.gmsUser;
    const { locationId, remarks }         = req.body;

    if (!locationId) {
      return res.status(400).json({ success: false, message: "locationId is required" });
    }

    const result = await service.markCheckpoint({
      companyCode,
      gateId,
      guardId:    userId,
      locationId,
      remarks,
    });
    res.json({ success: true, message: result?.ResponseMessage || "Checkpoint marked successfully" });
  } catch (err) { next(err); }
};
