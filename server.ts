import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { createServer as createViteServer } from 'vite';
import { setupWebSocketEngine } from './src/server/engine/wsHandler';
import { createApiRouter } from './src/server/routes/apiRouter';
import { welcomeHtmlFor } from './src/server/welcomeMeta';
import { privacyPageHtml } from './src/server/privacyPage';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();
  // Trust only the one proxy hop in front of us (Cloud Run), so X-Forwarded-For can't be spoofed.
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  const server = http.createServer(app);

  // Initialize modular WebSocket Realtime Engine
  const { broadcastToRoom } = setupWebSocketEngine(server);

  // Mount REST API Router
  app.use('/api', createApiRouter(broadcastToRoom));

  // Health check endpoint for Cloud Run container probes
  app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
  });

  const distPath = path.join(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === 'production';

  // Basic hardening on every response (the app embeds nothing cross-origin that needs more).
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    next();
  });

  // Public privacy policy page (Meta and other platforms require a privacy URL).
  app.get(['/privacidad', '/privacy', '/privacidad/', '/privacy/'], (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.type('html').send(privacyPageHtml());
  });

  // Vite middleware in dev or static files in production
  if (isProduction) {
    // Compressed build files: the entry bundle is ~1.4 MB raw and ~0.4 MB compressed. Each file
    // is compressed once (brotli or gzip, whichever the browser takes) and kept in memory.
    const COMPRESSIBLE = /\.(js|mjs|css|svg|json|webmanifest|glb|txt|xml|wasm)$/i;
    const packed = new Map<string, Buffer>();
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      let rel: string;
      try { rel = decodeURIComponent(req.path); } catch { return next(); }
      if (!COMPRESSIBLE.test(rel)) return next();
      const file = path.join(distPath, rel);
      if (!file.startsWith(distPath + path.sep)) return next();
      const accept = String(req.headers['accept-encoding'] || '');
      const enc = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : '';
      if (!enc) return next();
      let stat: fs.Stats;
      try { stat = fs.statSync(file); } catch { return next(); }
      if (!stat.isFile() || stat.size < 1024) return next();
      const key = `${enc}:${file}:${stat.mtimeMs}`;
      let body = packed.get(key);
      if (!body) {
        const raw = fs.readFileSync(file);
        body = enc === 'br'
          ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 7, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } })
          : zlib.gzipSync(raw, { level: 7 });
        packed.set(key, body);
      }
      res.setHeader('Content-Encoding', enc);
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', String(body.length));
      res.type(path.extname(file));
      res.setHeader('Cache-Control', rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      if (req.method === 'HEAD') return res.end();
      res.end(body);
    });
    app.use(express.static(distPath, {
      // /sponsors is both a page and the folder of sponsor logos: never redirect to /sponsors/
      redirect: false,
      setHeaders: (res, filePath) => {
        const name = path.basename(filePath);
        // Hashed build files never change; the worker, manifest and page must always be fresh.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else if (name === 'sw.js' || name === 'index.html' || name === 'manifest.webmanifest') res.setHeader('Cache-Control', 'no-cache');
      },
    }));
    // A build file that is not here (an old tab asking for last deploy's chunk) is a real 404,
    // never the page: an HTML answer to a script request breaks the import, and the service
    // worker must not keep it.
    app.use('/assets', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.status(404).type('text/plain').send('Not found');
    });
    // The welcome portal (/bienvenida, /bienvenida/<rol>) and the press room (/prensa) get their own head (title, OG, JSON-LD)
    // and a no-JS copy of its text; every other route gets index.html as is.
    const indexFile = path.join(distPath, 'index.html');
    let indexCache: { mtime: number; html: string } | null = null;
    const readIndex = () => {
      const mtime = fs.statSync(indexFile).mtimeMs;
      if (!indexCache || indexCache.mtime !== mtime) indexCache = { mtime, html: fs.readFileSync(indexFile, 'utf8') };
      return indexCache.html;
    };
    app.get('*', async (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      try {
        const html = await welcomeHtmlFor(readIndex, req.path, Object.keys(req.query).length > 0);
        if (html) return res.type('html').send(html);
      } catch { /* fall through to the plain page */ }
      res.sendFile(indexFile);
    });
  } else {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SGX Live Engine] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SGX Live Engine] Fatal server boot error:', err);
  process.exit(1);
});
