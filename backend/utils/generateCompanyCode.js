// utils/generateCompanyCode.js
const Company = require('../models/Company');

const randomDigits = () => Math.floor(1000 + Math.random() * 9000).toString();

const generateCompanyCode = async (maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const code = `COMP-${randomDigits()}`;
    const exists = await Company.findOne({ companyCode: code });
    if (!exists) return code;
  }
  return `COMP-${Date.now().toString().slice(-6)}`;
};

module.exports = generateCompanyCode;