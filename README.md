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
npm run seed             # creates/upgrades the tables and loads demo data
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

## Demo accounts (after `npm run seed`): password `demo1234`

| Role | Login |
|---|---|
| Platform admin | `admin@aapkapg.in` at `/admin/login` |
| Owner | `shreeganesh_pg_4821` |
| Manager | `manager@shreeganeshpg.in` (can manage tenants, food, expenses, documents, complaints) |
| Tenant | `9876500011` (Amit Kumar) |

Owners register at `/register`. **Tenants and managers cannot sign themselves up**: the owner creates each account and
shares the generated credentials.

## Features

- **Rooms & beds**: add/edit/delete rooms and beds, **bulk room creation** with a review step, a **visual floor plan**
  (vacant / occupied / notice / unavailable) with tenant allocation, safe deletes (occupied rooms/beds are protected).
- **Roles & permissions** enforced by the API: owner, manager (owner-granted permissions), tenant (own data only), platform admin.
- **Admin panel**: allow or block modules per PG (food, rooms, expenses, documents, billing, complaints, exports); owners switch
  within that. Disabled modules disappear from the UI and return 403 on direct API calls.
- **Documents**: PDF/JPG/PNG/WebP ≤ 5 MB, attached to tenants, expenses or invoices; tenants upload receipts where asked.
- **Expenses** (replaces electricity) and **invoices**: record-keeping only, with receipts. There is no online payment.
- **Food menu** management for owners/managers; tenants view, opt out and rate.
- **Find PG**: location search (area/city/near me), filters (gender, sharing, price, availability, distance), contact owner
  (call, WhatsApp, saved enquiry), detail page with map and packages. Owners pick their location on a map.
- **Export** to CSV / Excel. **Email** via Proton SMTP (optional).

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
