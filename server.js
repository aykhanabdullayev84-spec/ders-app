require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db');
const { router: authRouter } = require('./routes/auth');
const progressRouter = require('./routes/progress');
const googleRouter = require('./routes/google');

const app = express();
const PORT = process.env.PORT || 3001;

// ── MIDDLEWARE ──
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    /\.netlify\.app$/,
    /\.vercel\.app$/
  ],
  credentials: true
}));
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' }
});

// ── ROUTES ──
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/progress', progressRouter);
app.use('/api/auth/google', authLimiter, googleRouter);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', app: 'Ders API' }));
app.get('/', (_, res) => res.json({ status: 'ok', app: 'Ders API', version: '1.0.0' }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── START ──
initDB()
  .then(() => app.listen(PORT, () =>
    console.log(`[Ders API] Running on port ${PORT}`)))
  .catch(err => { console.error('[DB] Init failed:', err); process.exit(1); });
