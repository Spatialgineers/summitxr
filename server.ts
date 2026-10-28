import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { setupWebSocketEngine } from './src/server/engine/wsHandler';
import { createApiRouter } from './src/server/routes/apiRouter';

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

  // Vite middleware in dev or static files in production
  if (isProduction) {
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        const name = path.basename(filePath);
        // Hashed build files never change; the worker, manifest and page must always be fresh.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else if (name === 'sw.js' || name === 'index.html' || name === 'manifest.webmanifest') res.setHeader('Cache-Control', 'no-cache');
      },
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
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
