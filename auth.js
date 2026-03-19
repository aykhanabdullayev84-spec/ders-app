const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

// ── HELPERS ──
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [decoded.id]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  const { email, password, name, goal, daily_mins } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password, name, goal, daily_mins)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, name, goal, daily_mins, xp, streak`,
      [email.toLowerCase().trim(), hash, name || null, goal || 'general', daily_mins || 5]
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user.id), user });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password' });

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let streak = user.streak;
    if (user.last_date === yesterday) streak += 1;
    else if (user.last_date !== today) streak = 1;

    await pool.query('UPDATE users SET streak=$1, last_date=$2 WHERE id=$3',
      [streak, today, user.id]);

    const { password: _, ...safeUser } = { ...user, streak };
    res.json({ token: signToken(user.id), user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/me ──
router.get('/me', authMiddleware, (req, res) => {
  const { password, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// ── PATCH /api/auth/profile ──
router.patch('/profile', authMiddleware, async (req, res) => {
  const { name, goal, daily_mins } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
        name       = COALESCE($1, name),
        goal       = COALESCE($2, goal),
        daily_mins = COALESCE($3, daily_mins)
       WHERE id=$4
       RETURNING id, email, name, goal, daily_mins, xp, streak`,
      [name, goal, daily_mins, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router, authMiddleware, signToken };
