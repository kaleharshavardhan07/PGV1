# Aapka PG — Low-Level Design (LLD)

> Design of the **Aapka PG** backend: Node.js + Express + MongoDB REST API.
> This document describes the architecture, data model, API contract, and key
> flows. It is the implementation reference for the `server/` directory.

---

## 1. Architecture overview

```
                    ┌────────────────────────────┐
                    │   React SPA (Vite frontend)│
                    └─────────────┬──────────────┘
                                  │ HTTPS / JSON (REST)
                    ┌─────────────▼──────────────┐
                    │      Express API server    │
                    │  middlewares → routes →    │
                    │  controllers → services    │
                    └─────────────┬──────────────┘
                                  │ Mongoose ODM
                    ┌─────────────▼──────────────┐
                    │          MongoDB           │
                    └────────────────────────────┘
```

Layered structure (each layer only talks downward):

1. **Routes** — define URL ↔ controller mapping + middleware guards.
2. **Middlewares** — authentication, role guard, PG context, validation, errors.
3. **Controllers** — extract input, call services/models, shape responses.
4. **Services** — business logic (billing, notification engine, delivery,
   payment verification, subscription policy).
5. **Models** — Mongoose schemas (the persistence contract).
6. **Config / Utils** — environment, DB connection, logging, ids.

---

## 2. Data model

Three logical groups of collections:

### 2.1 Identity & authentication

| Collection | Purpose | Key fields |
|---|---|---|
| `PgAccount` | Owner identity **and** PG profile (one owner = one PG in this prototype) | `pgUsername` (unique, public), `ownerEmail` (unique), `ownerMobile` (unique), `passwordHash`, `isActive`, `isDiscoverable`, `showAvailableBeds`, `subscriptionPlanId` |
| `TenantUser` | Platform-wide tenant identity | `mobile` (unique), `fullName`, `email`, `passwordHash` (optional — OTP login supported) |
| `Manager` | Per-PG staff identity | `pg` → PgAccount, `email` (unique), `passwordHash` |

### 2.2 Per-PG domain data

All rows are scoped to a PG via the `pg` reference (an `ObjectId` pointing at
`PgAccount`). This is the multi-tenancy boundary.

| Collection | Purpose | Key fields |
|---|---|---|
| `Workspace` | Singleton per-PG config: **settings**, **reminderSchedule**, **subscription** (embedded sub-documents, `_id: false`) | `pg` (unique) |
| `Room` | A physical room | `roomNumber` (unique per PG), `floor`, `totalBeds`, `sharingType`, `attachedBathroom` |
| `Bed` | A bed inside a room | `room`, `bedNumber` (unique per room), `status`, `tenant` |
| `Tenant` | Per-PG tenant record | `fullName`, `mobile`, `room`, `bedNumber`, `monthlyRent`, `securityDeposit`, `joiningDate`, `status` (Active / Notice Period / Left), `policeVerification`, `user` → TenantUser |
| `MeterReading` | Monthly electricity reading per room | `room`, `month` (unique per room), `previousReading`, `currentReading`, `units`, `ratePerUnit`, `totalAmount`, `perTenantAmount`, `published` |
| `Payment` | Tenant ledger entry | `tenant`, `type` (Rent / Electricity / Deposit), `month`, `amount`, `status` (Paid / Pending / Overdue), `dueDate`, `method` |
| `Complaint` | Tenant complaint | `tenant`, `category`, `description`, `status` (Submitted → Seen → In Progress → Resolved), `roomNumber`, `remarks` |
| `FoodMenuItem` | Weekly menu entry | `day`, `mealType` (unique per PG+day+meal), `items[]`, `timing` |
| `MealOptOut` | Tenant meal opt-out | `tenant`, `date`, `mealType` (unique per tenant+date+meal) |
| `FoodRating` | Tenant meal rating | `tenant`, `date`, `mealType`, `rating` (1–5), `review` |
| `Notification` | In-app notification | `userId`, `userRole`, `title`, `message`, `type`, `read`, `link`, `category`, `dedupeKey` (idempotency) |
| `NotificationLog` | Delivery history per channel | `dedupeKey`, `recipient`, `recipientRole`, `channel`, `status`, `attempts`, `note` |
| `NotificationPref` | Per-tenant channel opt-outs | `tenant`, `whatsapp`, `sms`, `email` |

### 2.3 Platform registry (multi-PG SaaS)

