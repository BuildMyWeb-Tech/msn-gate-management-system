// Run: node diagnose.js
// This will show EXACTLY which file is broken

const routes = [
  "./routes/debugRoute",
  "./routes/authRoutes",
  "./routes/visitorRoutes",
  "./routes/vehicleRoutes",
  "./routes/setupRoutes",
  "./routes/patrolRoutes",
  "./routes/userRoutes",
  "./routes/photoRoutes",
  "./routes/compVehicleRoutes",
];

for (const r of routes) {
  try {
    const mod = require(r);
    const type = typeof mod;
    const isRouter = type === "function" || (type === "object" && mod && mod.stack);
    console.log(`${isRouter ? "✅" : "❌"} ${r} → type: ${type}, isRouter: ${isRouter}`);
  } catch(e) {
    console.log(`💥 ${r} → CRASH: ${e.message}`);
  }
}