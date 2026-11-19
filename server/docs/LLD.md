# Aapka PG — Low-Level Design (LLD)

> Backend design for **Aapka PG**: Node.js + Express REST API on **PostgreSQL (Neon)**.
> Implementation reference for the `server/` directory.

## 1. Scope

A PG owner registers a PG, manages **rooms and beds**, creates **tenant accounts**
directly (no tenant self-registration, no OTP), and stores tenant **documents**.
Tenants sign in with mobile + password to see their stay, documents, electricity
share, complaints and food menu. There is **no payment functionality** (no rent
ledger, gateway, subscriptions or checkout).

## 2. Architecture

```
React SPA ──HTTPS/JSON──▶ Express ──▶ routes → middlewares → controllers → repositories ──pg──▶ Neon Postgres
                                                              └▶ services (notification engine, delivery, tokens)
```

| Layer | Folder | Responsibility |
|---|---|---|
| Routes | `routes/` | URL ↔ controller mapping + guards (`staff`, `owner`, `anyRole`, `tenantOnly`) |
| Middlewares | `middlewares/` | JWT auth, role guard, PG scoping, Zod validation, uploads, error mapping |
| Controllers | `controllers/` | HTTP in/out, authorisation decisions, audit records |
| Repositories | `repositories/` | All SQL. Parameterised queries only; rows returned camelCased |
| Services | `services/` | Notification engine, simulated delivery, token signing, username rules |
| DB | `db/` | `schema.sql` (idempotent DDL), pool, `query/one/transaction` helpers, migrate-on-start |

## 3. Data model (PostgreSQL)

All domain tables carry `pg_id → pg_accounts(id) ON DELETE CASCADE`: the PG owner is the
multi-tenancy boundary and every query is scoped by it.

```
pg_accounts 1─1 workspace_settings
pg_accounts 1─N managers
pg_accounts 1─N rooms 1─N beds 0..1─1 tenants        (tenants.bed_id → beds.id, UNIQUE)
pg_accounts 1─N tenants 1─N documents                 (bytea, ≤ 5 MB)
tenants 1─N complaints | meal_opt_outs | food_ratings | notification_prefs
rooms 1─N meter_readings
pg_accounts 1─N food_menu_items | notifications | notification_logs | audit_logs
```

Key design decisions:

- **Occupancy is derived, not stored.** A bed is `occupied` iff a tenant references it via
  `tenants.bed_id` (`notice` when that tenant is on notice). A partial unique index on
  `tenants(bed_id)` makes double-booking impossible; a room's bed count is `count(beds)`.
- **Tenant = account.** `tenants` holds both the record and the credentials
  (`password_hash`, bcrypt). A partial unique index on `tenants(mobile) WHERE status <> 'Left'`
  guarantees one live login per mobile number, so login by mobile alone is unambiguous.
- **Moving out** sets `status = 'Left'`, clears `bed_id` (bed becomes vacant) and disables login;
  the record, documents and complaint history are kept.
- **Deletes**: rooms/beds cannot be deleted while occupied (409). Deleting a room cascades to
  its beds and meter readings. Deleting a tenant cascades to their documents/complaints.
- **Documents** are stored in a `bytea` column so they survive ephemeral-disk hosts. `data` is
  never selected by list queries.
- Integrity is enforced with `CHECK` constraints (enums, non-negative amounts, rating 1–5).

## 4. Authentication & authorisation

JWT (HS256) `{ sub, role }` — `owner` (sub = `pg_accounts.id`), `manager`, `tenant`
(sub = `tenants.id`). The PG is **always resolved from the database**, never trusted from the
token. A deactivated tenant (`Left`) is rejected on the next request, so moving out revokes
access immediately.

| Role | Login |
|---|---|
| Owner | PG username or email + password (`POST /auth/owner/login`); self-registers via `POST /auth/owner/register` (single step) |
| Manager | email + password |
| Tenant | **mobile + password** — account created by the owner/manager; no OTP, no self-registration |

