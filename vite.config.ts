import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, type Plugin} from 'vite';

/** Admin, stage, games, 3D and PDF chunks: cached when first used, not on install. */
const ON_DEMAND = /^(AdminDashboard|AnalyticsDashboard|DatabaseSchemaViewer|StagePage|StageVisualizer|SummitVisitRadar|SgxVisitGlobe|NetworkingQrScannerModal|SummitSpeakerPortalModal|MatchModule|matchData|SummitEmbedsHub|SummitDroneMiniGame|html2canvas|purify|index\.es|draco|three|coreFx|SgxOrbitalCore3D|InteractiveSpatialCanvas|passPdf)/;

/** Stamps dist/sw.js with a build id, so each deploy installs a fresh service worker. */
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
      // Precache the app's small chunks so any section opens offline; the globe,
      // the 3D decoder and the PDF engine stay on demand.
      const assetsDir = path.join(dist, 'assets');
      const small = fs.existsSync(assetsDir)
        ? fs.readdirSync(assetsDir).filter((f) => /\.(js|css)$/.test(f) && !ON_DEMAND.test(f) && fs.statSync(path.join(assetsDir, f)).size < 300 * 1024).map((f) => `/assets/${f}`)
        : [];
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
        .replace(/__SGX_BUILD__/g, id)
        .replace("'__SGX_PRECACHE_ASSETS__'", small.map((f) => JSON.stringify(f)).join(', ')));
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
