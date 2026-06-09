# FEP — Faculty Excellence Program · Dashboard

Premium dual-role dashboard for Adda247's Faculty Excellence Program. Faculty upload teaching videos; Gradi AI auto-scores them; managers add their own ratings side-by-side. Built dark-first with Framer Motion throughout.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19)
- **TypeScript** strict
- **Tailwind v4** + custom design tokens
- **Framer Motion** — page transitions, score ring animations, drawer slides, layout shifts
- **DynamoDB** (5 tables) via AWS SDK v3
- **JWT** auth via `jose` (httpOnly cookies)
- **TanStack Query** for client data
- **Recharts** for radar charts
- **Gradi AI** for automatic video evaluation

## Setup

```bash
# 1. Install
npm install

# 2. Provision DynamoDB tables
npm run db:setup

# 3. Seed users + subjects
npm run db:seed

# 4. Run
npm run dev
```

Open <http://localhost:3000> and sign in.

### Demo accounts (password: `fep123`)

- **Faculty:** ankita@fep.local, shuaib@fep.local, vipin@fep.local, fateh@fep.local …
- **Manager:** roshan@fep.local, ayush@fep.local

## Tables

| Table | PK | SK | Notes |
|---|---|---|---|
| `fep-users` | userId | — | GSI: `email-index` |
| `fep-videos` | facultyId | videoId | GSI: `subjectId-uploadedAt-index` |
| `fep-gradi-analyses` | videoId | — | Gradi auto-fills |
| `fep-manager-ratings` | videoId | managerId | One rating per (video, manager) |
| `fep-subjects` | subjectId | — | math, science, english, sst, reasoning, gs |

## Routes

| Path | Purpose |
|---|---|
| `/login` | Email/password sign-in |
| `/faculty` | Faculty dashboard — upload, video grid, Gradi score rings, side drawer |
| `/manager` | Manager console — leaderboard, faculty drill-down, inline rating sliders, radar charts |

## API

| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | any |
| GET  | `/api/auth/me` | any |
| GET  | `/api/subjects` | any |
| GET  | `/api/videos` | faculty (own), manager (all) |
| POST | `/api/videos` | faculty — triggers Gradi async |
| GET  | `/api/videos/[videoId]` | both |
| POST | `/api/ratings` | manager only — auto-save upsert |
| GET  | `/api/users` | manager only |
| GET  | `/api/stats` | own; `?scope=all` for cohort aggregate |

## Gradi flow

`POST /api/videos` saves video with `status: "analyzing"`, then fires off the Gradi call in the background. On success it persists the analysis and bumps status to `gradi_done`. The dashboard polls every 6 seconds so the score ring animates in automatically.

## Security note

Rotate the AWS credentials currently in `.env.local` before pushing this anywhere. They were provided in chat for local dev only.
