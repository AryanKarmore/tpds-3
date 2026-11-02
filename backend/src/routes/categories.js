const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, sla_days, severity_weight FROM categories ORDER BY id ASC');
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
