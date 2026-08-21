const sql = require("mssql");

const config = {
  user:     process.env.DB_USER     || "msnadmin",
  password: process.env.DB_PASSWORD || "",
  server:   process.env.DB_HOST     || "108.181.197.190",
  port:     Number(process.env.DB_PORT) || 19649,
  database: process.env.DB_NAME     || "Gate_Mgmt",
  options: {
    encrypt:              false,
    trustServerCertificate: true,
    enableArithAbort:     true,
    connectTimeout:       30000,  // 30s connect timeout
    requestTimeout:       60000,  // 60s query timeout
  },
  pool: {
    max:              10,   // max connections
    min:              2,    // keep 2 warm
    idleTimeoutMillis: 30000,  // close idle after 30s
    acquireTimeoutMillis: 30000, // wait up to 30s for connection
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("✅ MS SQL Server connected →", config.database, "DB");
    return pool;
  })
  .catch(err => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { sql, poolPromise };