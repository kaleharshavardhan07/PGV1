# Aapka PG — Frontend LLD

Companion to [../server/docs/LLD.md](../server/docs/LLD.md). React 19 + TypeScript + Vite + Tailwind.

## Structure

```
src/
  api/          client.ts (fetch + JWT + FormData + ApiError) · endpoints.ts (typed routes)
  store/        appStore.ts — single external store (useSyncExternalStore): session + role-scoped data + actions
  types/        domain types (the API already returns these shapes — no adapter layer)
  components/   AppLayout, Sidebar, TopBar, Modal, ConfirmDialog, DocumentPanel, StatCard, Badge, Toast …
  pages/        one file per screen; owner & manager share StaffDashboard / RoomsBeds / Tenants / Documents / Meter / Complaints
```

## Data flow

`login → sessionStore (localStorage) → refresh()` loads everything the role may see with
`Promise.allSettled` (one failing endpoint degrades to an empty list). Every mutation is
`await api → refresh()`, so the server stays the source of truth. A `401` clears the session
(this is also how a tenant who has moved out is logged out).

## Routes

| Area | Routes |
|---|---|
| Public | `/`, `/app/login` (Tenant / Owner / Manager tabs), `/register` (owner sign-up), `/vacancy` |
| Owner / Manager | `/app/{owner,manager}` · `/rooms` · `/tenants` · `/documents` · `/meter` · `/complaints`; owner also `/app/owner/settings` |
| Tenant | `/app/tenant` · `/documents` · `/electricity` · `/complaints` · `/food` · `/profile` |
| Shared | `/app/notifications` |

`AppLayout` guards each page: unauthenticated → login; wrong role → the equivalent page of the user's own
area. The server enforces the same rules independently.

## Key screens

- **Rooms & Beds** — owner: add/edit/delete rooms; add/edit/delete beds (label, rent, number); server blocks
  deleting anything occupied and the message is surfaced. Manager: read-only.
- **Tenants** — create an account (room → vacant bed → rent → joining date); the generated credentials are shown
  once with a copy button. Detail dialog: edit details, reset password, notice / move-out / reallocate, documents.
- **Documents** — upload (type, title, ≤ 5 MB, PDF/JPG/PNG/WebP), view / download via a short-lived link, delete.
  Tenants see and manage only their own.

## Design system

Tokens live in `tailwind.config.js` (indigo `primary`, slate `dark`, semantic `success/warning/error`) and shared
classes in `index.css` (`btn-*`, `input-field`, `field-label`, `card`, `badge`). Mobile-first: the sidebar becomes a
drawer, dialogs become bottom sheets, tables scroll horizontally. Forms use labelled inputs with inline errors;
destructive actions use `ConfirmDialog`, not `window.confirm`.
