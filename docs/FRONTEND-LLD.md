# Aapka PG — Frontend LLD

Companion to [../server/docs/LLD.md](../server/docs/LLD.md). React 19 + TypeScript + Vite + Tailwind.

## Structure

```
src/
  api/          client.ts (fetch + JWT + FormData + ApiError) · endpoints.ts (typed routes, export download)
  store/        appStore.ts: one external store (useSyncExternalStore): session, features, permissions, role-scoped data, actions
  types/        domain types (the API already returns these shapes, no adapter layer)
  components/   AppLayout, Sidebar (feature/permission aware), FeatureGate, Modal, ConfirmDialog, DocumentPanel, AttachmentPanel,
                LocationPicker (Leaflet + OSM), StaticMap, ContactOwner, StatCard, Badge, Toast, skeleton loaders
  pages/        one file per screen; owner & manager share Dashboard / Rooms / Tenants / Documents / Expenses / Invoices / Food / Complaints / Exports
```

## Data flow

`login → sessionStore → refresh()` loads what the role may use (`Promise.allSettled`; modules that are off are skipped).
Every mutation is `await api → refresh()`: the server stays the source of truth. A `401` clears the session (this is also how a
moved-out tenant, deactivated manager or suspended PG is signed out).

## Access control in the UI

`/me/context` returns `features` and `permissions`. `Sidebar` hides what the user can't use and `FeatureGate` shows an explanation on
direct URLs. This is a courtesy: **the API enforces the same rules**. A user opening another role's page is redirected to their own home.

## Routes

| Area | Routes |
|---|---|
| Public | `/`, `/find-pg`, `/find-pg/:username`, `/app/login`, `/admin/login`, `/register` (`/vacancy` redirects) |
| Owner / Manager | `/app/{owner,manager}` · `rooms` · `tenants` · `documents` · `expenses` · `invoices` · `food` · `complaints` · `exports`; owner also `managers`, `enquiries`, `settings` |
| Tenant | `/app/tenant` · `invoices` · `expenses` · `documents` · `food` · `complaints` · `profile` |
| Admin | `/app/admin` |
| Shared | `/app/notifications` |

## Design system

Tokens in `tailwind.config.js` (indigo `primary`, slate `dark`, semantic `success/warning/error`), shared classes in `index.css`
(`btn-*`, `input-field`, `field-label`, `card`, `badge`). Mobile-first: sidebar becomes a drawer, dialogs become bottom sheets, tables scroll.
Labelled inputs with inline errors, skeleton loading states, empty states with actions, in-app confirm dialogs, `aria-*` on interactive widgets.
