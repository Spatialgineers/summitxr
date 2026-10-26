import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Globe2, MapPin } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { PR_GEOJSON_URL, PR_MUNICIPIOS } from '../../lib/prMunicipios';
import { getMyRegion, VisitRegion } from '../../lib/visitTracker';
import { formatCount, useVisitRegions, useVisitStats } from './visitRadarStore';

// globe.gl ships in its own chunk, loaded only when the 3D view opens.
const SgxVisitGlobe = lazy(() => import('./SgxVisitGlobe'));

/*
 * SGX.System · Radar de visitas: a live map of where the Summit web app is
 * visited from (Puerto Rico by municipio, the rest of the world by US state or
 * country), public counters and leaderboards. Counts started when the radar
 * was published.
 */

const PR_BOUNDS: L.LatLngBoundsExpression = [[17.86, -67.32], [18.55, -65.2]];
const RECENT_MS = 15 * 60 * 1000;

/** Animated count-up for the big counters. */
const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - t, 3)));
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toLocaleString('es-PR')}</>;
};

function heat(visits: number, max: number): number {
  if (!visits || !max) return 0;
  return Math.max(0.18, Math.log1p(visits) / Math.log1p(max));
}

export const SummitVisitRadar: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const liveStats = useVisitStats();
  const liveRegions = useVisitRegions();
  // ?radarPreview=1 renders sample data (never written anywhere) to preview the radar before real visits arrive.
  const preview = useMemo(() => new URLSearchParams(window.location.search).get('radarPreview') === '1', []);
  const sample = useMemo(() => (preview ? buildPreviewData() : null), [preview]);
  const stats = sample ? sample.stats : liveStats;
  const regions = sample ? sample.regions : liveRegions;
  const mine = getMyRegion();
  const [view, setView] = useState<'globe' | 'pr'>('globe');

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayer = useRef<L.GeoJSON | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const [geo, setGeo] = useState<any>(null);

  const byId = useMemo(() => new Map((regions || []).map((r) => [r.id, r])), [regions]);
  const muni = useMemo(() => (regions || []).filter((r) => r.kind === 'municipio' && r.id !== 'pr_otro'), [regions]);
  const outside = useMemo(() => (regions || []).filter((r) => r.country && r.country !== 'PR'), [regions]);
  const maxMuni = muni.reduce((m, r) => Math.max(m, r.totalVisits), 0);
  const countries = new Set((regions || []).filter((r) => r.country).map((r) => r.country)).size;
  const myRank = mine ? (regions || []).findIndex((r) => r.id === mine.id) + 1 : 0;

  // Map boot (once).
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, {
      zoomControl: true, attributionControl: true, scrollWheelZoom: false, worldCopyJump: true,
      minZoom: 2, maxZoom: 12, zoomSnap: 0.25, zoomDelta: 0.5,
    });
    map.fitBounds(PR_BOUNDS, { padding: [4, 4] });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    fetch(PR_GEOJSON_URL).then((r) => r.json()).then(setGeo).catch(() => setGeo(null));
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Municipio choropleth: SGX yellow intensity by visits.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geo) return;
    geoLayer.current?.remove();
    geoLayer.current = L.geoJSON(geo, {
      style: (f) => {
        const r = byId.get(`pr_${f?.properties?.id}`);
        const h = heat(r?.totalVisits || 0, maxMuni);
        const isMine = mine?.id === `pr_${f?.properties?.id}`;
        return {
          color: isMine ? '#00DDFF' : '#32527B',
          weight: isMine ? 2 : 0.8,
          fillColor: '#FDCC0D',
          fillOpacity: h ? 0.12 + h * 0.6 : 0.03,
        };
      },
      onEachFeature: (f, layer) => {
        const r = byId.get(`pr_${f.properties.id}`);
        const v = r?.totalVisits || 0;
        layer.bindTooltip(
          `<strong>${f.properties.name}</strong><br/>${v.toLocaleString('es-PR')} ${es ? 'visitas' : 'visits'} · ${(r?.uniqueVisitors || 0).toLocaleString('es-PR')} ${es ? 'únicas' : 'unique'}`,
          { sticky: true, className: 'sgx-map-tip' },
        );
        layer.on('mouseover', () => (layer as L.Path).setStyle({ weight: 2, color: '#FDCC0D' }));
        layer.on('mouseout', () => geoLayer.current?.resetStyle(layer as L.Path));
      },
    }).addTo(map);
  }, [geo, byId, maxMuni, mine?.id, es]);

  // Markers: outside PR sized by visits, and a pulse wherever someone visited in the last 15 minutes.
  useEffect(() => {
    const group = markerLayer.current;
    if (!group) return;
    group.clearLayers();
    const maxOut = outside.reduce((m, r) => Math.max(m, r.totalVisits), 0);
    outside.forEach((r) => {
      if (r.lat == null || r.lon == null) return;
      L.circleMarker([r.lat, r.lon], {
        radius: 4 + 14 * heat(r.totalVisits, maxOut),
        color: '#00DDFF', weight: 1, fillColor: '#00DDFF', fillOpacity: 0.35,
      }).bindTooltip(`<strong>${r.name}</strong><br/>${r.totalVisits.toLocaleString('es-PR')} ${es ? 'visitas' : 'visits'}`, { className: 'sgx-map-tip' }).addTo(group);
    });
    const now = Date.now();
    (regions || []).forEach((r) => {
      if (!r.lastVisitAt || now - r.lastVisitAt > RECENT_MS || r.lat == null || r.lon == null) return;
      L.marker([r.lat, r.lon], {
        interactive: false,
        icon: L.divIcon({ className: 'sgx-map-pulse', html: '<span></span><span></span>', iconSize: [18, 18] }),
      }).addTo(group);
    });
  }, [outside, regions, es]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (view !== 'pr') return;
    // The Leaflet map stays mounted while hidden; re-measure when it comes back.
    window.setTimeout(() => {
      map.invalidateSize();
      map.flyToBounds(PR_BOUNDS, { padding: [4, 4], duration: 1.2 });
    }, 60);
  }, [view]);

  const offline = stats === null || regions === null;
  const loading = stats === undefined;
  const topMuni = muni.slice(0, 10);
  const topOutside = outside.slice(0, 10);

  return (
    <div className="sgx-radar">
      <div className="sgx-radar__counters">
        <div className="sgx-radar__counter is-primary">
          <span className="sgx-field__label">{es ? 'Visitas totales' : 'Total visits'}</span>
          <span className="sgx-radar__value">{loading ? '…' : offline ? '—' : <CountUp value={stats?.totalVisits || 0} />}</span>
        </div>
        <div className="sgx-radar__counter">
          <span className="sgx-field__label">{es ? 'Visitantes únicos' : 'Unique visitors'}</span>
          <span className="sgx-radar__value">{loading ? '…' : offline ? '—' : <CountUp value={stats?.uniqueVisitors || 0} />}</span>
        </div>
        <div className="sgx-radar__counter">
          <span className="sgx-field__label">{es ? 'Municipios encendidos' : 'Municipios lit'}</span>
          <span className="sgx-radar__value">{muni.length}<small>/78</small></span>
        </div>
        <div className="sgx-radar__counter">
          <span className="sgx-field__label">{es ? 'Países' : 'Countries'}</span>
          <span className="sgx-radar__value">{countries}</span>
        </div>
      </div>

      {preview && (
        <div className="sgx-alert">
          <span className="sgx-alert__tag">{es ? 'VISTA PREVIA' : 'PREVIEW'}</span>
          <span className="sgx-alert__msg">{es ? 'Datos de ejemplo para ver el diseño. Quita ?radarPreview=1 del enlace para ver las visitas reales.' : 'Sample data to preview the design. Remove ?radarPreview=1 from the link to see real visits.'}</span>
        </div>
      )}

      {offline && !preview && (
        <div className="sgx-alert">
          <span className="sgx-alert__tag">RADAR</span>
          <span className="sgx-alert__msg">{es ? 'El radar no está conectado ahora mismo. Los contadores vuelven en cuanto haya conexión.' : 'The radar is offline right now. Counters come back as soon as it reconnects.'}</span>
        </div>
      )}

      <div className="sgx-radar__grid">
        <section className="sgx-radar__map-wrap" aria-label={es ? 'Mapa de visitas' : 'Visits map'}>
          <div className="sgx-radar__map-head">
            <span className="sgx-status">
              <span className="sgx-led" aria-hidden="true" />
              <span className="sgx-readout">{es ? 'EN VIVO' : 'LIVE'}</span>
            </span>
            <fieldset className="sgx-seg" aria-label={es ? 'Vista del mapa' : 'Map view'}>
              <label><input type="radio" name="radar-view" checked={view === 'globe'} onChange={() => setView('globe')} /><span className="sgx-btn sgx-btn--sm"><Globe2 className="w-3.5 h-3.5" />{es ? 'Mundo 3D' : '3D World'}</span></label>
              <label><input type="radio" name="radar-view" checked={view === 'pr'} onChange={() => setView('pr')} /><span className="sgx-btn sgx-btn--sm"><MapPin className="w-3.5 h-3.5" />Puerto Rico</span></label>
            </fieldset>
          </div>
          {view === 'globe' && (
            <Suspense fallback={<div className="sgx-globe sgx-globe--loading sgx-readout">…</div>}>
              <SgxVisitGlobe regions={regions || []} mineId={mine?.id} />
            </Suspense>
          )}
          <div ref={mapEl} className={`sgx-radar__map ${view === 'pr' ? '' : 'is-hidden'}`} />
          <div className="sgx-radar__legend">
            <span><i className="is-muni" />{view === 'pr' ? (es ? 'Municipio: más amarillo, más visitas' : 'Municipio: brighter yellow, more visits') : (es ? 'Puerto Rico' : 'Puerto Rico')}</span>
            <span><i className="is-world" />{view === 'pr' ? (es ? 'Fuera de PR' : 'Outside PR') : (es ? 'País que nos visita · arco hacia San Juan' : 'Visiting country · arc to San Juan')}</span>
            <span><i className="is-pulse" />{es ? 'Visita en los últimos 15 min' : 'Visit in the last 15 min'}</span>
          </div>
        </section>

        <aside className="sgx-radar__boards">
          {mine && (
            <div className="sgx-radar__mine">
              <span className="sgx-field__label">{es ? 'Tu visita cuenta para' : 'Your visit counts for'}</span>
              <strong>{mine.name}</strong>
              {myRank > 0 && <span className="sgx-readout">#{myRank}</span>}
            </div>
          )}
          <Leaderboard title={es ? 'Top municipios' : 'Top municipios'} rows={topMuni} max={maxMuni} empty={es ? 'Ningún municipio todavía. ¡Comparte el enlace!' : 'No municipios yet. Share the link!'} mineId={mine?.id} />
          <Leaderboard title={es ? 'Top fuera de Puerto Rico' : 'Top outside Puerto Rico'} rows={topOutside} max={topOutside[0]?.totalVisits || 0} empty={es ? 'Todavía nadie desde fuera de la isla.' : 'Nobody from off the island yet.'} mineId={mine?.id} tone="cyan" />
          <p className="sgx-radar__note">
            {es
              ? `El conteo empezó cuando se publicó el radar. Guardamos solo la zona aproximada (municipio, estado o país), nunca tu IP ni tu ubicación exacta. ${PR_MUNICIPIOS.length} municipios en el mapa.`
              : `Counting started when the radar went live. We only keep the approximate area (municipio, state or country), never your IP or exact location. ${PR_MUNICIPIOS.length} municipios on the map.`}
          </p>
        </aside>
      </div>
    </div>
  );
};

