const express = require("express");
const router  = express.Router();
const { gmsProtect } = require("../middleware/authMiddleware");
const repo = require("../repositories/setupRepo");

const getCompanyId = req => Number(req.headers.companyid) || 1;
const getUserId    = req => Number(req.headers.userid)    || 1;

// ── Gates (gtypemuid=2) ───────────────────────────────────────
router.get("/gates", gmsProtect, async (req, res, next) => {
  try {
    const rows = await repo.getGeneralGrid({ companyId:getCompanyId(req), gTypeMUid:2, tag:1 });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

router.post("/gates", gmsProtect, async (req, res, next) => {
  try {
    const { code, name, shortName, uid } = req.body;
    const row = await repo.iudGeneral({
      companyId:getCompanyId(req), userId:getUserId(req),
      mode: uid ? 2 : 1, gTypeMUid:2, uid:uid||0, code, name, shortName,
    });
    res.json({ success:true, message:row?.ResponseMessage??"Saved" });
  } catch(err) { next(err); }
});

router.delete("/gates/:uid", gmsProtect, async (req, res, next) => {
  try {
    const row = await repo.iudGeneral({
      companyId:getCompanyId(req), userId:getUserId(req),
      mode:3, gTypeMUid:2, uid:Number(req.params.uid), code:"", name:"", shortName:"",
    });
    res.json({ success:true, message:row?.ResponseMessage??"Deleted" });
  } catch(err) { next(err); }
});

// ── Designations (gtypemuid=1) ────────────────────────────────
router.get("/designations", gmsProtect, async (req, res, next) => {
  try {
    const rows = await repo.getGeneralGrid({ companyId:getCompanyId(req), gTypeMUid:1, tag:1 });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

router.post("/designations", gmsProtect, async (req, res, next) => {
  try {
    const { code, name, shortName, uid } = req.body;
    const row = await repo.iudGeneral({
      companyId:getCompanyId(req), userId:getUserId(req),
      mode: uid ? 2 : 1, gTypeMUid:1, uid:uid||0, code, name, shortName,
    });
    const rc = row?.ResponseCode ?? 100;
    // SP uses 100 or 101 for success; 102+ for errors (e.g. 102=Already Exists)
    if (rc > 101) return res.status(400).json({ success:false, message:row?.ResponseMessage??"Operation failed" });
    res.json({ success:true, message:row?.ResponseMessage??"Saved" });
  } catch(err) { next(err); }
});

router.delete("/designations/:uid", gmsProtect, async (req, res, next) => {
  try {
    const row = await repo.iudGeneral({
      companyId:getCompanyId(req), userId:getUserId(req),
      mode:3, gTypeMUid:1, uid:Number(req.params.uid), code:"", name:"", shortName:"",
    });
    res.json({ success:true, message:row?.ResponseMessage??"Deleted" });
  } catch(err) { next(err); }
});

// ── Securities ────────────────────────────────────────────────
router.get("/securities", gmsProtect, async (req, res, next) => {
  try {
    const rows = await repo.getSecurityGrid({ companyId:getCompanyId(req), tag:1 });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

router.post("/securities", gmsProtect, async (req, res, next) => {
  try {
    const { json } = req.body;
    if (!json) return res.status(400).json({ success:false, message:"json body required" });
    const row = await repo.iudSecurity(json);
    res.json({ success:true, message:row?.ResponseMessage??"Saved" });
  } catch(err) { next(err); }
});

router.delete("/securities/:uid", gmsProtect, async (req, res, next) => {
  try {
    const uid = Number(req.params.uid);
    const now = new Date();
    const localNow = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}.000`;
    const json = JSON.stringify({
      UId:uid, Active:0, SCode:"", SName:"", Gender:"",
      Smobile1:0, SMobile2:0, SPassword:"", PhotoPath:"/Security/",
      Address1:"", Address2:"", Address3:null, Address4:null, Address5:null,
      Companyid:getCompanyId(req), CreatedBy:getUserId(req),
      CreatedOn:localNow, DeletedBy:getUserId(req), DeletedOn:localNow,
    });
    const row = await repo.iudSecurity(json);
    res.json({ success:true, message:row?.ResponseMessage??"Deleted" });
  } catch(err) { next(err); }
});

// ── Patrol Points / Locations ─────────────────────────────────
router.get("/patrol-points", gmsProtect, async (req, res, next) => {
  try {
    const rows = await repo.getLocationGrid({ companyId:getCompanyId(req), tag:1 });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

router.post("/patrol-points", gmsProtect, async (req, res, next) => {
  try {
    const { code, name, gpsId1, gpsId2, uid } = req.body;
    const row = await repo.iudLocation({
      companyId:getCompanyId(req), userId:getUserId(req),
      mode: uid ? 2 : 1, uid:uid||0, code, name, gpsId1, gpsId2,
    });
    res.json({ success:true, message:row?.ResponseMessage??"Saved" });
  } catch(err) { next(err); }
});

router.put("/patrol-points/:uid", gmsProtect, async (req, res, next) => {
  try {
    const { code, name, gpsId1, gpsId2 } = req.body;
    const row = await repo.iudLocation({
      companyId:getCompanyId(req), userId:getUserId(req),
      mode:2, uid:Number(req.params.uid), code, name, gpsId1, gpsId2,
    });
    res.json({ success:true, message:row?.ResponseMessage??"Updated" });
  } catch(err) { next(err); }
});

// Alias for old /locations route
router.get("/locations", gmsProtect, async (req, res, next) => {
  try {
    const rows = await repo.getLocationGrid({ companyId:getCompanyId(req), tag:1 });
    res.json({ success:true, data:rows });
  } catch(err) { next(err); }
});

module.exports = router;