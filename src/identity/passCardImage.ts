import QRCode from 'qrcode';
import { SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';
import { PILLAR_ACCENT, passQrUrl, type SgxIdentity } from './sgxIdentity';
import { configFromSeed, pilotPng } from './pilotAvatar';
import { CARD_H, CARD_W, drawCardFront, loadImage } from './holoCardCanvas';

/* The SGX Pass front as an image, outside React (the 3D core's orbit card).
   Same drawing as the Holo Card Studio, so the pass looks the same
   everywhere. */
export async function renderPassCardImage(id: SgxIdentity, opts: { es: boolean; rank?: string; scale?: number }): Promise<string | null> {
  const pass = id.pass;
  if (!pass) return null;
  const accent = id.affinity ? PILLAR_ACCENT[id.affinity] : '#FDCC0D';
  const qrUrl = passQrUrl({ c: pass.code, n: pass.fullName, s: id.callsign, p: id.affinity, r: pass.roleTitle, o: pass.organization });
  const [qrData, pilotData] = await Promise.all([
    QRCode.toDataURL(qrUrl, { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark: '#050505', light: '#FDCC0D' } }).catch(() => null),
    id.avatar.png ? Promise.resolve(id.avatar.png) : pilotPng(id.avatar.pilot || configFromSeed(id.avatar.seed, accent), 480).catch(() => null),
  ]);
  const [qr, portrait, bolt, ...icons] = await Promise.all([
    loadImage(qrData), loadImage(pilotData), loadImage('/brand/sgx-bolt.svg'), ...SGX_PILLARS.map((p) => loadImage(p.iconUrl)),
  ]);
  const pillarIcons: Partial<Record<PillarKey, HTMLImageElement>> = {};
  const stamps: Partial<Record<PillarKey, boolean>> = {};
  SGX_PILLARS.forEach((p, i) => { if (icons[i]) pillarIcons[p.key] = icons[i]!; stamps[p.key] = !!id.stamps[`pillar:${p.key}`]; });
  const k = opts.scale ?? 0.6;
  const c = document.createElement('canvas');
  c.width = Math.round(CARD_W * k); c.height = Math.round(CARD_H * k);
  const ctx = c.getContext('2d')!;
  ctx.scale(k, k);
  drawCardFront(ctx, {
    cred: { role: 'visitor', status: 'official', name: pass.fullName, handle: id.callsign, pillar: id.affinity, org: pass.organization },
    es: opts.es, accent, serial: pass.serial, code: pass.code,
    tierLabel: pass.tier === 'SHOWCASE' ? (opts.es ? 'DÍA 3 · CHROMA' : 'DAY 3 · CHROMA') : (opts.es ? 'DIGITAL GLOBAL' : 'GLOBAL DIGITAL'),
    rank: opts.rank, stamps, chroma: !!id.stamps['chroma:checkin'], portrait, qr, bolt, pillarIcons, foil: 0.6,
  });
  try { return c.toDataURL('image/jpeg', 0.85); } catch { return null; }
}