const Leaderboard: React.FC<{ title: string; rows: VisitRegion[]; max: number; empty: string; mineId?: string; tone?: 'cyan' }> = ({
  title, rows, max, empty, mineId, tone,
}) => (
  <section className="sgx-radar__board">
    <h3 className="sgx-station__h2"><span>{title}</span><span className="sgx-readout">{rows.length}</span></h3>
    {rows.length === 0 ? (
      <p className="sgx-radar__empty">{empty}</p>
    ) : (
      <ol className="sgx-radar__list">
        {rows.map((r, i) => (
          <li key={r.id} className={`sgx-radar__row ${r.id === mineId ? 'is-mine' : ''} ${tone === 'cyan' ? 'is-cyan' : ''}`}>
            <span className="sgx-radar__rank">{String(i + 1).padStart(2, '0')}</span>
            <span className="sgx-radar__name">{r.name}</span>
            <span className="sgx-radar__count">{formatCount(r.totalVisits)}</span>
            <span className="sgx-radar__bar" aria-hidden="true"><span style={{ transform: `scaleX(${max ? r.totalVisits / max : 0})` }} /></span>
          </li>
        ))}
      </ol>
    )}
  </section>
);

/** Compact public counter for the HUD bars. Click opens the radar. */
export const VisitCounterChip: React.FC<{ onOpen?: () => void; className?: string }> = ({ onOpen, className }) => {
  const stats = useVisitStats();
  if (!stats) return null;
  return (
    <button type="button" className={`sgx-visit-chip ${className || ''}`} onClick={onOpen} title="Radar de visitas" data-sgx-hover>
      <span className="sgx-led" aria-hidden="true" />
      <span className="sgx-readout"><span className="sgx-readout__k">VIS</span>{formatCount(stats.totalVisits)}</span>
      <span className="sgx-readout"><span className="sgx-readout__k">ÚNI</span>{formatCount(stats.uniqueVisitors)}</span>
    </button>
  );
};

