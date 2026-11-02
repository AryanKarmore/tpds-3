const express = require('express');
const pool = require('../config/db');
const { getWardScores } = require('../services/scoreService');

const router = express.Router();

// GET /api/wards
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.id, w.name, w.latitude, w.longitude, z.id AS zone_id, z.name AS zone_name
       FROM wards w
       JOIN zones z ON w.zone_id = z.id
       ORDER BY w.id ASC`
    );

    const wards = rows.map((w) => ({
      id: w.id,
      name: w.name,
      latitude: parseFloat(w.latitude),
      longitude: parseFloat(w.longitude),
      zone_id: w.zone_id,
      zone_name: w.zone_name
    }));

    res.json({ wards });
  } catch (err) {
    next(err);
  }
});

// GET /api/wards/scores
router.get('/scores', async (req, res, next) => {
  try {
    const scores = await getWardScores();
    res.json({ scores });
  } catch (err) {
    next(err);
  }
});

// GET /api/wards/:id/score
router.get('/:id/score', async (req, res, next) => {
  try {
    const scores = await getWardScores(req.params.id);
    if (scores.length === 0) {
      return res.status(404).json({ error: 'Ward not found' });
    }
    res.json({ score: scores[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

