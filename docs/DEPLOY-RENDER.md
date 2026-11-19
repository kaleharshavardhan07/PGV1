# Deploy Aapka PG on Render (frontend + backend in one service)

One Render Web Service runs Express, which serves **both**:
- the REST API at `/api/*`
- the built React SPA at everything else (with client-side routing fallback)

Because both live on the **same origin**, there is no CORS setup and no
`VITE_API_URL` to configure.

---

## 0. How it fits together

```
Browser ──► https://aapka-pg.onrender.com/app/owner   → Express → dist/index.html (React SPA)
        ──► https://aapka-pg.onrender.com/api/...     → Express → JSON API → Neon
```

| Render setting | Value |
|---|---|
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm ci --prefix server && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/api/health` |

`npm run build` runs `tsc -b && vite build`, which emits `dist/`.
`npm run start` runs `node server/src/server.js`, which serves `dist/` and the API.

---

## 1. Create the database (Neon, free)

1. Sign up at <https://neon.tech> → **Create project** (pick a region close to your Render region).
2. On the project dashboard open **Connection Details**, tick **Pooled connection**, and copy the connection string:

   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```

Keep this string handy — it goes into `DATABASE_URL`. There is nothing else to set up:
the API creates every table on first start (`server/src/db/schema.sql`, idempotent).

---

## 2. Push the code to GitHub

```bash
git add .
git commit -m "Deploy-ready: single-service build"
git push origin main
```

Make sure `render.yaml` and `server/.env` is **not** committed (it is git-ignored).

---

## 3. Create the Render service

### Option A — Blueprint (uses `render.yaml`, recommended)

1. Render dashboard → **New +** → **Blueprint**.
2. Pick the repository → Render detects `render.yaml` → **Apply**.
3. When prompted for `DATABASE_URL`, paste your Neon string.

### Option B — Manual Web Service

1. **New +** → **Web Service** → connect the repo.
2. Fill in:
   - **Runtime**: `Node`
   - **Build Command**: `npm ci --include=dev && npm ci --prefix server && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/api/health`
