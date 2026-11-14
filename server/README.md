# Aapka PG — Backend API

Node.js + Express + MongoDB REST API for **Aapka PG**, a PG & hostel management platform.
It powers the existing React frontend with real authentication, a multi-PG SaaS
registry, tenant/room/bed management, billing, complaints, food, notifications,
and subscription billing.

## Tech stack

- **Node.js 18+** (ES modules)
- **Express 4** — routing & middleware
- **MongoDB + Mongoose 8** — data layer
- **JWT** (`jsonwebtoken`) — authentication
- **bcryptjs** — password hashing
- **Zod** — request validation
- helmet, cors, morgan, dotenv

## Quick start

```bash
cd server
npm install
cp .env.example .env     # then edit MONGO_URI / JWT_SECRET as needed
npm run seed             # seed the demo PG, users and data
npm run dev              # start the API (http://localhost:5000)
```

To wipe and re-seed:

```bash
npm run seed:reset
```

Health check: `GET /api/health`

## Demo credentials (after seeding)

| Role    | Login                                  | Password / OTP |
|---------|----------------------------------------|----------------|
| Owner   | username `shreeganesh_pg_4821`         | `demo1234`     |
| Manager | `manager@shreeganeshpg.in`             | `demo1234`     |
| Tenant  | mobile `9876500011` (Amit Kumar)       | OTP `1234`     |

> All passwords are hashed with bcrypt. The tenant OTP is simulated (returned in
> development responses, never stored). Nothing is stored in plain text.

## Environment variables

| Variable      | Default                              | Description                          |
|---------------|--------------------------------------|--------------------------------------|
| `PORT`        | `5000`                               | HTTP port                            |
| `MONGO_URI`   | `mongodb://127.0.0.1:27017/aapka_pg` | MongoDB connection string            |
| `JWT_SECRET`  | dev-only fallback                    | JWT signing secret (set in prod!)    |
| `JWT_EXPIRES_IN` | `7d`                              | Token lifetime                       |
| `CORS_ORIGIN` | `http://localhost:5173`              | Comma-separated allowed origins      |
| `DEMO_OTP`    | `1234`                               | Simulated tenant OTP                 |

## API overview

All routes are prefixed with `/api`. Auth uses a `Authorization: Bearer <token>` header.

| Area | Routes |
|------|--------|
| Auth | `POST /auth/owner/register`, `/complete-payment`, `/activate`, `/login`, `/reset-password`, `POST /auth/tenant/register`, `/otp`, `/login`, `POST /auth/manager/login`, `GET /auth/me` |
| Public | `GET /public/pgs`, `GET /public/pg/:username` |
| Dashboard | `GET /dashboard/summary` |
| Rooms & beds | `GET/POST /rooms`, `PATCH/DELETE /rooms/:id`, `GET /beds`, `PATCH /beds/:id`, `GET /vacancy` |
| Tenants | `GET/POST /tenants`, `GET/PATCH/DELETE /tenants/:id`, `POST /tenants/:id/notice`, `/move-out`, `/reallocate` |
| Admissions | `GET/POST /admissions`, `GET /admissions/me`, `PATCH /admissions/:id/approve`, `/reject` |
| Payments | `GET /payments`, `POST /payments/:id/pay`, `POST /payments/remind`, `GET /payments/outstanding` |
| Meter | `GET/POST /meter`, `POST /meter/publish` |
| Complaints | `GET/POST /complaints`, `PATCH /complaints/:id/status` |
| Food | `GET/POST /food/menu`, `GET /food/ratings`, `GET/POST /food/optout`, `DELETE /food/optout/:id`, `POST /food/rate` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `GET/PUT /notifications/prefs`, `POST /notifications/run`, `GET /notifications/log` |
| Settings | `GET/PATCH /settings`, `GET/PUT /reminder-schedule` |
| Subscription | `GET /subscription`, `POST /subscription/checkout`, `/upgrade`, `/cycle`, `/renew`, `/retry`, `/auto-renew` |

Full design details live in [docs/LLD.md](./docs/LLD.md).

## Project structure

```
server/src
├── app.js               # Express app
├── server.js            # entry: connect DB + listen
├── config/              # env + db
├── constants/           # enums + plan catalogue
├── middlewares/         # auth, role guard, pg context, validate, error
├── models/              # Mongoose schemas
├── controllers/         # route handlers
├── routes/index.js      # API surface
├── services/            # billing, notifications, delivery, payment, subscription
├── validators/          # Zod schemas
├── seed/                # demo data + seed script
└── utils/               # logger, ids, ApiError, asyncHandler
```
