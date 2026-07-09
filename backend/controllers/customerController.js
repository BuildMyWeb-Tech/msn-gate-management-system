const customerService = require("../services/customerService");
 
exports.getAll = async (req, res, next) => {
  try {
    const active = req.query.active === "0" ? 0 : 1;
    const data   = await customerService.getCustomers(active);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
 
exports.getById = async (req, res, next) => {
  try {
    const uid  = Number(req.params.id);
    const data = await customerService.getCustomerById(uid);
    if (!data) return res.status(404).json({ success: false, message: "Customer not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
 
exports.create = async (req, res, next) => {
  try {
    const result = await customerService.createCustomer(req.body);
    res.json({ success: true, message: result?.ResponseMessage || "Customer created successfully" });
  } catch (err) { next(err); }
};
 
exports.update = async (req, res, next) => {
  try {
    const result = await customerService.updateCustomer(req.params.id, req.body);
    res.json({ success: true, message: result?.ResponseMessage || "Customer updated successfully" });
  } catch (err) { next(err); }
};
 
// ✅ FIX: No existingData fetch needed — PR_Delete_PartyM only needs Uid + Status
exports.remove = async (req, res, next) => {
  try {
    const result = await customerService.deleteCustomer(req.params.id);
    res.json({ success: true, message: result?.ResponseMessage || "Customer deleted successfully" });
  } catch (err) { next(err); }
};
 
// ✅ RESTORE
exports.restore = async (req, res, next) => {
  try {
    const result = await customerService.restoreCustomer(req.params.id);
    res.json({ success: true, message: result?.ResponseMessage || "Customer restored successfully" });
  } catch (err) { next(err); }
};