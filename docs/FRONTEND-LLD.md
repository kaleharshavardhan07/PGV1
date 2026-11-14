# Aapka PG — Frontend Integration LLD

> How the existing React UI is wired to the Aapka PG REST API
> (Node.js + Express + MongoDB). Companion to [../server/docs/LLD.md](../server/docs/LLD.md).

---

## 1. Goal & constraints

The React app was a self-contained prototype whose state lived in `localStorage`
(`src/store/appStore.ts`, ~2,000 lines). The goal was to make it a **real
client of the backend** without rewriting 24 pages.

Guiding constraints:

1. **Preserve the UI.** All existing pages, components and styling stay.
2. **One source of truth.** No duplicate state between browser and server.
3. **Single adaptation seam.** Server DTOs are translated in one place so pages
   keep reading the domain model they already know (`roomId`, `tenantId`, …).
4. **Real auth.** JWT sessions, role-based routing, no demo role switching.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Pages / components (24 pages, 8 components) — unchanged UI   │
└───────────────────────────┬──────────────────────────────────┘
                            │ useAppStore()
┌───────────────────────────▼──────────────────────────────────┐
│ src/store/apiStore.ts                                        │
│  • single external store (useSyncExternalStore)              │
│  • loads role-scoped data, exposes mutations                 │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
┌───────────────▼──────────────┐  ┌────────────▼──────────────┐
│ src/api/adapters.ts          │  │ src/api/endpoints.ts      │
│ DTO → domain mapping         │  │ typed endpoint functions  │
└──────────────────────────────┘  └────────────┬──────────────┘
                                  ┌────────────▼──────────────┐
                                  │ src/api/client.ts         │
                                  │ fetch + JWT + ApiError    │
                                  └────────────┬──────────────┘
                                               │ HTTPS/JSON
                                  ┌────────────▼──────────────┐
                                  │ Express API (/api/*)      │
                                  └───────────────────────────┘
```

### Why an external store instead of Context

`useAppStore()` is called by ~27 components. A React Context would re-render the
whole subtree on every change; a module-level store with
`useSyncExternalStore` gives:

- **one** fetch per session (not one per component),
- consistent snapshots across pages,
- stable action references (safe in `useEffect` deps),
- no provider nesting changes in `App.tsx`.

`src/store/appStore.ts` is now a 10-line re-export shim, so every existing
`import { useAppStore } from '../store/appStore'` keeps working.

---

## 3. Store shape

```ts
interface StoreState {
  data: AppDataState;          // role-scoped snapshot (domain model)
  session: Session | null;     // { token, role, pgId, user }
  loading: boolean;            // refresh in flight
  ready: boolean;              // first load finished (guards redirects)
  error: string | null;        // last load error
}
```

`AppDataState` intentionally mirrors the old store:

| Field | Source |
|---|---|
| `rooms`, `beds` | `GET /api/rooms`, `GET /api/beds` |
| `tenants` | `GET /api/tenants` (staff) · own record from `/api/me/context` (tenant) |
| `payments`, `complaints`, `meterReadings` | `GET /api/payments`, `/complaints`, `/meter` |
| `foodMenu`, `foodRatings`, `mealOptOuts` | `GET /api/food/*` |
| `notifications`, `notificationLog`, `notificationPrefs` | `GET /api/notifications*` |
| `settings`, `reminderSchedule`, `subscription` | `GET /api/settings` |
| `platform.{pgs,memberships,admissionRequests,tenantUsers,auditLogs}` | `GET /api/me/context` |
| `platform.pendingRegistrations` | owner onboarding (see §5) |
| `workspaces[pgId]` | public vacancy snapshot per discoverable PG (tenant admission search) |
| `activeRole`, `activePgId`, `activeTenantUserId`, `activeTenantId` | session + context |

---

## 4. Session & token lifecycle

```
login ─► POST /auth/... ─► { token, user } ─► sessionStore.save()
                                                   │
                                                   ▼
                                            refresh()  ─► role-scoped GETs
                                                   │
                                  ┌────────────────┴─────────────────┐
                                  ▼                                  ▼
                       200 OK → setState(data)             401 → clear session
```

- Token + role + pgId + user persisted in `localStorage['aapka-pg-session']`.
- `api/client.ts` attaches `Authorization: Bearer <token>` to every call.
- A `401` anywhere during refresh clears the session (no redirect loops); a
  malformed session (missing `role`) is also discarded defensively.
- `logout()` clears the session and resets the store to empty state.

---

## 5. Authentication & onboarding flows

### 5.1 Owner sign-up (7 steps, `CheckoutPage`)

```
Plan → Register → Billing → Payment → Username → Password → Done
  │        │          │         │          │          │        │
  │        │          │         │          │          │        └─ handleFinish → /app/owner
  │        │          │         │          │          └─ POST /auth/owner/activate → JWT
  │        │          │         │          └─ GET  /auth/owner/username-available
  │        │          │         └─ POST /auth/owner/complete-payment (signature + replay check)
  │        │          └─ (cycle selection)
  │        └─ POST /auth/owner/register → PendingRegistration + suggested usernames
  └─ plan catalogue (constants/plans on the server)
```

Resumability: the registration id is kept in
`localStorage['aapka-pg-pending-registration']` and re-hydrated from
`GET /auth/owner/registration/:id` on the next load, so a refresh mid-flow
restores the wizard.

### 5.2 Owner login / reset

- `POST /auth/owner/login` with **PG username or owner email** + password.
- `POST /auth/owner/reset-password` with the (simulated) reset code.
  The UI no longer looks up PGs client-side; existence is checked server-side.

### 5.3 Tenant login (mobile OTP)

```
mobile ─► POST /auth/tenant/otp     (simulated; returns demoOtp in dev)
       ─► POST /auth/tenant/login   { mobile, otp }
       ─► JWT (role=tenant, pgId = active membership's PG)
```

If the mobile has no account the server answers `401` and the UI switches to
the registration form (`POST /auth/tenant/register`), which logs the user in
immediately and routes to `/app/tenant/admission`.

### 5.4 Manager login

`POST /auth/manager/login` with email + password → JWT scoped to that PG.

---

## 6. Route guards & RBAC

`AppLayout` performs two checks, both gated on `ready`:

1. **Authentication** — no `activeRole` → `/app/login`;
   role mismatch → redirect to the user's own area.
2. **Membership** (tenant only) — without an `Active` membership, only
   `/app/tenant/admission` and `/app/notifications` are reachable.

The `ready` flag prevents a flash-redirect while the first refresh is in flight.

Server-side the same rules are enforced independently (see server LLD §4.3), so
the UI guard is a UX convenience, not the security boundary.

---

## 7. Data mapping (the adaptation seam)

`src/api/adapters.ts` converts server DTOs into the domain model:

| Server field | Domain field |
|---|---|
| `room` (ObjectId) | `roomId` |
| `tenant` (ObjectId) | `tenantId` |
| `_id` / `id` | `id` |
| `subscription.invoices[].number` | `invoice.id` (synthesised) |
| `memberships[].pgId` | same (already normalised by `/me/context`) |

Keeping this in one module means a change in the API surface touches exactly one
file, and pages never learn about Mongo ObjectIds.

---

## 8. Data loading per role

| Endpoint | owner | manager | tenant |
|---|---|---|---|
| `GET /me/context` | ✅ | ✅ | ✅ |
| `GET /rooms`, `/beds` | ✅ | ✅ | ✅ (read-only) |
| `GET /tenants` | ✅ | ✅ | ❌ (own record via context) |
| `GET /payments` | ✅ | ✅ | ✅ (own only) |
| `GET /complaints` | ✅ | ✅ | ✅ (own only) |
| `GET /meter` | ✅ | ✅ | ✅ (own room only) |
| `GET /food/menu`, `/food/ratings` | ✅ | ✅ | ✅ |
| `GET /food/optouts` | ❌ | ❌ | ✅ |
| `GET /notifications` | ✅ | ✅ | ✅ |
| `GET /notifications/log` | ✅ | ✅ | ❌ |
| `GET /settings` | ✅ | ✅ | ✅ |
| `GET /subscription` | ✅ | ❌ | ❌ |
| `GET /admissions` | ✅ | ✅ | own via `/admissions/me` |

All calls run in `Promise.allSettled`, so one unavailable endpoint degrades to an
empty list instead of blanking the app.

---

## 9. Mutation strategy

Every action follows a single pattern:

```ts
async function mutate<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try { const value = await fn(); await refresh(); return { ok: true, ...value }; }
  catch (err) { return { ok: false, error: errorMessage(err) }; }
}
```

- Server remains the source of truth → no optimistic-UI divergence.
- Actions that the UI consumes synchronously (`approveAdmissionRequest`,
  `moveOutTenant`, `submitAdmissionRequest`, the onboarding steps) are `async`
  and awaited at their call sites.
- Fire-and-forget actions (toasts, form resets) still work unchanged.

Actions returning values expose the legacy `{ ok, error }` result shape, so
existing error handling in pages keeps working.

---

## 10. Error handling & UX

- `ApiError` carries `status` and field-level `details`; the first detail message
  is shown inline in forms (matching server Zod validation).
- Network failure → "Cannot reach the server. Is the API running?".
- `401` → session cleared and the user lands back on login.
- Loading state is exposed (`loading`) for future skeletons; pages keep rendering
  their existing empty states until data arrives.

---

## 11. Configuration

| Variable | Where | Default |
|---|---|---|
| `VITE_API_URL` | frontend `.env` | `http://localhost:5000` |
| `CORS_ORIGIN` | server `.env` | `http://localhost:5173` |

---

## 12. Verification performed

| Check | Result |
|---|---|
| `tsc -b` | ✅ 0 errors |
| `oxlint` | ✅ 0 errors (13 pre-existing style warnings) |
| `npm run build` | ✅ builds |
| Owner login → dashboard | ✅ real data, 0 console errors |
| Owner: 7 pages navigated | ✅ 0 errors |
| Tenant OTP login → dashboard | ✅ 0 console/network errors |
| Tenant: 6 pages navigated | ✅ 0 errors |
| Tenant submits complaint | ✅ persisted, appears in list |
| Manager login → 5 pages | ✅ 0 errors |
| Owner admission list | ✅ pending request with resolved handle |
| Owner sign-up (7 steps) | ✅ PG + workspace created, auto-login |
| New owner re-login | ✅ sees only their own PG (isolation) |
| Public vacancy page | ✅ renders without auth |

---

## 13. Known limitations / next steps

- **Token refresh** — access tokens last 7 days; add refresh tokens + rotation.
- **Caching** — every mutation triggers a full role-scoped refresh. Fine for a
  demo; move to `@tanstack/react-query` (or server-side ETags) at scale.
- **Real-time** — no websockets; dashboards update on navigation/mutation.
- **File uploads** — document/photo fields are name-only strings; wire to object
  storage with presigned URLs.
- **Session hardening** — move the token to an httpOnly cookie once a same-origin
  deployment is in place.
- **Role switching** — the old demo switcher was removed; real users have one
  role per account (staff accounts can be added from Settings later).
