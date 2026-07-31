// controllers/visitorController.js
const service = require('../services/visitorService');

exports.getAll = async (req, res, next) => {
  try {
    const { companyId, gateId } = req.gmsUser;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const data = await service.getVisitors({ companyId, gateId, date });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { companyId, gateId, userId } = req.gmsUser;
    const result = await service.createVisitor({ companyId, gateId, userId, body: req.body });
    res.json({ success: true, message: result?.ResponseMessage || 'Visitor registered' });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { companyId, gateId, userId } = req.gmsUser;
    const result = await service.updateVisitor({
      companyId,
      gateId,
      userId,
      uid: req.params.id,
      body: req.body,
    });
    res.json({ success: true, message: result?.ResponseMessage || 'Visitor updated' });
  } catch (err) {
    next(err);
  }
};

exports.markOut = async (req, res, next) => {
  try {
    const { companyId, userId } = req.gmsUser;
    const result = await service.markVisitorOut({
      companyId,
      userId,
      uid: req.params.id,
      body: req.body,
    });
    res.json({ success: true, message: result?.ResponseMessage || 'Visitor checked out' });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await service.deleteVisitor({ uid: req.params.id });
    res.json({ success: true, message: result?.ResponseMessage || 'Visitor deleted' });
  } catch (err) {
    next(err);
  }
};
