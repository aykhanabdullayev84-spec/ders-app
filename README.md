# Ders API Backend

Backend server for the Ders language learning app.

## Deploy to Railway (Free)

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. Add PostgreSQL database:
   - Click "New" → "Database" → "PostgreSQL"
6. Set environment variables in Railway:
   - `JWT_SECRET` = any random string (e.g., `ders-secret-key-abc123xyz`)
   - `JWT_EXPIRES_IN` = `7d`
   - `GOOGLE_CLIENT_ID` = `596721990995-0u4qm1dojq61rjidm6o93319kr4rus63.apps.googleusercontent.com`
   - `FRONTEND_URL` = `https://ders-app.netlify.app`
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (Railway auto-fills this when you add PostgreSQL)

7. Deploy!

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/google` - Google Sign-In
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile
- `POST /api/progress` - Save lesson progress
- `GET /api/progress` - Get user progress
- `GET /api/progress/leaderboard` - Get leaderboard

## Local Development

```bash
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```
