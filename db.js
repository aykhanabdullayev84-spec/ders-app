const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        avatar TEXT,
        name VARCHAR(100),
        goal VARCHAR(50) DEFAULT 'general',
        daily_mins INTEGER DEFAULT 5,
        xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        last_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL,
        accuracy INTEGER DEFAULT 0,
        xp_earned INTEGER DEFAULT 0,
        completed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, lesson_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
    `);
    console.log('[DB] Tables initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
