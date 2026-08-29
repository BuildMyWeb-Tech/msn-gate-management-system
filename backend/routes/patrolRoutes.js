const express = require("express");
const router  = express.Router();
const { gmsProtect } = require("../middleware/authMiddleware");
const repo = require("../repositories/patrolPlanRepo");

const getCompanyId = req => Number(req.headers.companyid) || 1;
const getUserId    = req => Number(req.headers.userid)    || 1;

// ── Patrol Plan Front Grid ────────────────────────────────────
// GET /api/patrol/plans
router.get("/plans", gmsProtect, async (req, res, next) => {
  try {
    const rows = await repo.getPatrolPlanGrid({ tag:1, companyId:getCompanyId(req) });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

// ── Patrol Points for combo dropdown ─────────────────────────
// GET /api/patrol/points-combo
router.get("/points-combo", gmsProtect, async (req, res, next) => {
  try {
    const rows = await repo.getPatrolPointsForPlan({ companyId:getCompanyId(req) });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

// ── Patrol Plan detail list (for edit) ───────────────────────
// GET /api/patrol/plans/:uid/list
router.get("/plans/:uid/list", gmsProtect, async (req, res, next) => {
  try {
    const rows = await repo.getPatrolPlanList({
      companyId: getCompanyId(req),
      uid:       Number(req.params.uid),
    });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

// ── Create plan header ────────────────────────────────────────
// POST /api/patrol/plans  { planName }
router.post("/plans", gmsProtect, async (req, res, next) => {
  try {
    const { planName } = req.body;
    if (!planName?.trim()) return res.status(400).json({ success:false, message:"Plan name required" });
    const row = await repo.iudPatrolPlan({
      mode:1, userId:getUserId(req), planName, uid:0, companyId:getCompanyId(req),
    });
    const rc = row?.ResponseCode ?? 100;
    if (rc > 101) return res.status(400).json({ success:false, message:row?.ResponseMessage||"Failed" });
    res.json({ success:true, message:row?.ResponseMessage||"Saved", uid: row?.uid ?? row?.Uid ?? null, data:row });
  } catch(err) { next(err); }
});

// ── Update plan header ────────────────────────────────────────
// PUT /api/patrol/plans/:uid  { planName }
router.put("/plans/:uid", gmsProtect, async (req, res, next) => {
  try {
    const { planName } = req.body;
    const row = await repo.iudPatrolPlan({
      mode:2, userId:getUserId(req), planName, uid:Number(req.params.uid), companyId:getCompanyId(req),
    });
    const rc = row?.ResponseCode ?? 100;
    if (rc > 101) return res.status(400).json({ success:false, message:row?.ResponseMessage||"Failed" });
    res.json({ success:true, message:row?.ResponseMessage||"Updated" });
  } catch(err) { next(err); }
});

// ── Delete plan ───────────────────────────────────────────────
// DELETE /api/patrol/plans/:uid
router.delete("/plans/:uid", gmsProtect, async (req, res, next) => {
  try {
    const row = await repo.iudPatrolPlan({
      mode:3, userId:getUserId(req), planName:"", uid:Number(req.params.uid), companyId:getCompanyId(req),
    });
    res.json({ success:true, message:row?.ResponseMessage||"Deleted" });
  } catch(err) { next(err); }
});

// ── Add detail line ───────────────────────────────────────────
// POST /api/patrol/plans/:uid/detail  { patrolPointUid, planOrder, leadTime }
router.post("/plans/:uid/detail", gmsProtect, async (req, res, next) => {
  try {
    const { patrolPointUid, planOrder, leadTime } = req.body;
    const row = await repo.idPatrolPlanDetail({
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

// ── Delete detail line ────────────────────────────────────────
// DELETE /api/patrol/plans/:uid/detail/:detailUid
router.delete("/plans/:uid/detail/:detailUid", gmsProtect, async (req, res, next) => {
  try {
    console.log("[deleteDetail] planUid:", req.params.uid, "detailUid:", req.params.detailUid);
    const row = await repo.idPatrolPlanDetail({
      mode:2, userId:getUserId(req),
      planMUid:       Number(req.params.uid),
      patrolPointUid: 0,
      planOrder:      0,
      leadTime:       0,
      uid:            Number(req.params.detailUid),
      companyId:      getCompanyId(req),
    });
    console.log("[deleteDetail] SP response:", JSON.stringify(row));
    // SP may return null or ResponseCode 101 on successful delete
    const rc  = row?.ResponseCode ?? 100;
    const msg = row?.ResponseMessage || "";
    if (rc > 101 && !msg.toLowerCase().includes("success") && !msg.toLowerCase().includes("deleted")) {
      return res.status(400).json({ success:false, message:msg||"Delete failed" });
    }
    res.json({ success:true, message:msg || "Deleted successfully" });
  } catch(err) {
    console.error("[deleteDetail] error:", err.message);
    next(err);
  }
});

// Patrol guard attendance (placeholder)
router.get("/", gmsProtect, (req, res) => {
  res.json({ success:true, data:[], message:"Patrol attendance module" });
});

module.exports = router;