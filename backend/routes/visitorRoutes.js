const express = require("express");
const router  = express.Router();
const { gmsProtect } = require("../middleware/authMiddleware");
const service = require("../services/visitorService");

const getCompanyId = req => Number(req.headers.companyid) || 1;
const getGateId    = req => Number(req.headers.gateid)    || 0;
const getUserId    = req => Number(req.headers.userid)    || 1;

// GET /api/visitors?date=2026-08-19&gateId=0
router.get("/", gmsProtect, async (req, res, next) => {
  try {
    const { date, gateId } = req.query;
    const data = await service.getVisitors({
      companyId: getCompanyId(req),
      gateId:    Number(gateId ?? getGateId(req)),
      date,
    });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

// GET /api/visitors/search?q=...
router.get("/search", gmsProtect, async (req, res, next) => {
  try {
    const data = await service.searchAllVisitors({ str:req.query.q||"", companyId:getCompanyId(req) });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

// GET /api/visitors/mobile/:mobile
router.get("/mobile/:mobile", gmsProtect, async (req, res, next) => {
  try {
    const data = await service.getVisitorByMobile({ mobile:req.params.mobile, companyId:getCompanyId(req) });
    if (!data) return res.json({ success:false, message:"Not found" });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

// GET /api/visitors/:id
router.get("/:id", gmsProtect, async (req, res, next) => {
  try {
    const data = await service.getVisitorById({ companyId:getCompanyId(req), uid:req.params.id });
    if (!data) return res.status(404).json({ success:false, message:"Not found" });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

// POST /api/visitors
router.post("/", gmsProtect, async (req, res, next) => {
  try {
    const result = await service.createVisitor({
      companyId:getCompanyId(req), gateId:getGateId(req), userId:getUserId(req), body:req.body,
    });
    res.json({ success:true, message:result.ResponseMessage });
  } catch(err) { next(err); }
});

// PUT /api/visitors/:id
router.put("/:id", gmsProtect, async (req, res, next) => {
  try {
    const result = await service.updateVisitor({
      companyId:getCompanyId(req), gateId:getGateId(req), userId:getUserId(req),
      uid:req.params.id, body:req.body,
    });
    res.json({ success:true, message:result.ResponseMessage });
  } catch(err) { next(err); }
});

// PATCH /api/visitors/:id/out
router.patch("/:id/out", gmsProtect, async (req, res, next) => {
  try {
    const result = await service.markVisitorOut({
      companyId:getCompanyId(req), userId:getUserId(req), uid:req.params.id, body:req.body,
    });
    res.json({ success:true, message:result.ResponseMessage });
  } catch(err) { next(err); }
});

// DELETE /api/visitors/:id
router.delete("/:id", gmsProtect, async (req, res, next) => {
  try {
    const result = await service.deleteVisitor({ uid:req.params.id });
    res.json({ success:true, message:result.ResponseMessage });
  } catch(err) { next(err); }
});

module.exports = router;