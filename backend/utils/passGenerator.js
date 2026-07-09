// utils/passGenerator.js
// Pass Number Format: PASS-YYYYMMDD-001
// Resets daily — sequence tracked per day
// Configurable via .env PASS_PREFIX

const PASS_PREFIX = process.env.PASS_PREFIX || "PASS";

// In-memory daily counter (resets when date changes)
// For production: use DB sequence via SP
let passCounter = {
  date: "",
  seq: 0,
};

/**
 * Generate next pass number
 * Format: PASS-YYYYMMDD-001
 */
function generatePassNo() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, "0");
  const day    = String(now.getDate()).padStart(2, "0");
  const today  = `${year}${month}${day}`;

  // Reset counter if new day
  if (passCounter.date !== today) {
    passCounter.date = today;
    passCounter.seq  = 0;
  }

  passCounter.seq += 1;
  const seq = String(passCounter.seq).padStart(3, "0");

  return `${PASS_PREFIX}-${today}-${seq}`;
}

/**
 * Format date as YYYYMMDD string
 */
function getTodayString() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

module.exports = { generatePassNo, getTodayString };