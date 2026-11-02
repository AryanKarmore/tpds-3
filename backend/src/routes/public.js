const express = require('express');
const complaintService = require('../services/complaintService');

const router = express.Router();

// GET /api/public/map (Sanitized markers, no personal names or contact info)
router.get('/map', async (req, res, next) => {
  try {
    const { category_id, status, ward_id } = req.query;
    const markers = await complaintService.getPublicMapMarkers({
      category_id,
      status,
      ward_id
    });
    res.json({ markers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
