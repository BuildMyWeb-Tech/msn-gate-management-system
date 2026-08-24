const express = require("express");
const router  = express.Router();

// GET /api/debug/visitor/:uid?companyid=1
router.get("/visitor/:uid", async (req, res) => {
  const { uid } = req.params;
  const companyid = Number(req.query.companyid) || 1;
  const { poolPromise, sql } = require("../database/sqlConnection");
  try {
    const pool = await poolPromise;
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const result = await pool.request()
      .input("Tag",       sql.Bit,    1)
      .input("companyid", sql.Int,    companyid)
      .input("Dt",        sql.Date,   new Date(date))
      .input("Gateuid",   sql.BigInt, 0)
      .execute("PR_GetVisitorData_FrontGrid");
    const row = result.recordset?.find(r => Number(r.uid) === Number(uid));
    if (!row) return res.json({ found:false, date, totalRows:result.recordset?.length });
    res.json({
      found:       true,
      uid:         row.uid,
      VName:       row.VName,
      photoStatus: row.VPhotoPath ? "present" : "empty",
      photoLength: row.VPhotoPath?.length || 0,
      photoStart:  row.VPhotoPath?.slice(0,40) || "",
      allColumns:  Object.keys(row),
    });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/debug/validate-mobile?mobile=xxx&companyid=1
router.get("/validate-mobile", async (req, res) => {
  const { mobile, companyid } = req.query;
  const { poolPromise, sql } = require("../database/sqlConnection");
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("mobile",    sql.NVarChar(50), String(mobile||""))
      .input("companyid", sql.Int,          Number(companyid)||1)
      .execute("PR_Validate_Mobileno");
    res.json({ columns:result.recordset?.[0]?Object.keys(result.recordset[0]):[], recordset:result.recordset, count:result.recordset?.length });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/debug/app-login?username=S001&password=S001&companycode=514670
router.get("/app-login", async (req, res) => {
  const { username, password, companycode } = req.query;
  const { poolPromise, sql } = require("../database/sqlConnection");
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("UserName",    sql.NVarChar(50),  String(username||""))
      .input("Password",    sql.NVarChar(50),  String(password||""))
      .input("companycode", sql.NVarChar(100), String(companycode||""))
      .execute("PR_AppValidate_SecurityLogin");
    res.json({ columns:result.recordset?.[0]?Object.keys(result.recordset[0]):[], recordset:result.recordset, count:result.recordset?.length });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/debug/app-menus?userid=1
router.get("/app-menus", async (req, res) => {
  const { userid } = req.query;
  const { poolPromise, sql } = require("../database/sqlConnection");
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Userid", sql.Int, Number(userid)||1)
      .execute("PR_GetApp_UserMenus");
    res.json({ columns:result.recordset?.[0]?Object.keys(result.recordset[0]):[], recordset:result.recordset, count:result.recordset?.length, recordsets:result.recordsets?.length });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/debug/user-menus?userid=1
router.get("/user-menus", async (req, res) => {
  const { userid } = req.query;
  const { poolPromise, sql } = require("../database/sqlConnection");
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("userid", sql.Int, Number(userid)||1)
      .execute("PR_Get_UserMenus");
    res.json({ columns:result.recordset?.[0]?Object.keys(result.recordset[0]):[], recordset:result.recordset, count:result.recordset?.length });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/debug/securities?companyid=1
router.get("/securities", async (req, res) => {
  const { companyid } = req.query;
  const { poolPromise, sql } = require("../database/sqlConnection");
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Tag",       sql.Bit, 1)
      .input("companyid", sql.Int, Number(companyid)||1)
      .execute("PR_GetSecurityData_FrontGrid");
    res.json({ columns:result.recordset?.[0]?Object.keys(result.recordset[0]):[], first_row:result.recordset?.[0]||null, count:result.recordset?.length });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/debug/app-login-check?username=Admin&password=Admin&companycode=514670
router.get("/app-login-check", async (req, res) => {
  const { username, password, companycode } = req.query;
  const { poolPromise, sql } = require("../database/sqlConnection");
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("UserName",    sql.NVarChar(50),  String(username||""))
      .input("Password",    sql.NVarChar(50),  String(password||""))
      .input("companycode", sql.NVarChar(100), String(companycode||"514670"))
      .execute("PR_AppValidate_SecurityLogin");
    const row = result.recordset?.[0] || null;
    res.json({
      columns:      row ? Object.keys(row) : [],
      row,
      ResponseCode: row?.ResponseCode,
      isSuccess:    row?.ResponseCode === 100 || row?.ResponseCode === 101,
      message:      row?.ResponseMessage,
    });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;