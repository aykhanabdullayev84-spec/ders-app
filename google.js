const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../db');
const { signToken } = require('./auth');

const router = express.Router();
const gclient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── POST /api/auth/google ──
router.post('/', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'id_token required' });

  try {
    // Verify the Google token
    const ticket = await gclient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { sub: google_id, email, name, picture } = ticket.getPayload();

    // Find existing user by google_id or email
    let user;
    const byGoogle = await pool.query('SELECT * FROM users WHERE google_id=$1', [google_id]);
    if (byGoogle.rows[0]) {
      user = byGoogle.rows[0];
    } else {
      const byEmail = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
      if (byEmail.rows[0]) {
        // Link Google to existing email account
        const { rows } = await pool.query(
          'UPDATE users SET google_id=$1, avatar=$2 WHERE id=$3 RETURNING *',
          [google_id, picture, byEmail.rows[0].id]
        );
        user = rows[0];
      } else {
        // Create new user
        const { rows } = await pool.query(
          `INSERT INTO users (email, google_id, name, avatar)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [email, google_id, name, picture]
        );
        user = rows[0];
      }
    }

    const { password, ...safeUser } = user;
    res.json({ token: signToken(user.id), user: safeUser });
  } catch (err) {
    console.error('[Google Auth]', err.message);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

module.exports = router;
