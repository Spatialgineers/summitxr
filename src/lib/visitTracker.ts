import {
  doc, collection, runTransaction, increment, serverTimestamp, onSnapshot, query, orderBy, limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { PR_MUNICIPIOS } from './prMunicipios';

/* =========================================================================
   VISIT RADAR
   Counts visits to the Summit web app and where they come from, for the public
   map and leaderboards. Privacy by design: only the coarse region (municipio,
   US state or country) is stored, never the IP or an exact location.

   Firestore (see firestore.rules):
   · summit_visit_stats/global   { totalVisits, uniqueVisitors, updatedAt }
   · summit_visit_regions/{id}   { name, kind, country, lat, lon, totalVisits, uniqueVisitors, lastVisitAt }
   · summit_visitors/{visitorId} { regionId, createdAt }   (makes "unique" unique)
   A visit = one browser session; a unique visitor = one device (random id).
   ========================================================================= */

export type RegionKind = 'municipio' | 'state' | 'country' | 'unknown';

export interface VisitRegion {
  id: string;
  name: string;
  kind: RegionKind;
  country: string;
  lat: number | null;
  lon: number | null;
  totalVisits: number;
  uniqueVisitors: number;
  lastVisitAt?: number;
}

export interface VisitStats {
  totalVisits: number;
  uniqueVisitors: number;
}

/** HTML-escape a value before it goes into a map/globe tooltip (names come from Firestore). */
export function escapeHtml(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

const VISITOR_KEY = 'sgx_visitor_id_v1';
const SESSION_KEY = 'sgx_visit_counted_v1';
const MY_REGION_KEY = 'sgx_visit_region_v1';

const STATS_REF = () => doc(db, 'summit_visit_stats', 'global');
const REGIONS = () => collection(db, 'summit_visit_regions');

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`).replace(/[^a-zA-Z0-9_-]/g, '');
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `anon${Math.random().toString(36).slice(2, 12)}`;
  }
}

interface GeoGuess { city?: string; region?: string; country?: string; countryCode?: string; lat?: number; lon?: number }

async function fetchJson(url: string, ms = 4000): Promise<any> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    window.clearTimeout(t);
  }
}

/** Coarse IP-based location from free, keyless providers (city level at best). */
async function geolocate(): Promise<GeoGuess> {
  try {
    const g = await fetchJson('https://get.geojs.io/v1/ip/geo.json');
    return { city: g.city, region: g.region, country: g.country, countryCode: g.country_code, lat: Number(g.latitude), lon: Number(g.longitude) };
  } catch {}
  try {
    const g = await fetchJson('https://ipapi.co/json/');
    return { city: g.city, region: g.region, country: g.country_name, countryCode: g.country_code, lat: Number(g.latitude), lon: Number(g.longitude) };
  } catch {}
  return {};
}

const MUNI_BY_NAME = new Map(PR_MUNICIPIOS.map((m) => [normalize(m.name), m]));

function nearestMunicipio(lat: number, lon: number) {
  let best = PR_MUNICIPIOS[0];
  let bestD = Infinity;
  for (const m of PR_MUNICIPIOS) {
    const d = (m.lat - lat) ** 2 + ((m.lon - lon) * 0.95) ** 2;
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
}

/** Maps a geo guess to the region we count: a PR municipio, a US state or a country. */
export function resolveRegion(g: GeoGuess): Omit<VisitRegion, 'totalVisits' | 'uniqueVisitors'> {
  const cc = (g.countryCode || '').toUpperCase();
  const hasPoint = Number.isFinite(g.lat) && Number.isFinite(g.lon);
  const isPR = cc === 'PR' || /puerto rico/i.test(g.region || '') || /puerto rico/i.test(g.country || '');
  if (isPR) {
    const byName = g.city ? MUNI_BY_NAME.get(normalize(g.city)) : undefined;
    const m = byName || (hasPoint ? nearestMunicipio(g.lat as number, g.lon as number) : undefined);
    if (m) return { id: `pr_${m.id}`, name: m.name, kind: 'municipio', country: 'PR', lat: m.lat, lon: m.lon };
    return { id: 'pr_otro', name: 'Puerto Rico', kind: 'municipio', country: 'PR', lat: 18.22, lon: -66.43 };
  }
  // Region-level point rounded to ~10 km: enough for a marker, never a person.
  const lat = hasPoint ? Math.round((g.lat as number) * 10) / 10 : null;
  const lon = hasPoint ? Math.round((g.lon as number) * 10) / 10 : null;
  if (cc === 'US' && g.region) {
    return { id: `us_${normalize(g.region)}`.slice(0, 60), name: `${g.region}, EE. UU.`, kind: 'state', country: 'US', lat, lon };
  }
  if (cc) return { id: `cc_${cc.toLowerCase()}`, name: g.country || cc, kind: 'country', country: cc, lat, lon };
  return { id: 'desconocido', name: 'Ubicación desconocida', kind: 'unknown', country: '', lat: null, lon: null };
}

export function getMyRegion(): { id: string; name: string } | null {
  try {
    const raw = localStorage.getItem(MY_REGION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let started = false;

/** Counts this session once. Safe to call on every page load. */
export async function recordVisit(): Promise<void> {
  if (started) return;
  started = true;
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (new URLSearchParams(window.location.search).get('embed') === 'true') return;
  } catch {}

  const region = resolveRegion(await geolocate());
  const vid = visitorId();
  try {
    await runTransaction(db, async (tx) => {
      // All reads first (Firestore transaction rule), then the writes.
      const visitorRef = doc(db, 'summit_visitors', vid);
      const regionRef = doc(REGIONS(), region.id);
      const [known, stats, regionSnap] = await Promise.all([tx.get(visitorRef), tx.get(STATS_REF()), tx.get(regionRef)]);
      const isNew = !known.exists();
      const step = { totalVisits: increment(1), uniqueVisitors: increment(isNew ? 1 : 0) };
      if (isNew) tx.set(visitorRef, { regionId: region.id, createdAt: serverTimestamp() });
      if (stats.exists()) tx.update(STATS_REF(), { ...step, updatedAt: serverTimestamp() });
      else tx.set(STATS_REF(), { totalVisits: 1, uniqueVisitors: isNew ? 1 : 0, updatedAt: serverTimestamp() });
      if (regionSnap.exists()) tx.update(regionRef, { ...step, lastVisitAt: serverTimestamp() });
      else tx.set(regionRef, {
        name: region.name, kind: region.kind, country: region.country, lat: region.lat, lon: region.lon,
        totalVisits: 1, uniqueVisitors: isNew ? 1 : 0, lastVisitAt: serverTimestamp(),
      });
    });
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
      localStorage.setItem(MY_REGION_KEY, JSON.stringify({ id: region.id, name: region.name }));
    } catch {}
    window.dispatchEvent(new CustomEvent('sgx:visit_recorded', { detail: { regionId: region.id, name: region.name } }));
  } catch (err) {
    // Rules not deployed yet, offline, or blocked: the app keeps working without the radar.
    console.warn('[SGX Visit Radar] visit not recorded:', err instanceof Error ? err.message : err);
  }
}

export function subscribeVisitStats(cb: (s: VisitStats | null) => void): () => void {
  return onSnapshot(STATS_REF(), (snap) => {
    const d = snap.data();
    cb(d ? { totalVisits: d.totalVisits || 0, uniqueVisitors: d.uniqueVisitors || 0 } : { totalVisits: 0, uniqueVisitors: 0 });
  }, () => cb(null));
}

export function subscribeVisitRegions(cb: (regions: VisitRegion[] | null) => void): () => void {
  const q = query(REGIONS(), orderBy('totalVisits', 'desc'), limit(400));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => {
      const v = d.data();
      const last = v.lastVisitAt instanceof Timestamp ? v.lastVisitAt.toMillis() : undefined;
      return {
        id: d.id, name: v.name || d.id, kind: v.kind || 'unknown', country: v.country || '',
        lat: typeof v.lat === 'number' ? v.lat : null, lon: typeof v.lon === 'number' ? v.lon : null,
        totalVisits: v.totalVisits || 0, uniqueVisitors: v.uniqueVisitors || 0, lastVisitAt: last,
      };
    }));
  }, () => cb(null));
}
