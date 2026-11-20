import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/error.js';

const app = express();

// Render (and most PaaS) terminate TLS at a proxy in front of the app.
if (env.nodeEnv === 'production') app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // Leaflet tiles + Nominatim geocoding for the location picker / Find PG map.
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https://images.unsplash.com',
          'https://plus.unsplash.com',
          'https://tile.openstreetmap.org',
          'https://*.tile.openstreetmap.org',
        ],
        'connect-src': ["'self'", 'https://nominatim.openstreetmap.org'],
      },
    },
  })
);
app.use(
  cors({
    origin: env.corsOrigin.length === 1 && env.corsOrigin[0] === '*' ? true : env.corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// ---------- API ----------
app.get('/api/health', (_req, res) =>
  res.json({ success: true, status: 'ok', service: 'aapka-pg-server', time: new Date().toISOString() })
);

app.use('/api', apiRoutes);

// Unknown /api routes must return JSON, never the SPA's index.html.
app.use('/api', notFound);

// ---------- Static SPA (production single-service deployment) ----------
// The Vite build writes to <repo>/dist; Express serves it from the same origin
// so the browser talks to /api with no CORS or base-URL configuration.
const here = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(here, '../../dist');

if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(
    express.static(distPath, {
      index: false,
      setHeaders(res, filePath) {
        // Hashed assets are immutable; index.html must never be cached.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  // Client-side routing fallback for every other GET.
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res
      .status(200)
      .type('html')
      .send(
        '<h1>Aapka PG API</h1><p>The API is running. The web app has not been built yet — run <code>npm run build</code> at the repository root.</p>'
      )
  );
}

app.use(notFound);
app.use(errorHandler);

export default app;
