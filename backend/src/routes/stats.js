const express = require('express');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const complaintService = require('../services/complaintService');

const router = express.Router();

// GET /api/stats/summary (Officer dashboard KPI counts)
router.get('/summary', authenticate, requireRole('officer'), async (req, res, next) => {
  try {
    const stats = await complaintService.getOfficerStats(req.user);
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