| Collection | Purpose | Key fields |
|---|---|---|
| `AdmissionRequest` | Tenant → PG admission application | `requestId` (unique, `AR-YYYY-NNNN`), `pg`, `tenantUser`, `status` (Pending / Approved / Rejected), allocation preferences, documents |
| `Membership` | Tenant-to-PG membership (historical, never hard-deleted) | `pg`, `tenantUser`, `tenant`, `room`, `bed`, `status` (Active / Ended / Deactivated), `joiningDate`, `leavingDate`, rent/deposit snapshot |
| `PendingRegistration` | Resumable owner onboarding state | `owner`, `pg` (sub-document of PG details), `planId`, `cycle`, `amount`, `status`, `pgId` (set after payment), `suggestedUsernames`, `processedCallbacks` |
| `AuditLog` | Append-only action trail | `actor`, `action`, `entity`, `entityId`, `details`, `ts` |

---

## 3. Entity relationships

```
PgAccount 1 ──── 1 Workspace
PgAccount 1 ──── N Room ──── N Bed
PgAccount 1 ──── N Tenant
PgAccount 1 ──── N MeterReading, Payment, Complaint, FoodMenuItem, Notification…
PgAccount 1 ──── N Manager

TenantUser 1 ──── N Membership ──── 1 Tenant
TenantUser 1 ──── N AdmissionRequest ──── 1 PgAccount

Tenant 1 ──── N Payment
Tenant 1 ──── N Complaint
Tenant 1 ──── N MealOptOut / FoodRating
Room  1 ──── N Bed
Room  1 ──── N MeterReading
Bed   0..1 ──── Tenant (occupancy link)
```

Key invariants:

- A `Bed` is either `vacant` or references exactly one `Tenant`.
- An active `Membership` links one `TenantUser` to one `Tenant` in one PG.
- `Payment.tenant` always points at a `Tenant` record (per-PG ledger), never a
  platform `TenantUser`.
- Every notification draft carries a `dedupeKey`; the key is unique across
  `Notification` + `NotificationLog`, making the engine idempotent.

---

## 4. Authentication & authorization

### 4.1 Token

JWT (HS256) with payload `{ sub: <id>, role: 'owner'|'manager'|'tenant', pgId? }`.
`pgId` is resolved at login:

- **owner** → `sub` = `PgAccount._id`, `pgId` = same.
- **manager** → `sub` = `Manager._id`, `pgId` = `Manager.pg`.
- **tenant** → `sub` = `TenantUser._id`, `pgId` = active membership's PG (if any).

Passwords are hashed with **bcrypt** (cost 10). Tenant OTP is simulated: the
server accepts the configured `DEMO_OTP` and returns it only in development.

### 4.2 Owner onboarding (3-step state machine)

```
Awaiting Payment ──(payment verified)──▶ Payment Verified
        │                                        │
        │(callback rejected)                     │ (username + password set)
        ▼                                        ▼
 Payment Failed                           Username Confirmed → Active
```

1. `POST /auth/owner/register` — create `PendingRegistration`, simulate a
   payment order, generate username suggestions.
2. `POST /auth/owner/complete-payment` — simulate the gateway callback, **verify
   signature + idempotency**, then create `PgAccount` + `Workspace`.
3. `POST /auth/owner/activate` — validate username uniqueness, hash password,
   set `isActive`, issue JWT.

### 4.3 Role-based access matrix

| Resource | owner | manager | tenant |
|---|---|---|---|
| Rooms/beds (create/update/delete) | ✅ | ❌ (read + bed status ✅) | ❌ |
| Tenants (CRUD) | ✅ | create/update/list ✅, delete ❌ | ❌ |
| Admissions approve/reject | ✅ | ✅ | ❌ |
| Payments pay/remind | ✅ | ✅ | own pay ✅ |
| Meter readings / publish | ✅ | ✅ | ❌ |
| Complaints | update status ✅ | ✅ | create own ✅ |
| Settings / reminder schedule | ✅ | ❌ | ❌ |
| Subscription | ✅ | ❌ | ❌ |
| Notifications | ✅ | ✅ | own ✅ |
| Food menu | ✅ | ✅ | read ✅, opt-out/rate own ✅ |

---

## 5. API surface

Prefix: `/api`. Auth header: `Authorization: Bearer <token>`.

