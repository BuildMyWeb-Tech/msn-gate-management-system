const express = require("express");
const router  = express.Router();
const { gmsProtect } = require("../middleware/authMiddleware");
const { getCompVehicles, iudCompVehicle } = require("../repositories/compVehicleRepo");

const getCompanyId = req => Number(req.headers.companyid) || 1;
const getUserId    = req => Number(req.headers.userid)    || 1;

// GET /api/comp-vehicles
router.get("/", gmsProtect, async (req, res, next) => {
  try {
    const rows = await getCompVehicles({ tag:1, companyId:getCompanyId(req) });
    const data = rows.map(r => ({
      uid:        Number(r.uid        ?? r.Uid        ?? 0),
      vehicleNo:  r.VehicleNo ?? r.vehicleNo ?? r.gcode ?? "",
      brand:      r.Brand     ?? r.brand     ?? r.gname ?? "",
      driverName: r.DriverName?? r.driverName?? r.gsname?? "",
      active:     r.active    ?? r.Active    ?? true,
      serialNo:   r.serial_no ?? r.SerialNo  ?? 0,
    }));
    res.json({ success:true, data });
  } catch(err) { next(err); }
});

// POST /api/comp-vehicles
router.post("/", gmsProtect, async (req, res, next) => {
  try {
    const { vehicleNo, brand, driverName } = req.body;
    if (!vehicleNo?.trim()) return res.status(400).json({ success:false, message:"Vehicle No is required" });
    const row = await iudCompVehicle({
      mode:1, userId:getUserId(req), uid:0,
      vehicleNo, brand:brand||"", driverName:driverName||"",
      companyId:getCompanyId(req),
    });
    res.json({ success:true, message:row?.ResponseMessage??"Vehicle added" });
  } catch(err) { next(err); }
});

// PUT /api/comp-vehicles/:id
router.put("/:id", gmsProtect, async (req, res, next) => {
  try {
    const { vehicleNo, brand, driverName } = req.body;
    if (!vehicleNo?.trim()) return res.status(400).json({ success:false, message:"Vehicle No is required" });
    const row = await iudCompVehicle({
      mode:2, userId:getUserId(req), uid:Number(req.params.id),
      vehicleNo, brand:brand||"", driverName:driverName||"",
      companyId:getCompanyId(req),
    });
    res.json({ success:true, message:row?.ResponseMessage??"Vehicle updated" });
  } catch(err) { next(err); }
});

module.exports = router;