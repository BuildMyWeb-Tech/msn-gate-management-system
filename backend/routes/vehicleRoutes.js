const express = require("express");
const router  = express.Router();
const { gmsProtect } = require("../middleware/authMiddleware");
const service = require("../services/vehicleService");

const getCompanyId = req => Number(req.headers.companyid) || 1;
const getGateId    = req => Number(req.headers.gateid)    || 0;
const getUserId    = req => Number(req.headers.userid)    || 1;

router.get("/", gmsProtect, async (req, res, next) => {
  try {
    const { date, gateId } = req.query;
    const data = await service.getVehicles({
      companyId:getCompanyId(req), gateId:Number(gateId??getGateId(req)), date,
    });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

router.get("/:id", gmsProtect, async (req, res, next) => {
  try {
    const data = await service.getVehicleById({ companyId:getCompanyId(req), uid:req.params.id });
    if (!data) return res.status(404).json({ success:false, message:"Not found" });
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

router.post("/", gmsProtect, async (req, res, next) => {
  try {
    const result = await service.createVehicle({
      companyId:getCompanyId(req), gateId:getGateId(req), userId:getUserId(req), body:req.body,
    });
    res.json({ success:true, message:result.ResponseMessage });
  } catch(err) { next(err); }
});

router.put("/:id", gmsProtect, async (req, res, next) => {
  try {
    const result = await service.updateVehicle({
      companyId:getCompanyId(req), gateId:getGateId(req), userId:getUserId(req),
      uid:req.params.id, body:req.body,
    });
    res.json({ success:true, message:result.ResponseMessage });
  } catch(err) { next(err); }
});

router.patch("/:id/out", gmsProtect, async (req, res, next) => {
  try {
    const result = await service.markVehicleOut({
      companyId:getCompanyId(req), userId:getUserId(req), uid:req.params.id, body:req.body,
    });
    res.json({ success:true, message:result.ResponseMessage });
  } catch(err) { next(err); }
});

router.delete("/:id", gmsProtect, async (req, res, next) => {
  try {
    const result = await service.deleteVehicle({ uid:req.params.id });
    res.json({ success:true, message:result.ResponseMessage });
  } catch(err) { next(err); }
});

module.exports = router;