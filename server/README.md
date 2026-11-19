# Aapka PG — Backend API

Node.js + Express + **PostgreSQL (Neon)** REST API for **Aapka PG**, a PG & hostel management app:
rooms & beds, owner-created tenant accounts, tenant documents, electricity readings, complaints,
food menu and notifications. Design: [`docs/LLD.md`](docs/LLD.md).

## Stack

Node 18+ (ESM) · Express 4 · `pg` (node-postgres) · JWT · bcryptjs · Zod · multer · helmet/cors/morgan

## Quick start

```bash
cd server
npm install
cp .env.example .env     # set DATABASE_URL (Neon or local Postgres) and JWT_SECRET
npm run seed             # creates tables (automatic) + demo data
npm run dev              # http://localhost:5000  (macOS: port 5000 is used by AirPlay — set PORT=5001)
```

`npm run seed:reset` wipes and reloads the demo data · `npm run migrate` only applies the schema.
Health check: `GET /api/health`.

## Database (Neon)

Create a project at <https://neon.tech>, copy the **pooled** connection string into `DATABASE_URL`
(keep `?sslmode=require`). Tables are created on start from `src/db/schema.sql`.

## Demo credentials (after seeding) — password `demo1234`

| Role | Login |
|---|---|
| Owner | `shreeganesh_pg_4821` (or `owner@shreeganeshpg.in`) |
| Manager | `manager@shreeganeshpg.in` |
| Tenant | mobile `9876500011` (Amit Kumar) |

## Environment

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | HTTP port |
| `DATABASE_URL` | local Postgres | Neon / Postgres connection string |
| `DB_POOL_SIZE` | `10` | Max pooled connections |
| `JWT_SECRET` | dev fallback | **Required in production** |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins |

## Layout

```
src/
  db/            schema.sql, pool + query helpers, migrate
  repositories/  SQL per aggregate (accounts, rooms, tenants, documents, operations, notifications)
  controllers/   HTTP handlers          routes/  guards + validation per route
  middlewares/   auth, validate, upload, errors
  services/      notification engine, delivery, tokens, username rules
  seed/          demo data
```