### Auth
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/auth/owner/register` | public | Start onboarding (creates pending registration + simulated order) |
| POST | `/auth/owner/complete-payment` | public | Verify gateway callback, create PG + workspace |
| POST | `/auth/owner/activate` | public | Confirm username + password, activate, issue token |
| POST | `/auth/owner/login` | public | Owner login (username or email + password) |
| POST | `/auth/owner/reset-password` | public | Demo reset (OTP + new password) |
| POST | `/auth/tenant/register` | public | Create tenant platform account |
| POST | `/auth/tenant/otp` | public | Send (simulated) OTP |
| POST | `/auth/tenant/login` | public | Tenant login (mobile + OTP or password) |
| POST | `/auth/manager/login` | public | Manager login |
| GET | `/auth/me` | any | Current principal |

### Domain (all require auth + PG context)
See the route table in `server/README.md` for the complete list.

---

## 6. Notification automation engine

`services/notificationEngine.js` — a port of the frontend engine, run **after
every data-changing action** and on demand (`POST /notifications/run`). It is
idempotent via `dedupeKey`s.

Triggers:

- **Rent** — upcoming (`rentDaysBefore`), due today, overdue buckets
  (`rentOverdueDays` e.g. 1/3/7) with manager escalation at day 3 and owner
  escalation at day 7.
- **Electricity** — bill published, due soon, overdue with escalation.
- **Complaints** — unresolved after `complaintUnresolvedHours`.
- **Tenant / Bed events** — new tenant joined, newly vacant bed.
- **Owner summary** — monthly collection summary after day 3.
- **Subscription** — trial ending (3/1 days), renewal reminders (7/3/1 days),
  past-due and suspension notices.

Side effects performed by the engine:

- Marks `Pending` payments past their due date as `Overdue`.
- Advances subscription lifecycle (trial → expired, active → payment pending
  → past due → suspended) per the reminder schedule.

Delivery (`services/deliveryService.js`): in-app is real; WhatsApp/SMS/Email are
simulated with a deterministic ~85% success rate, per-channel retry policy, and
tenant opt-out + plan-gating checks. A `NotificationLog` row records each
channel attempt.

---

## 7. Payment gateway simulation

`services/paymentGateway.js` mirrors a real gateway flow:

1. `createOrder(amount, method)` → `{ orderId, status: 'created' }`.
2. `simulateGatewayCallback(order, outcome)` → signed callback
   (`signature = HMAC-style digest of orderId|paymentId|status`).
3. `verifyCallback(cb, processedIds)` → recomputes the signature and rejects
   **invalid signatures** and **duplicate (replayed) callbacks** before any
   state is activated.

The frontend never activates an account; only a verified server-side callback
does. The same contract is used for SaaS subscription payments and owner
onboarding.

---

## 8. Subscription lifecycle

SaaS subscription is stored in the `Workspace.subscription` sub-document and is
kept fully separate from tenant payment ledgers.

```
Trial ──▶ Active ──▶ Payment Pending ──▶ Past Due ──▶ Suspended
                │                          ▲            │
                └──(renew/auto-renew)──────┘            └──▶ Expired (records preserved)
```

- `FULL_ACCESS_STATUSES = Trial | Active | Cancelled` grant plan features.
- Plan feature matrix lives in `constants/plans.js` and gates WhatsApp/automation.
- `PendingRegistration` → `Subscription` amount is derived from `PLANS` by plan + cycle.

---

## 9. Error handling

Central `middlewares/error.js` normalizes:

- Zod `ZodError` → `400` with field-level `details`.
- Mongoose `ValidationError` / `CastError` → `400`.
- Duplicate key `11000` → `409` with the offending field.
- `ApiError` → its status + message.
- Unknown errors → `500` (stack only in development).

Response envelope:

```json
{ "success": false, "message": "...", "details": [ { "path": "…", "message": "…" } ] }
```

---

## 10. Security considerations

- bcrypt password hashing; passwords never stored in plain text.
- JWT with configurable secret + expiry; secret must be set in production.
- Role + PG scoping on every domain route (multi-tenant isolation).
- Zod validation on all mutating endpoints.
- Helmet security headers, CORS allow-list.
- Payment callbacks verified (signature + idempotency) server-side.
- Audit log for sensitive actions.

**Production TODO (out of scope for this prototype):**

- Real SMS/WhatsApp/email providers and real OTP expiry/rate-limiting.
- Real payment gateway webhook signing (Razorpay/Stripe HMAC).
- Refresh tokens / token revocation list.
- Rate limiting and request throttling.
- Replace demo password reset with emailed OTP.

---

## 11. Deployment

1. Set `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN` in the environment.
2. `npm run seed` to initialize demo data (optional).
3. `npm start` (or a process manager such as PM2 / a container).
4. Frontend → `VITE_API_URL` pointing at this API (see the frontend README).

---

## 12. Seed data

`seed/seed.js` creates a realistic demo dataset:

- 2 PG accounts (Shree Ganesh PG — Growth, Royal Stay — Starter).
- 10 rooms / 32 beds, 9 tenants with memberships.
- Rent + electricity + deposit ledger with the full payment lifecycle.
- 5 complaints across statuses, a 21-item weekly menu, ratings and opt-outs.
- Seed notifications + delivery log, pending/rejected admission requests.
- One owner, one manager, 9 tenant users (password `demo1234`, OTP `1234`).
