// routes/debugRoute.js — TEMPORARY, remove after fixing
const express = require("express");
const router  = express.Router();
const { poolPromise, sql } = require("../database/sqlConnection");

// Test PR_IUD_GeneralM (Gates/Designations)
// GET /api/debug/iud-general?mode=3&uid=1&gtypemuid=1&companyid=1&userid=1
router.get("/iud-general", async (req, res) => {
  const { mode, uid, gtypemuid, companyid, userid } = req.query;
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("Mode",      sql.Int,           Number(mode)      || 3)
      .input("Userid",    sql.Int,           Number(userid)    || 1)
      .input("GTypeMUid", sql.Int,           Number(gtypemuid) || 1)
      .input("gcode",     sql.NVarChar(100), "")
      .input("gname",     sql.NVarChar(200), "")
      .input("gsname",    sql.NVarChar(80),  "")
      .input("Uid",       sql.Int,           Number(uid)       || 0)
      .input("companyid", sql.Int,           Number(companyid) || 1)
      .execute("PR_IUD_GeneralM");
    res.json({
      rowsAffected:   result.rowsAffected,
      recordset:      result.recordset,
      recordsets:     result.recordsets,
      recordsetCount: result.recordsets?.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test PR_IUD_UserM (User create)
// GET /api/debug/iud-user?mode=1&username=TestUser99&pwd=Test123&companyid=1&userid=1
router.get("/iud-user", async (req, res) => {
  const { mode, username, pwd, companyid, userid, uid } = req.query;
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("companyid", sql.Int,          Number(companyid) || 1)
      .input("Mode",      sql.Int,          Number(mode)      || 1)
      .input("Userid",    sql.Int,          Number(uid)       || 0)
      .input("UserName",  sql.NVarChar(30), username          || "TestDebug99")
      .input("Pwd",       sql.NVarChar(30), pwd               || "Test@123")
      .input("active",    sql.Bit,          1)
      .execute("PR_IUD_UserM");
    res.json({
      rowsAffected:   result.rowsAffected,
      recordset:      result.recordset,
      recordsets:     result.recordsets,
      recordsetCount: result.recordsets?.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test PR_Get_GeneralMData_ForFrontgrid (check if delete moved record to inactive)
// GET /api/debug/get-general?tag=0&gtypemuid=1&companyid=1
router.get("/get-general", async (req, res) => {
  const { tag, gtypemuid, companyid } = req.query;
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("tag",       sql.Int, Number(tag)       ?? 0)
      .input("companyid", sql.Int, Number(companyid) || 1)
      .input("gtypemuid", sql.Int, Number(gtypemuid) || 1)
      .execute("PR_Get_GeneralMData_ForFrontgrid");
    res.json({
      rowsAffected: result.rowsAffected,
      recordset:    result.recordset,
      count:        result.recordset?.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test PR_Get_Users_ForFrontgrid
// GET /api/debug/get-users?tag=1&companyid=1
router.get("/get-users", async (req, res) => {
  const { tag, companyid } = req.query;
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("companyid", sql.Int, Number(companyid) || 1)
      .input("Tag",       sql.Int, Number(tag)       ?? 1)
      .execute("PR_Get_Users_ForFrontgrid");
    res.json({
      rowsAffected: result.rowsAffected,
      recordset:    result.recordset,
      count:        result.recordset?.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// Test PR_IUD_Location delete
// GET /api/debug/iud-location?mode=3&uid=1&companyid=1&userid=1
router.get("/iud-location", async (req, res) => {
  const { mode, uid, companyid, userid } = req.query;
  const { poolPromise, sql } = require("../database/sqlConnection");
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("Mode",      sql.Int,           Number(mode)     || 3)
      .input("Userid",    sql.Int,           Number(userid)   || 1)
      .input("gcode",     sql.NVarChar(100), "")
      .input("gname",     sql.NVarChar(200), "")
      .input("gpsid1",    sql.NVarChar(80),  "")
      .input("gpsid2",    sql.NVarChar(80),  "")
      .input("Uid",       sql.Int,           Number(uid)      || 0)
      .input("companyid", sql.Int,           Number(companyid)|| 1)
      .execute("PR_IUD_Location");
    res.json({
      rowsAffected:   result.rowsAffected,
      recordset:      result.recordset,
      recordsets:     result.recordsets,
      recordsetCount: result.recordsets?.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Test PR_Get_LocationData_ForFrontgrid
// GET /api/debug/get-location?tag=1&companyid=1
router.get("/get-location", async (req, res) => {
  const { tag, companyid } = req.query;
  const { poolPromise, sql } = require("../database/sqlConnection");
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("tag",       sql.Int, Number(tag)       ?? 1)
      .input("companyid", sql.Int, Number(companyid) || 1)
      .execute("PR_Get_LocationData_ForFrontgrid");
    res.json({ rowsAffected: result.rowsAffected, recordset: result.recordset, count: result.recordset?.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});