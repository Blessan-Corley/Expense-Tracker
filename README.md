# Expense Tracker

A simple full-stack expense tracker for personal use and small groups.

## What It Does

- User registration and login
- Add income and expense transactions
- Savings goals
- Recurring transactions
- Analytics dashboard
- CSV import/export
- Installable PWA

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Zustand, React Router, Axios, Recharts
- Backend: Node.js, Express, Joi, JWT, Helmet, rate limiting
- Database: PostgreSQL with Prisma ORM
- Mobile path: Capacitor 8 (Android project present)
- Testing: Jest + Supertest, Vitest + Testing Library

## Project Structure

- `apps/frontend` - UI + PWA
- `apps/backend` - API + Prisma

## Quick Start (Local)

1. Install dependencies
```bash
npm install
```

2. Create env files from the single repo example
- Copy `/.env.example` values into `apps/backend/.env`
- Create `apps/frontend/.env` with:
```bash
VITE_API_URL=http://localhost:5000/api
```

3. Push schema to database
```bash
cd apps/backend
npm run db:push
```

4. Run both apps
```bash
cd ../..
npm run dev
```

5. Open
- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/api/health`

## Preview Production Build

```bash
npm run build --workspace=@expense-tracker/backend
npm run build --workspace=@expense-tracker/frontend
npm run preview --workspace=@expense-tracker/frontend
```

Open `http://localhost:4173`.

## End-to-End Test Flow

1. Register account
2. Login
3. Add income and expense
4. Create goal and add contribution
5. Add recurring transaction and process
6. Verify dashboard analytics update
7. Logout/login again to verify session

## Phone Usage (No Play Store)

### Option 1: PWA (recommended)
- Deploy frontend over HTTPS
- Open in mobile browser and install to home screen

### Option 2: Capacitor APK sideload (Android)
```bash
cd apps/frontend
npm run cap:sync
npm run cap:open
```
Build/install from Android Studio.

## Deploy (After Local E2E Pass)

- Frontend: Cloudflare Pages or Vercel
- Backend: Render Web Service
- Database: Neon Postgres

Required backend production env vars:
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `CORS_ORIGIN=<your frontend domain>`

Required frontend env var:
- `VITE_API_URL=https://<your-backend-domain>/api`
