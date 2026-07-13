import axios from "axios";
const BASE = import.meta.env.VITE_API_URL || "/api";

export const loginUser = async ({ username, password, companyCode, gateId }) => {
  const res = await axios.post(`${BASE}/auth/login`, {
    username,
    password,
    companyCode: String(companyCode),  // VarChar
    gateId,
  });
  return res.data;
};

export const getGates = async (companyCode = "514670") => {
  const res = await axios.get(`${BASE}/auth/gates?companyCode=${companyCode}`);
  return res.data;
};
