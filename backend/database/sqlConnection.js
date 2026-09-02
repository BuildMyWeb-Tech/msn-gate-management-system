const sql = require("mssql");

const config = {
  user:     process.env.DB_USER     || "msnadmin",
  password: process.env.DB_PASSWORD || "",
  server:   process.env.DB_HOST     || "108.181.197.190",
  port:     Number(process.env.DB_PORT) || 19649,
  database: process.env.DB_NAME     || "Gate_Mgmt",
  options: {
    encrypt:                false,
    trustServerCertificate: true,
    enableArithAbort:       true,
    connectTimeout:         60000,
    requestTimeout:         120000,
  },
  pool: {
    max:                       15,
    min:                       2,
    idleTimeoutMillis:         60000,
    acquireTimeoutMillis:      60000,
    createTimeoutMillis:       30000,
    destroyTimeoutMillis:      5000,
    reapIntervalMillis:        1000,
    createRetryIntervalMillis: 200,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("✅ MS SQL Server connected →", config.database, "DB");
    // Keepalive ping every 4 minutes to prevent timeout
    setInterval(() => {
      pool.request().query("SELECT 1").catch(() => {});
    }, 4 * 60 * 1000);
    return pool;
  })
  .catch(err => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { sql, poolPromise };