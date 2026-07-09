const repo = require("../repositories/customerRepo");
 
function normaliseGridRow(row) {
  return {
    uid:     row.uid     ?? row.UID      ?? 0,
    Pcode:   row.Pcode   ?? row.pcode    ?? "",
    Pname:   row.Pname   ?? row.pname    ?? row.Customer ?? row.name ?? "",
    Pbranch: row.Pbranch ?? row.pbranch  ?? row.branch   ?? "",
    State:   row.State   ?? row.state    ?? "",
    GSTNo:   row.GSTNo   ?? row.gstno   ?? "",
    Mobile:  row.Mobile  ?? row.mobile  ?? null,
    Active:  row.Active  ?? row.active  ?? 1,
  };
}
 
async function getCustomers(active) {
  const data = await repo.getCustomerGrid(active);
  return data.map(normaliseGridRow);
}
 
async function getCustomerById(uid) {
  return await repo.getCustomerForEdit(uid);
}
 
async function createCustomer(body) {
  const payload = {
    Active: body.Active ?? 1, Address1: body.Address1 || "",
    Address2: body.Address2 || "", City: body.City || "",
    GSTNo: body.GSTNo || "",
    Mobile: body.Mobile != null ? body.Mobile : null,
    Pbranch: body.Pbranch || "",
    Pincode: body.Pincode != null ? body.Pincode : null,
    Pname: body.Pname || "", Ptype: 2, State: body.State || "",
    contactperson: body.contactperson || "", country: "India",
    email: body.email || "", uid: 0, website: body.website || "",
  };
  const result = await repo.iuCustomer(JSON.stringify(payload));
  return result[0];
}
 
async function updateCustomer(uid, body) {
  const payload = {
    Active: body.Active ?? 1, Address1: body.Address1 || "",
    Address2: body.Address2 || "", City: body.City || "",
    GSTNo: body.GSTNo || "",
    Mobile: body.Mobile != null ? body.Mobile : null,
    Pbranch: body.Pbranch || "", Pcode: body.Pcode || "",
    Pincode: body.Pincode != null ? body.Pincode : null,
    Pname: body.Pname || "", Ptype: 2, State: body.State || "",
    contactperson: body.contactperson || "", country: "India",
    email: body.email || "", uid: Number(uid), website: body.website || "",
  };
  const result = await repo.iuCustomer(JSON.stringify(payload));
  return result[0];
}
 
// ✅ FIX: Use PR_Delete_PartyM with Status=0
async function deleteCustomer(uid) {
  return await repo.deleteRestoreCustomer(Number(uid), 0);
}
 
// ✅ FIX: Use PR_Delete_PartyM with Status=1
async function restoreCustomer(uid) {
  return await repo.deleteRestoreCustomer(Number(uid), 1);
}
 
module.exports = {
  getCustomers, getCustomerById,
  createCustomer, updateCustomer,
  deleteCustomer, restoreCustomer,
};