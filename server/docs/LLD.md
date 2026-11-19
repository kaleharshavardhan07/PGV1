# Aapka PG — Low-Level Design (LLD)

> Backend design for **Aapka PG**: Node.js + Express REST API on **PostgreSQL (Neon)**.
> Implementation reference for the `server/` directory.
> Note: an earlier brief asked for MongoDB; the project owner later chose **Neon (PostgreSQL) with a relational schema**, which this design follows.

## 1. Scope

Four roles: **platform admin**, **PG owner**, **manager**, **tenant**.

- Owners register directly, manage rooms/beds (single or bulk), create tenant accounts and managers, post expenses,
  issue invoices, manage the food menu and documents, export data, and receive Find PG enquiries.
- Managers do only what the owner grants. Tenants see their own stay, invoices, shared expenses, food menu, documents.
- The platform admin allows or blocks modules per PG and can suspend a PG.
- Anyone can search **Find PG** by location and filters and contact owners.
- **No online payment.** Invoices and expenses are records; staff mark invoices paid manually.

## 2. Architecture

```
React SPA ──HTTPS/JSON──▶ Express ──▶ routes → guards/middlewares → controllers → repositories ──pg──▶ Neon Postgres
                                                              └▶ services (access, mail, export, notification engine)
```

| Layer | Folder | Responsibility |
|---|---|---|
| Routes | `routes/` | URL ↔ controller mapping and the guard chain per route |
| Middlewares | `middlewares/` | JWT auth, `access.js` (feature + permission guards), rate limiting, validation, uploads, errors |
| Controllers | `controllers/` | HTTP in/out, business rules, audit records |
| Repositories | `repositories/` | All SQL (parameterised); rows returned camelCased |
| Services | `services/` | `access` (features/permissions), `mailService` (Proton SMTP), `exportService`, notification engine |
| DB | `db/` | `schema.sql` (idempotent, upgrades existing DBs), pool, `query/one/transaction` |

## 3. Data model

All domain tables carry `pg_id → pg_accounts(id) ON DELETE CASCADE`, the PG boundary on every query.

```
pg_accounts 1─1 workspace_settings      pg_accounts 1─N managers        platform_admins
pg_accounts 1─N rooms 1─N beds 0..1─1 tenants (tenants.bed_id UNIQUE)
tenants 1─N documents | complaints | meal_opt_outs | food_ratings | invoices | notification_prefs
expenses 1─N documents        invoices 1─N documents
pg_accounts 1─N food_menu_items | expenses | invoices | enquiries | notifications | notification_logs | audit_logs
```

Decisions:

- **Occupancy is derived.** A bed is `occupied`/`notice` iff a tenant references it; `unavailable` is a flag on the bed
  (blocked while occupied). Partial unique indexes make double-booking impossible. A room's capacity is `count(beds)`.
- **Tenant = account** (mobile + bcrypt hash). Unique live mobile (`WHERE status <> 'Left'`). Moving out frees the bed,
  disables login, keeps the record.
- **Features**: `pg_accounts.features_allowed` (admin) and `features_enabled` (owner), both jsonb; usable = both true;
  missing keys default to true. Modules: rooms, food, expenses, documents, billing, complaints, exports.
- **Manager permissions**: `managers.permissions` jsonb (tenants, rooms, food, expenses, billing, documents, complaints, exports).
- **Documents** (`bytea`, ≤ 5 MB) attach to a tenant, an expense, an invoice, or the PG (`tenant_id/expense_id/invoice_id` nullable).
- **Invoices**: `Draft → Issued → Paid`, or `Cancelled`; "Overdue" is *derived* (`Issued` and past due). Numbering `INV-YYYY-0001`
  is sequential per PG, serialised by an advisory lock.
- **Location**: `area`, `city`, `state`, `pin_code`, `latitude`, `longitude` on `pg_accounts`, reused by Find PG (haversine in SQL).
- Integrity via `CHECK` constraints (enums, non-negative amounts, coordinate ranges, `YYYY-MM` periods).

## 4. Authentication & authorisation

JWT `{ sub, role }` (`owner|manager|tenant|admin`). The PG, features and permissions are **always loaded from the database
per request**, never trusted from the token, so changes apply immediately: a deactivated manager, a moved-out tenant or a
suspended PG is rejected on the next call. Document links use a separate 2-minute token (`purpose: 'document'`, one document)
that is rejected as a session token and vice versa. Login endpoints are rate limited.

Guards (`middlewares/access.js`), applied per route in `routes/index.js`:

| Guard | Passes |
|---|---|
| `staffGuard(permission, feature)` | owner, or manager holding `permission`, with `feature` enabled |
| `ownerGuard(feature)` | owner only |
| `memberGuard(permission, feature)` | owner, manager (needs permission), tenant (own data only), with feature enabled |
| `adminGuard` | platform admin |

