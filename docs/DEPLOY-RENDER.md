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
        ──► https://aapka-pg.onrender.com/api/...     → Express → JSON API → MongoDB Atlas
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

## 1. Create the database (MongoDB Atlas, free)

1. Sign up at <https://www.mongodb.com/cloud/atlas/register> → **Create** a free **M0** cluster.
2. **Database Access** → *Add New Database User* → username/password (avoid `@ : / ?` in the password or URL-encode it).
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`) — Render's IPs are dynamic.
4. **Connect** → *Drivers* → copy the connection string and add the database name:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/aapka_pg?retryWrites=true&w=majority
   ```

Keep this string handy — it goes into `MONGO_URI`.

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
3. When prompted for `MONGO_URI`, paste your Atlas string.

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
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | a long random string (or use Render's *Generate*) |
| `JWT_EXPIRES_IN` | `7d` |
| `DEMO_OTP` | `1234` |

4. **Create Web Service**. First build takes ~2–4 minutes.

> `PORT` is provided by Render — do not set it.

---

## 4. Seed the demo data

The app is empty until seeded. Run the seeder **once** against Atlas.

**From your machine (most reliable):**

```powershell
cd server
$env:MONGO_URI="mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/aapka_pg?retryWrites=true&w=majority"
$env:JWT_SECRET="any-value"
npm run seed
```

```bash
# macOS / Linux
cd server
MONGO_URI="mongodb+srv://..." JWT_SECRET="any" npm run seed
```

A shell-set `MONGO_URI` takes precedence over `server/.env`.

**Alternative — Render Shell:** open your service → **Shell** → `npm run seed`
(available on paid instances; on free instances use the local method above).

Skip seeding entirely if you want a clean production database — you can then
sign up your first PG owner at `https://<your-service>.onrender.com/subscribe`.

---

## 5. Verify

```bash
curl https://<your-service>.onrender.com/api/health
# {"success":true,"status":"ok",...}
```

Then open `https://<your-service>.onrender.com` and log in:

| Role | Login | Password / OTP |
|---|---|---|
| Owner | `shreeganesh_pg_4821` | `demo1234` |
| Manager | `manager@shreeganeshpg.in` | `demo1234` |
| Tenant | `9876500011` | OTP `1234` |

---

## 6. Local production rehearsal (optional)

Reproduce exactly what Render runs:

```powershell
npm ci; npm ci --prefix server; npm run build
$env:NODE_ENV="production"; $env:PORT="5050"; $env:MONGO_URI="mongodb://127.0.0.1:27017/aapka_pg"; $env:JWT_SECRET="local"
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

### `Cannot connect to MongoDB` / connection timeout

Atlas IP allowlist. *Network Access* → add `0.0.0.0/0`.

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
- **Secrets**: `JWT_SECRET` and `MONGO_URI` live only in Render env vars; `server/.env` is git-ignored and never deployed.
- **Custom domain**: add it in Render → *Settings* → *Custom Domains*; no code change needed.
- **CORS**: not required for this single-service setup. Only set `CORS_ORIGIN` if you later host the SPA elsewhere.
- **Sessions**: JWTs are stored in `localStorage`; rotating `JWT_SECRET` logs everyone out.
- **Splitting later**: to separate frontend/backend into two Render services, build the SPA with `VITE_API_URL=https://<api-host>` and set `CORS_ORIGIN=https://<web-host>` on the API.
