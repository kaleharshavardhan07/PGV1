# Aapka PG

PG & hostel management platform — React (Vite) frontend + Node.js/Express/MongoDB API.

| Layer | Stack | Location |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind | `src/` |
| Backend | Node.js + Express 4 + MongoDB (Mongoose) + JWT | `server/` |
| Design docs | — | [`server/docs/LLD.md`](server/docs/LLD.md), [`docs/FRONTEND-LLD.md`](docs/FRONTEND-LLD.md) |

## Prerequisites

- **Node.js 20.19+ or 22.12+** (required by the Vite 8 toolchain)
- **MongoDB** running locally (or a connection string)

## 1. Start the API

```bash
cd server
npm install
cp .env.example .env     # set MONGO_URI + a strong JWT_SECRET
npm run seed             # load the demo PG, users and data
npm run dev              # http://localhost:5000
```

Health check: <http://localhost:5000/api/health>

Other scripts: `npm start` (production), `npm run seed:reset` (wipe + re-seed).

## 2. Start the frontend

```bash
# from the repository root
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:5000
npm run dev              # http://localhost:5173
```

## Demo accounts (after `npm run seed`)

| Role | Login | Password / OTP |
|---|---|---|
| Owner | `shreeganesh_pg_4821` | `demo1234` |
| Manager | `manager@shreeganeshpg.in` | `demo1234` |
| Tenant | `9876500011` (Amit Kumar) | OTP `1234` |

New owners can self-register at `/subscribe` (7-step onboarding with a simulated,
signature-verified payment). New tenants register from the login page.

## Deploy (single service on Render)

Express serves both the API (`/api/*`) and the built SPA, so one Render Web
Service runs everything with no CORS or base-URL configuration.

| Render setting | Value |
|---|---|
| Build Command | `npm ci --include=dev && npm ci --prefix server && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/api/health` |

A ready-to-use [`render.yaml`](render.yaml) blueprint is included. Full
step-by-step instructions (MongoDB Atlas, env vars, seeding):
[`docs/DEPLOY-RENDER.md`](docs/DEPLOY-RENDER.md).

## Project layout

```
.
├── src/                    # React frontend
│   ├── api/                # REST client, typed endpoints, DTO adapters
│   ├── components/         # Shared UI (layout, sidebar, modal, toast...)
│   ├── pages/              # 24 role-based screens
│   ├── store/              # API-backed app store (external store + hooks)
│   ├── services/           # Pure domain helpers (billing, plans, formatting)
│   └── types/              # Domain model
├── server/                 # Express + MongoDB API (see server/README.md)
├── render.yaml             # Render blueprint (single-service deploy)
├── docs/FRONTEND-LLD.md    # Frontend architecture & integration design
└── docs/DEPLOY-RENDER.md   # Deployment guide
```

## Scripts (root)

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Oxlint |

## Notes

- The prototype's browser-only store was replaced by an API-backed one;
  `src/store/appStore.ts` is now a re-export shim, so the pages were untouched.
- OTP delivery, payment gateway callbacks and WhatsApp/SMS/email delivery are
  **simulated** and clearly labelled - each has a documented seam for a real
  provider.
