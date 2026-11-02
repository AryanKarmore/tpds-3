const express = require('express');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const complaintService = require('../services/complaintService');

const router = express.Router();

// GET /api/map/complaints (Officer map markers)
router.get('/complaints', authenticate, requireRole('officer'), async (req, res, next) => {
  try {
    const { ward_id, category_id, status, overdue_only } = req.query;
    const markers = await complaintService.getOfficerMapMarkers(req.user, {
      ward_id,
      category_id,
      status,
      overdue_only
    });
    res.json({ markers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

