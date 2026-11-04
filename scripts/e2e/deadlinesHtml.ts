/* Prints the server-rendered <head> + no-JS copy of the welcome portal and the press
   room (src/server/welcomeMeta.ts) as JSON, for deadlines.cjs. Rendered locally from
   index.html with no video ids: no network, no Firestore. */
import fs from 'fs';
import path from 'path';
import { renderPressHtml, renderWelcomeHtml } from '../../src/server/welcomeMeta';

const index = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
const cfg = { ids: {}, dates: {} };
process.stdout.write(JSON.stringify({
  hub: renderWelcomeHtml(index, '/bienvenida', cfg),
  speaker: renderWelcomeHtml(index, '/bienvenida/speaker', cfg),
  sponsor: renderWelcomeHtml(index, '/bienvenida/sponsor', cfg),
  visitante: renderWelcomeHtml(index, '/bienvenida/visitante', cfg),
  press: renderPressHtml(index),
}));