3. **Environment variables**:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22.12.0` |
| `DATABASE_URL` | your Neon connection string |
| `PUBLIC_APP_URL` | your service URL, e.g. `https://aapka-pg.onrender.com` (links in emails) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | optional: creates the first platform admin on startup (sign in at `/admin/login`) |
| `SMTP_USER`, `SMTP_TOKEN`, `MAIL_FROM` | optional: Proton Mail SMTP, see below |
| `JWT_SECRET` | a long random string (or use Render's *Generate*) |
| `JWT_EXPIRES_IN` | `7d` |

4. **Create Web Service**. First build takes ~2–4 minutes.

> `PORT` is provided by Render — do not set it.

---

## 4. Seed the demo data

The app starts empty and creates its tables automatically. Seeding is optional — it loads a demo PG. Run the seeder **once** against Neon.

**From your machine (most reliable):**

```powershell
cd server
$env:DATABASE_URL="postgresql://USER:PASS@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
$env:JWT_SECRET="any-value"
npm run seed
```

```bash
# macOS / Linux
cd server
DATABASE_URL="postgresql://..." JWT_SECRET="any" npm run seed
```

A shell-set `DATABASE_URL` takes precedence over `server/.env`.

**Alternative — Render Shell:** open your service → **Shell** → `npm run seed`
(available on paid instances; on free instances use the local method above).

Skip seeding entirely if you want a clean production database — you can then
register your first PG owner at `https://<your-service>.onrender.com/register`.

---

## 4b. Email notifications (Proton, optional)

Proton has no HTTP email API. Apps send through **SMTP submission**, which Proton offers on **paid plans
with a custom domain**: in Proton, *Settings → IMAP/SMTP → SMTP tokens → Generate token* for a custom-domain
address. Set `SMTP_USER` (that address), `SMTP_TOKEN` (the token) and `MAIL_FROM` (same address, or
`Aapka PG <you@yourdomain>`); `SMTP_HOST` (`smtp.protonmail.ch`) and `SMTP_PORT` (`587`, STARTTLS) default
correctly. Verify your domain's SPF/DKIM/DMARC in Proton first, or mail may land in spam.

Emails sent: owner welcome on sign-up, new Find PG enquiries, and a confirmation when a manager or tenant
account is created. Passwords are never emailed. With the variables unset the app works normally and just logs
"mail skipped". The platform admin screen shows whether email is connected.

---

## 5. Verify

```bash
curl https://<your-service>.onrender.com/api/health
# {"success":true,"status":"ok",...}
```

Then open `https://<your-service>.onrender.com` and log in:

| Role | Login | Password |
|---|---|---|
| Owner | `shreeganesh_pg_4821` | `demo1234` |
| Manager | `manager@shreeganeshpg.in` | `demo1234` |
| Tenant | `9876500011` | `demo1234` |

---

## 6. Local production rehearsal (optional)

Reproduce exactly what Render runs:

```powershell
npm ci; npm ci --prefix server; npm run build
$env:NODE_ENV="production"; $env:PORT="5050"; $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aapka_pg"; $env:JWT_SECRET="local"
npm run start
# open http://localhost:5050
```

Verified behaviour in this mode:

| Request | Result |
|---|---|
| `GET /` | SPA (`index.html`) |
| `GET /app/login` | SPA (`index.html`) — deep-link works |
| `GET /assets/*.js` | hashed asset, `max-age=31536000, immutable` |
| `GET /api/health` | JSON 200 |
| `GET /api/unknown` | JSON 404 (never `index.html`) |

---

## 7. Troubleshooting

### `error TS2688: Cannot find type definition file for 'node'` / `'vite/client'`

The build ran without devDependencies. `NODE_ENV=production` makes `npm ci`
behave like `--omit=dev`, so `typescript`, `vite`, `@types/node` and
`vite/client` are missing.

**Fix:** use `npm ci --include=dev` in the build command (already set in
`render.yaml`):

```
npm ci --include=dev && npm ci --prefix server && npm run build
```

`NODE_ENV=production` should still be set **as a runtime env var** — it only
must not suppress dev deps during the build.

### `Failed to start server: ...` / connection timeout

Check `DATABASE_URL` is the full Neon string including `?sslmode=require`. A suspended Neon compute needs a few seconds to wake; the API waits up to 15 s for it.

### `EADDRINUSE`

Do not set `PORT` yourself — Render injects it.

### 404 on deep links (`/app/owner`)

The build output (`dist/`) was missing, so Express served the "not built yet"
page. Check the build logs for a failure.

---

## 8. Notes & gotchas

- **Free tier sleeps** after ~15 min idle; the first request afterwards takes ~30–60 s to wake.
- **`dist/` must exist** for the SPA to be served. If you see "The web app has not been built yet", the build step failed — check the Render build logs.
- **Node version**: Vite 8 needs Node `^20.19.0 || >=22.12.0`. Keep `NODE_VERSION=22.12.0`.
- **Secrets**: `JWT_SECRET` and `DATABASE_URL` live only in Render env vars; `server/.env` is git-ignored and never deployed.
- **Custom domain**: add it in Render → *Settings* → *Custom Domains*; no code change needed.
- **CORS**: not required for this single-service setup. Only set `CORS_ORIGIN` if you later host the SPA elsewhere.
- **Documents**: uploaded files (max 5 MB each) are stored in Neon, not on Render's disk, so they survive restarts and redeploys.
- **Sessions**: JWTs are stored in `localStorage`; rotating `JWT_SECRET` logs everyone out.
- **Splitting later**: to separate frontend/backend into two Render services, build the SPA with `VITE_API_URL=https://<api-host>` and set `CORS_ORIGIN=https://<web-host>` on the API.
