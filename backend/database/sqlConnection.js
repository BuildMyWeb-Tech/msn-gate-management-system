require("dotenv").config();
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("✅ SQL Connected");
    return pool;
  })
  .catch(err => {
    console.error("❌ DB Connection Failed:", err.message);
    throw err; // 🔥 VERY IMPORTANT FIX
  });

module.exports = { sql, poolPromise };