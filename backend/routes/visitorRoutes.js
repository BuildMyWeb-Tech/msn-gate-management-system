// routes/visitorRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/visitorController');
const { gmsProtect } = require('../middleware/authMiddleware');

router.use(gmsProtect);

router.get('/', ctrl.getAll); // GET  /api/visitors?date=YYYY-MM-DD
router.post('/', ctrl.create); // POST /api/visitors
router.put('/:id', ctrl.update); // PUT  /api/visitors/:id
router.patch('/:id/out', ctrl.markOut); // PATCH /api/visitors/:id/out
router.delete('/:id', ctrl.remove); // DELETE /api/visitors/:id

module.exports = router;