A disabled feature returns **403 on every route of that module**, including exports and document attachments.
Reads of `/rooms` and `/beds` stay open to members because tenant allocation needs them; room *changes*, bulk creation and the
floor-plan actions require the `rooms` feature (and permission for managers).

| Capability | owner | manager | tenant |
|---|---|---|---|
| Rooms/beds create/edit/delete, bulk create, mark unavailable | ✅ | with `rooms` | read |
| Tenant accounts (create, edit, reset password, notice, move-out, reallocate) | ✅ | with `tenants` | — |
| Delete tenant, manage managers, settings, enquiries | ✅ | — | — |
| Expenses post/edit/delete | ✅ | with `expenses` | view shared; upload proof if requested |
| Invoices create/issue/mark paid/cancel | ✅ | with `billing` | view own (non-draft); upload receipt |
| Food menu add/edit/remove | ✅ | with `food` | view; opt-out, rate |
| Documents | all | with `documents` (tenant docs) | own only |
| Exports | ✅ | with `exports` (+ module permission per dataset) | — |
| Feature switches | enable within what admin allows | — | — |
| Allow/block modules, suspend PG | — | — | — (admin only) |

## 5. API (prefix `/api`)

**Auth** `POST /auth/{owner/register,owner/login,manager/login,tenant/login,admin/login}`, `GET /auth/me`, `POST /auth/change-password`, `GET /me/context` (role, features, permissions).
**Admin** `GET /admin/overview`, `GET /admin/pgs`, `PATCH /admin/pgs/:id` (`featuresAllowed`, `isActive`, `isDiscoverable`).
**Rooms/beds** `GET|POST /rooms`, `POST /rooms/bulk`, `GET|PATCH|DELETE /rooms/:id`, `POST /rooms/:id/beds`, `PATCH|DELETE /beds/:id`.
**Managers** `GET|POST /managers`, `PATCH|DELETE /managers/:id`, `POST /managers/:id/reset-password`.
**Tenants** `GET|POST /tenants`, `GET|PATCH|DELETE /tenants/:id`, `/reset-password`, `/notice`, `/move-out`, `/reallocate`.
**Documents** `GET|POST /documents`, `POST /documents/:id/link`, `GET /documents/:id/file`, `DELETE /documents/:id`
(upload: `file`, `type`, `title` + one of `tenantId | expenseId | invoiceId`; PDF/JPEG/PNG/WebP ≤ 5 MB, content signature verified).
**Expenses** `GET|POST /expenses`, `GET|PATCH|DELETE /expenses/:id`. **Invoices** `GET|POST /invoices`, `GET|PATCH|DELETE /invoices/:id`, `POST /invoices/:id/{issue,mark-paid,reopen,cancel}`.
**Food** `GET|POST /food/menu`, `DELETE /food/menu/:id`, `/food/{ratings,optouts,optout,rate}`. **Complaints**, **Notifications**, **Settings** (`PATCH /settings` incl. `location`, `featuresEnabled`, visibility).
**Enquiries** `GET /enquiries`, `PATCH /enquiries/:id`. **Export** `GET /export/{tenants,rooms,occupancy,expenses,invoices}?format=csv|xlsx`.
**Public** `GET /public/pgs` (q, city, area, pgType, sharing, minPrice, maxPrice, available, lat, lng, radiusKm, sort, limit, offset),
`GET /public/locations`, `GET /public/pg/:username`, `POST /public/pg/:username/enquiries` (rate limited).

## 6. Email (Proton)

`services/mailService.js` uses nodemailer over SMTP. Proton exposes no HTTP API; it offers **SMTP submission with per-app tokens on
paid plans with a custom domain** (`smtp.protonmail.ch:587`, STARTTLS, address as username, token as password). All settings are
environment variables (`SMTP_*`, `MAIL_FROM`); with none set, mail is skipped and logged, never an error. Sent: owner welcome,
new Find PG enquiry, and a confirmation when a manager/tenant account is created. Passwords are never emailed; user-supplied text is HTML-escaped.

## 7. Exports

`exportService` builds CSV (UTF-8 BOM, formula-injection neutralised) and real `.xlsx` (exceljs). Datasets are always scoped to the
caller's PG; `expenses` and `invoices` also require their module to be on and the matching manager permission.

## 8. Errors & security

Zod → 400 with `details`; Postgres violations → friendly 409/400; unknown → 500. bcrypt passwords, login errors do not reveal which field
was wrong, helmet (CSP allows OpenStreetMap tiles and Nominatim only), parameterised SQL, per-query PG scoping, upload type + signature +
size checks, in-memory rate limiting (single instance; use a shared store if scaled out), `JWT_SECRET` required in production.

## 9. Deployment

Set `DATABASE_URL`, `JWT_SECRET`; optionally `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `PUBLIC_APP_URL`, `SMTP_*`. The schema applies on start and
upgrades existing databases in place (`npm run migrate` does it without starting). `npm run seed` / `seed:reset` load demo data.
