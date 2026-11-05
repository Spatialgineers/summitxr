import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, type Plugin} from 'vite';

/** Admin, stage, games, 3D and PDF chunks: cached when first used, never warmed in advance. */
const ON_DEMAND = /^(AdminDashboard|AnalyticsDashboard|DatabaseSchemaViewer|StagePage|StageVisualizer|SummitVisitRadar|SgxVisitGlobe|NetworkingQrScannerModal|SummitSpeakerPortalModal|MatchModule|matchData|SummitEmbedsHub|SummitDroneMiniGame|html2canvas|purify|index\.es|draco|three|coreFx|SgxOrbitalCore3D|InteractiveSpatialCanvas|passPdf)/;

/** The pass art the offline SGX Pass needs (public/holo). */
const PASS_ART = ['bolt', 'gear', 'gearG', 'guild', 'sgxLogo', 'summitIcon', 'summitType', 'story', 'showcase', 'spark', 'stage', 'system', 'synthesize'].map((n) => `/holo/${n}.png`);

/** Stamps dist/sw.js with a build id (each deploy installs a fresh service worker) and writes
    dist/sw-precache.json: the small chunks and pass art the worker caches once the page is idle
    (never during the first load). */
function swBuildStamp(): Plugin {
  return {
    name: 'sgx-sw-build-stamp',
    apply: 'build',
    closeBundle() {
      const outDir = this?.environment?.config?.build?.outDir;
      const dist = outDir ? path.resolve(__dirname, outDir) : path.resolve(__dirname, 'dist');
      const file = path.join(dist, 'sw.js');
      if (!fs.existsSync(file)) return;
      const id = `${Date.now().toString(36)}`;
      const assetsDir = path.join(dist, 'assets');
      const small = fs.existsSync(assetsDir)
        ? fs.readdirSync(assetsDir).filter((f) => /\.(js|css)$/.test(f) && !ON_DEMAND.test(f) && fs.statSync(path.join(assetsDir, f)).size < 300 * 1024).map((f) => `/assets/${f}`)
        : [];
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/__SGX_BUILD__/g, id));
      fs.writeFileSync(path.join(dist, 'sw-precache.json'), JSON.stringify({ build: id, files: [...PASS_ART, ...small] }));
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), swBuildStamp()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
