const express    = require("express");
const router     = express.Router();
const { gmsProtect } = require("../middleware/authMiddleware");
const planRepo   = require("../repositories/patrolPlanRepo");
const svc        = require("../services/patrolService");

const getCompanyId = req => Number(req.headers.companyid) || 1;
const getUserId    = req => Number(req.headers.userid)    || 0;
const getGateId    = req => Number(req.headers.gateid)    || 0;

// ════════════════════════════════════════════════════════════════
// PATROL PLAN (existing endpoints — unchanged)
// ════════════════════════════════════════════════════════════════

// GET /api/patrol/plans
router.get("/plans", gmsProtect, async (req, res, next) => {
  try {
    const rows = await planRepo.getPatrolPlanGrid({ tag:1, companyId:getCompanyId(req) });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

// GET /api/patrol/points-combo
router.get("/points-combo", gmsProtect, async (req, res, next) => {
  try {
    const rows = await planRepo.getPatrolPointsForPlan({ companyId:getCompanyId(req) });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

// GET /api/patrol/plans/:uid/list
router.get("/plans/:uid/list", gmsProtect, async (req, res, next) => {
  try {
    const rows = await planRepo.getPatrolPlanList({
      companyId: getCompanyId(req),
      uid:       Number(req.params.uid),
    });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

// POST /api/patrol/plans
router.post("/plans", gmsProtect, async (req, res, next) => {
  try {
    const { planName } = req.body;
    if (!planName?.trim()) return res.status(400).json({ success:false, message:"Plan name required" });
    const row = await planRepo.iudPatrolPlan({
      mode:1, userId:getUserId(req), planName, uid:0, companyId:getCompanyId(req),
    });
    const rc = row?.ResponseCode ?? 100;
    if (rc > 101) return res.status(400).json({ success:false, message:row?.ResponseMessage||"Failed" });
    const newUid = row?.Uid ?? row?.uid ?? null;
    res.json({ success:true, message:row?.ResponseMessage||"Saved", uid:newUid, Uid:newUid, data:row });
  } catch(err) { next(err); }
});

// PUT /api/patrol/plans/:uid
router.put("/plans/:uid", gmsProtect, async (req, res, next) => {
  try {
    const { planName } = req.body;
    const row = await planRepo.iudPatrolPlan({
      mode:2, userId:getUserId(req), planName, uid:Number(req.params.uid), companyId:getCompanyId(req),
    });
    const rc = row?.ResponseCode ?? 100;
    if (rc > 101) return res.status(400).json({ success:false, message:row?.ResponseMessage||"Failed" });
    res.json({ success:true, message:row?.ResponseMessage||"Updated" });
  } catch(err) { next(err); }
});

// DELETE /api/patrol/plans/:uid
router.delete("/plans/:uid", gmsProtect, async (req, res, next) => {
  try {
    const row = await planRepo.iudPatrolPlan({
      mode:3, userId:getUserId(req), planName:"", uid:Number(req.params.uid), companyId:getCompanyId(req),
    });
    res.json({ success:true, message:row?.ResponseMessage||"Deleted" });
  } catch(err) { next(err); }
});

// POST /api/patrol/plans/:uid/detail
router.post("/plans/:uid/detail", gmsProtect, async (req, res, next) => {
  try {
    const { patrolPointUid, planOrder, leadTime } = req.body;
    const row = await planRepo.idPatrolPlanDetail({
      mode:1, userId:getUserId(req),
      planMUid:       Number(req.params.uid),
      patrolPointUid: Number(patrolPointUid),
      planOrder:      Number(planOrder),
      leadTime:       Number(leadTime) || 0,
      uid:0, companyId:getCompanyId(req),
    });
    const rc = row?.ResponseCode ?? 100;
    if (rc > 101) return res.status(400).json({ success:false, message:row?.ResponseMessage||"Failed" });
    res.json({ success:true, message:row?.ResponseMessage||"Added", data:row });
  } catch(err) { next(err); }
});

// DELETE /api/patrol/plans/:uid/detail/:detailUid
router.delete("/plans/:uid/detail/:detailUid", gmsProtect, async (req, res, next) => {
  try {
    const row = await planRepo.idPatrolPlanDetail({
      mode:2, userId:getUserId(req),
      planMUid:       Number(req.params.uid),
      patrolPointUid: 0, planOrder:0, leadTime:0,
      uid:            Number(req.params.detailUid),
      companyId:      getCompanyId(req),
    });
    const rc  = row?.ResponseCode ?? 100;
    const msg = row?.ResponseMessage || "";
    if (rc > 101 && !msg.toLowerCase().includes("success") && !msg.toLowerCase().includes("deleted")) {
      return res.status(400).json({ success:false, message:msg||"Delete failed" });
    }
    res.json({ success:true, message:msg || "Deleted successfully" });
  } catch(err) { next(err); }
});

// ════════════════════════════════════════════════════════════════
// PATROL SESSIONS — new flow
// ════════════════════════════════════════════════════════════════

// GET /api/patrol/sessions?date=YYYY-MM-DD&gateId=0
router.get("/sessions", gmsProtect, async (req, res, next) => {
  try {
    const date    = req.query.date   || new Date().toISOString().split("T")[0];
    const gateId  = Number(req.query.gateId)  || getGateId(req);
    const guardId = Number(req.query.guardId) || 0;
    const data = await svc.getPatrolSessions({ companyId:getCompanyId(req), date, gateId, guardId });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

// POST /api/patrol/sessions  — create new patrol session
router.post("/sessions", gmsProtect, async (req, res, next) => {
  try {
    const { gateName, securityName } = req.body;
    const data = await svc.createPatrolSession({
      companyId:    getCompanyId(req),
      userId:       getUserId(req),
      gateId:       getGateId(req),
      gateName:     gateName    || req.gmsUser?.gateName    || "",
      securityName: securityName || req.gmsUser?.userName   || "",
    });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

// PUT /api/patrol/sessions/:uid/end
router.put("/sessions/:uid/end", gmsProtect, async (req, res, next) => {
  try {
    await svc.endPatrolSession({
      companyId: getCompanyId(req),
      userId:    getUserId(req),
      uid:       Number(req.params.uid),
    });
    res.json({ success:true, message:"Patrol ended" });
  } catch(err) { next(err); }
});

// GET /api/patrol/sessions/:uid/checkpoints
router.get("/sessions/:uid/checkpoints", gmsProtect, async (req, res, next) => {
  try {
    const data = await svc.getSessionCheckpoints({
      companyId:  getCompanyId(req),
      patrolMUid: Number(req.params.uid),
    });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

// POST /api/patrol/sessions/:uid/checkpoint
// Body: { locationUid, locationName, selfieImage (base64 data URI) }
router.post("/sessions/:uid/checkpoint", gmsProtect, async (req, res, next) => {
  try {
    const { locationUid, locationName, selfieImage } = req.body;
    if (!locationUid) return res.status(400).json({ success:false, message:"locationUid is required" });
    const data = await svc.logCheckpoint({
      companyId:   getCompanyId(req),
      userId:      getUserId(req),
      patrolMUid:  Number(req.params.uid),
      locationUid,
      locationName,
      selfieImage,
    });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

// ════════════════════════════════════════════════════════════════
// GPS VALIDATION
// ════════════════════════════════════════════════════════════════

// POST /api/patrol/validate-point  { lat, lng }
router.post("/validate-point", gmsProtect, async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ success:false, message:"lat and lng are required" });
    }
    const point = await svc.validateGPS({ companyId:getCompanyId(req), lat:Number(lat), lng:Number(lng) });
    if (!point) {
      return res.json({ success:false, message:"No patrol point found within 6 metres of your location" });
    }
    res.json({ success:true, data:point });
  } catch(err) { next(err); }
});

// ════════════════════════════════════════════════════════════════
// LEGACY — patrol attendance (kept for backward compat)
// ════════════════════════════════════════════════════════════════
router.get("/", gmsProtect, async (req, res, next) => {
  try {
    const { companyId, userId } = req.gmsUser;
    const date    = req.query.date    || new Date().toISOString().split("T")[0];
    const guardId = req.query.guardId || userId;
    const data    = await svc.getPatrolLogs({ companyId, date, guardId });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

router.post("/", gmsProtect, async (req, res, next) => {
  try {
    const { companyId, userId, gateId } = req.gmsUser;
    const { locationId, remarks }       = req.body;
    if (!locationId) return res.status(400).json({ success:false, message:"locationId is required" });
    const result = await svc.markCheckpoint({ companyId, gateId, guardId:userId, locationId, remarks });
    res.json({ success:true, message:result?.ResponseMessage || "Checkpoint marked successfully" });
  } catch(err) { next(err); }
});

module.exports = router;
