const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'civictrack_super_secret_jwt_key_2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ward_id: user.ward_id,
      is_head: Boolean(user.is_head)
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// 1. Citizen Register (Self-service)
router.post(
  '/citizen/register',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional().trim().isLength({ max: 15 }).withMessage('Phone cannot exceed 15 characters'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { name, email, password, phone } = req.body;

      // Check existing email
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await pool.query(
        `INSERT INTO users (name, email, phone, password_hash, role, ward_id, is_head)
         VALUES (?, ?, ?, ?, 'citizen', NULL, FALSE)`,
        [name, email, phone || null, passwordHash]
      );

      const newUser = {
        id: result.insertId,
        name,
        email,
        role: 'citizen',
        ward_id: null,
        is_head: false
      };

      const token = generateToken(newUser);

      res.status(201).json({
        message: 'Citizen registration successful',
        token,
        user: newUser
      });
    } catch (err) {
      next(err);
    }
  }
);

// 2. Citizen Login (Role must be citizen)
router.post(
  '/citizen/login',
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = users[0];

      // Cross-portal rejection rule
      if (user.role !== 'citizen') {
        return res.status(403).json({
          error: 'Officer accounts must log in via the Officer Portal (/officer/login)'
        });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ward_id: user.ward_id,
        is_head: Boolean(user.is_head)
      };

      const token = generateToken(userData);

      res.json({
        message: 'Citizen login successful',
        token,
        user: userData
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Officer Login (Role must be officer)
router.post(
  '/officer/login',
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const [users] = await pool.query(
        `SELECT u.*, w.name AS ward_name
         FROM users u
         LEFT JOIN wards w ON u.ward_id = w.id
         WHERE u.email = ?`,
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = users[0];

      // Cross-portal rejection rule
      if (user.role !== 'officer') {
        return res.status(403).json({
          error: 'Citizen accounts must log in via the Citizen Portal (/login)'
        });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ward_id: user.ward_id,
        ward_name: user.ward_name,
        is_head: Boolean(user.is_head)
      };

      const token = generateToken(userData);

      res.json({
        message: 'Officer login successful',
        token,
        user: userData
      });
    } catch (err) {
      next(err);
    }
  }
);

// 4. Current user check
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.ward_id, u.is_head, u.created_at, w.name AS ward_name
       FROM users u
       LEFT JOIN wards w ON u.ward_id = w.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = users[0];
    res.json({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        ward_id: u.ward_id,
        ward_name: u.ward_name,
        is_head: Boolean(u.is_head),
        created_at: u.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