Role matrix:

| Resource | owner | manager | tenant |
|---|---|---|---|
| Rooms / beds create, edit, delete | ✅ | read | read (own PG) |
| Tenants: create account, edit, reset password, notice, move-out, reallocate | ✅ | ✅ | — |
| Tenants: delete | ✅ | — | — |
| Documents: list / upload / view | all in PG | all in PG | own only |
| Documents: delete | ✅ | ✅ | only what they uploaded |
| Meter readings: record / publish | ✅ | ✅ | view own room, published only |
| Complaints | update status | update status | create / view own |
| Settings | ✅ | read | read |

## 5. API (prefix `/api`, `Authorization: Bearer <token>`)

**Auth** — `POST /auth/owner/register`, `POST /auth/owner/login`, `GET /auth/owner/username-available`,
`POST /auth/manager/login`, `POST /auth/tenant/login`, `GET /auth/me`, `POST /auth/change-password`, `GET /me/context`.

**Rooms & beds** — `GET|POST /rooms`, `GET|PATCH|DELETE /rooms/:id`, `POST /rooms/:roomId/beds`,
`GET /beds`, `PATCH|DELETE /beds/:id`, `GET /vacancy`.
`POST /rooms` accepts `bedCount` (+ optional `bedRent`) to create the room with its beds in one transaction.

**Tenants** — `GET|POST /tenants`, `GET|PATCH|DELETE /tenants/:id`, `POST /tenants/:id/reset-password`,
`/notice`, `/move-out`, `/reallocate {bedId}`. `POST /tenants` returns `credentials` (mobile + temporary
password) **once**; the password is generated if not supplied.

**Documents** — `GET /documents[?tenant=]`, `POST /documents` (multipart: `file`, `type`, `title`, `tenantId` for staff),
`POST /documents/:id/link`, `GET /documents/:id/file`, `DELETE /documents/:id`.
Upload rules: PDF/JPEG/PNG/WebP, ≤ 5 MB, and the file's leading bytes must match its declared type.
Because browsers cannot send an `Authorization` header from `<img>`/`window.open`, the client requests a
**2-minute link token scoped to one document**; `/file` accepts either a bearer session or that token.
Link tokens are rejected as session tokens and vice versa.

**Operations** — `/meter` (+`/publish`), `/complaints`, `/food/*`, `/notifications*`, `/settings`, `/reminder-schedule`,
`/dashboard/summary`. **Public** — `/public/pgs`, `/public/pg/:username[/vacancy]`.

## 6. Notification engine

`services/notificationEngine.js` runs after relevant actions and on demand. Idempotent via
`UNIQUE (pg_id, dedupe_key)` + `ON CONFLICT DO NOTHING`. Triggers: complaints open longer than the
configured hours (→ managers), newly added tenants (→ managers), published electricity readings (→ the
room's tenants). Delivery (`deliveryService.js`): in-app is real; WhatsApp/SMS/Email are simulated with
retry policy and per-tenant opt-outs. The engine never fails the request that triggered it.

## 7. Errors

Zod → `400` with `details`; Postgres violations → friendly `409`/`400` (e.g. "This bed is already
occupied"); `ApiError` → its status; unknown → `500`. Envelope: `{ success:false, message, details? }`.

## 8. Security

bcrypt (cost 10) passwords, never returned or logged; login errors do not reveal which field was wrong;
helmet; Zod validation on every mutating route; parameterised SQL everywhere; PG scoping on every query;
upload type + signature validation and size cap; `JWT_SECRET` required in production (server refuses to start otherwise).

## 9. Deployment

Set `DATABASE_URL` (Neon pooled string, `sslmode=require`) and `JWT_SECRET`. The schema is applied
automatically on start (`CREATE … IF NOT EXISTS`); `npm run migrate` applies it without starting the server.
`npm run seed` / `seed:reset` load the demo data.