/** Deterministic sample data for ?radarPreview=1. Never stored. */
function buildPreviewData(): { stats: { totalVisits: number; uniqueVisitors: number }; regions: VisitRegion[] } {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const weights: Record<string, number> = { san_juan: 420, bayamon: 180, isabela: 160, mayaguez: 150, carolina: 140, ponce: 120, aguadilla: 110, caguas: 95, guaynabo: 90, arecibo: 60 };
  const now = Date.now();
  const muni: VisitRegion[] = PR_MUNICIPIOS.filter(() => rnd() > 0.35).map((m) => {
    const v = weights[m.id] ?? Math.round(4 + rnd() * 40);
    return { id: `pr_${m.id}`, name: m.name, kind: 'municipio', country: 'PR', lat: m.lat, lon: m.lon, totalVisits: v, uniqueVisitors: Math.round(v * 0.62), lastVisitAt: rnd() > 0.85 ? now - 60000 : now - 86400000 };
  });
  const world: VisitRegion[] = [
    { id: 'us_florida', name: 'Florida, EE. UU.', kind: 'state', country: 'US', lat: 28.5, lon: -81.4, totalVisits: 74, uniqueVisitors: 51, lastVisitAt: now - 120000 },
    { id: 'us_new_york', name: 'New York, EE. UU.', kind: 'state', country: 'US', lat: 40.7, lon: -74, totalVisits: 48, uniqueVisitors: 33 },
    { id: 'cc_es', name: 'España', kind: 'country', country: 'ES', lat: 40.4, lon: -3.7, totalVisits: 22, uniqueVisitors: 15 },
    { id: 'cc_mx', name: 'México', kind: 'country', country: 'MX', lat: 19.4, lon: -99.1, totalVisits: 12, uniqueVisitors: 9 },
    { id: 'cc_do', name: 'República Dominicana', kind: 'country', country: 'DO', lat: 18.5, lon: -69.9, totalVisits: 9, uniqueVisitors: 7 },
    { id: 'us_texas', name: 'Texas, EE. UU.', kind: 'state', country: 'US', lat: 30.3, lon: -97.7, totalVisits: 18, uniqueVisitors: 12 },
    { id: 'us_california', name: 'California, EE. UU.', kind: 'state', country: 'US', lat: 34.1, lon: -118.2, totalVisits: 15, uniqueVisitors: 10 },
    { id: 'cc_co', name: 'Colombia', kind: 'country', country: 'CO', lat: 4.7, lon: -74.1, totalVisits: 8, uniqueVisitors: 6 },
    { id: 'cc_ar', name: 'Argentina', kind: 'country', country: 'AR', lat: -34.6, lon: -58.4, totalVisits: 5, uniqueVisitors: 4 },
    { id: 'cc_gb', name: 'Reino Unido', kind: 'country', country: 'GB', lat: 51.5, lon: -0.1, totalVisits: 6, uniqueVisitors: 5 },
    { id: 'cc_jp', name: 'Japón', kind: 'country', country: 'JP', lat: 35.7, lon: 139.7, totalVisits: 4, uniqueVisitors: 3, lastVisitAt: now - 300000 },
  ];
  const regions = [...muni, ...world].sort((a, b) => b.totalVisits - a.totalVisits);
  const totalVisits = regions.reduce((n, r) => n + r.totalVisits, 0);
  return { stats: { totalVisits, uniqueVisitors: Math.round(totalVisits * 0.61) }, regions };
}
