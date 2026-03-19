const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// ── POST /api/progress ── Save lesson progress
router.post('/', authMiddleware, async (req, res) => {
  const { lesson_id, accuracy, xp_earned } = req.body;
  const user_id = req.user.id;

  if (!lesson_id) return res.status(400).json({ error: 'lesson_id required' });

  try {
    // Upsert progress
    await pool.query(`
      INSERT INTO progress (user_id, lesson_id, accuracy, xp_earned)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET accuracy = GREATEST(progress.accuracy, $3),
                    xp_earned = GREATEST(progress.xp_earned, $4),
                    completed_at = NOW()
    `, [user_id, lesson_id, accuracy || 0, xp_earned || 0]);

    // Update user XP
    await pool.query(
      'UPDATE users SET xp = xp + $1 WHERE id = $2',
      [xp_earned || 0, user_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/progress ── Get user's progress
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT lesson_id, accuracy, xp_earned, completed_at FROM progress WHERE user_id = $1 ORDER BY lesson_id',
      [req.user.id]
    );
    res.json({ progress: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/progress/leaderboard ── Get leaderboard
router.get('/leaderboard', async (req, res) => {
  const { period } = req.query; // 'weekly', 'monthly', 'all'
  
  let dateFilter = '';
  if (period === 'weekly') {
    dateFilter = "AND created_at > NOW() - INTERVAL '7 days'";
  } else if (period === 'monthly') {
    dateFilter = "AND created_at > NOW() - INTERVAL '30 days'";
  }

  try {
    const { rows } = await pool.query(`
      SELECT id, name, avatar, xp, streak
      FROM users
      WHERE xp > 0 ${dateFilter}
      ORDER BY xp DESC
      LIMIT 20
    `);
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
