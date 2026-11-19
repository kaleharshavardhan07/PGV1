# Aapka PG

PG & hostel management — React (Vite) frontend + Node.js/Express API on PostgreSQL ([Neon](https://neon.tech)).

| Layer | Stack | Location |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind | `src/` |
| Backend | Node.js + Express 4 + PostgreSQL/Neon (`pg`) + JWT | `server/` |
| Design docs | — | [`server/docs/LLD.md`](server/docs/LLD.md), [`docs/FRONTEND-LLD.md`](docs/FRONTEND-LLD.md) |

## Prerequisites

- **Node.js 20.19+ or 22.12+** (required by the Vite 8 toolchain)
- A **Neon** project (free) — or any PostgreSQL — and its connection string

## 1. Start the API

```bash
cd server
npm install
cp .env.example .env     # set DATABASE_URL (Neon) + a strong JWT_SECRET
npm run seed             # creates the tables and loads demo data
npm run dev              # http://localhost:5000  (on macOS set PORT=5001: AirPlay uses 5000)
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

## Demo accounts (after `npm run seed`) — password `demo1234`

| Role | Login |
|---|---|
| Owner | `shreeganesh_pg_4821` |
| Manager | `manager@shreeganeshpg.in` |
| Tenant | `9876500011` (Amit Kumar) |

Owners register at `/register` (one form, no payment). **Tenants cannot sign themselves up**: the owner creates
each tenant account (Tenants → Add tenant) and shares the generated mobile + password.

## Features

- **Rooms & beds** — owners add, edit and delete rooms and beds; occupancy is derived from tenants, so it can't drift.
- **Tenant accounts** — created and managed by the owner/manager; mobile + password login (no OTP); reset passwords any time.
- **Documents** — upload ID proofs, agreements and photos per tenant (PDF/JPG/PNG/WebP, ≤ 5 MB), stored in the database.
- Electricity readings and shares, complaints, food menu and notifications.
- No payment flow: there is no rent ledger, gateway, subscription or checkout.

## Deploy (single service on Render)

Express serves both the API (`/api/*`) and the built SPA, so one Render Web
Service runs everything with no CORS or base-URL configuration.

| Render setting | Value |
|---|---|
| Build Command | `npm ci --include=dev && npm ci --prefix server && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/api/health` |

A ready-to-use [`render.yaml`](render.yaml) blueprint is included. Full
step-by-step instructions (Neon, env vars, seeding):
[`docs/DEPLOY-RENDER.md`](docs/DEPLOY-RENDER.md).

## Project layout

```
.
├── src/                    # React frontend
│   ├── api/                # REST client, typed endpoints, DTO adapters
│   ├── components/         # Shared UI (layout, sidebar, modal, toast...)
│   ├── pages/              # role-based screens
│   ├── store/              # API-backed app store (external store + hooks)
│   ├── services/           # Pure domain helpers (billing, plans, formatting)
│   └── types/              # Domain model
├── server/                 # Express + PostgreSQL (Neon) API (see server/README.md)
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

- WhatsApp/SMS/email delivery is **simulated** and labelled as such; each has a seam for a real provider.
