import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GlobeInstance } from 'globe.gl';
import { useLanguage } from '../../context/LanguageContext';
import type { VisitRegion } from '../../lib/visitTracker';

/*
 * SGX Radar Global: a 3D globe where every region that visits the Summit
 * web app fires an arc into Chroma Space Studios, San Juan. The world
 * converges on Puerto Rico. Land is drawn as an SGX-blue hex mesh
 * (Natural Earth countries, public domain), Puerto Rico lit in SGX yellow.
 */

const HQ = { lat: 18.45, lng: -66.07, name: 'Chroma Space Studios · San Juan' };
const COUNTRIES_URL = '/data/world-countries.geojson';
const RECENT_MS = 15 * 60 * 1000;

interface Props {
  regions: VisitRegion[];
  mineId?: string;
}

interface Arc { startLat: number; startLng: number; endLat: number; endLng: number; visits: number; name: string }

export const SgxVisitGlobe: React.FC<Props> = ({ regions, mineId }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const wrapRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [log, setLog] = useState<string[]>([es ? 'RADAR GLOBAL EN LÍNEA.' : 'GLOBAL RADAR ONLINE.']);
  const reduceMotion = useMemo(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }, []);

  const located = useMemo(() => regions.filter((r) => r.lat != null && r.lon != null), [regions]);
  const outside = useMemo(() => located.filter((r) => r.country !== 'PR'), [located]);
  const visitedCountries = useMemo(() => new Set(regions.map((r) => r.country).filter(Boolean)), [regions]);
  const maxVisits = located.reduce((m, r) => Math.max(m, r.totalVisits), 1);
  const topTargets = useMemo(() => outside.slice(0, 4), [outside]);

  const pushLog = (line: string) => setLog((l) => [...l.slice(-2), line]);

  // Boot globe.gl lazily (its own chunk) once.
  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    (async () => {
      try {
        const [{ default: Globe }, countries] = await Promise.all([
          import('globe.gl'),
          fetch(COUNTRIES_URL).then((r) => r.json()),
        ]);
        if (disposed || !elRef.current) return;
        const g = new Globe(elRef.current, { animateIn: !reduceMotion, rendererConfig: { antialias: true, alpha: true } });
        g.backgroundColor('rgba(0,0,0,0)')
          .showAtmosphere(true)
          .atmosphereColor('#32527B')
          .atmosphereAltitude(0.2)
          .globeMaterial(new THREE.MeshPhongMaterial({ color: new THREE.Color('#0b0d12'), emissive: new THREE.Color('#05070a'), shininess: 6 }))
          .hexPolygonsData(countries.features)
          .hexPolygonResolution(3)
          .hexPolygonMargin(0.42)
          .hexPolygonUseDots(true)
          .hexPolygonAltitude(0.004);
        g.scene().add(new THREE.AmbientLight(0x32527b, 1.4));
        const sun = new THREE.DirectionalLight(0xffffff, 0.6);
        sun.position.set(1, 1, 1);
        g.scene().add(sun);
        const controls = g.controls();
        controls.autoRotate = !reduceMotion;
        controls.autoRotateSpeed = 0.35;
        controls.enableZoom = true;
        controls.addEventListener('start', () => { controls.autoRotate = false; });
        g.pointOfView({ lat: 22, lng: -60, altitude: 2.3 }, 0);
        globeRef.current = g;

        const fit = () => {
          const el = wrapRef.current;
          if (!el) return;
          g.width(el.clientWidth);
          g.height(el.clientHeight);
        };
        fit();
        ro = new ResizeObserver(fit);
        if (wrapRef.current) ro.observe(wrapRef.current);
        // Pause rendering off-screen: the 3D core and this globe never burn GPU together.
        io = new IntersectionObserver(([e]) => (e.isIntersecting ? (g as any).resumeAnimation?.() : (g as any).pauseAnimation?.()));
        if (wrapRef.current) io.observe(wrapRef.current);
        setReady(true);
      } catch (err) {
        console.warn('[SGX Radar Global] globe unavailable:', err);
        if (!disposed) setFailed(true);
      }
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      io?.disconnect();
      try { globeRef.current?._destructor(); } catch {}
      globeRef.current = null;
    };
  }, [reduceMotion]);

  // Data layers follow the live regions.
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !ready) return;
    const now = Date.now();

    g.hexPolygonColor((f: any) => {
      const iso = f.properties?.iso;
      if (iso === 'PR') return '#FDCC0D';
      if (visitedCountries.has(iso)) return 'rgba(0, 221, 255, 0.85)';
      return 'rgba(74, 112, 160, 0.75)';
    });

    const arcs: Arc[] = outside.map((r) => ({
      startLat: r.lat as number, startLng: r.lon as number, endLat: HQ.lat, endLng: HQ.lng, visits: r.totalVisits, name: r.name,
    }));
    g.arcsData(arcs)
      .arcColor(() => ['rgba(0, 221, 255, 0.9)', 'rgba(253, 204, 13, 0.95)'])
      .arcStroke((a: any) => 0.25 + 0.9 * Math.sqrt(a.visits / maxVisits))
      .arcAltitudeAutoScale(0.42)
      .arcDashLength(0.45)
      .arcDashGap(0.25)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(reduceMotion ? 0 : 2400)
      .arcLabel((a: any) => `<div class="sgx-globe-tip"><strong>${a.name}</strong><br/>${a.visits.toLocaleString('es-PR')} ${es ? 'visitas' : 'visits'} → San Juan</div>`);

    g.pointsData(located)
      .pointLat('lat')
      .pointLng('lon')
      .pointColor((r: any) => (r.id === mineId ? '#ffffff' : r.country === 'PR' ? '#FDCC0D' : '#00DDFF'))
      .pointAltitude((r: any) => 0.01 + 0.22 * Math.sqrt(r.totalVisits / maxVisits))
      .pointRadius((r: any) => (r.country === 'PR' ? 0.12 : 0.32))
      .pointsMerge(false)
      .pointLabel((r: any) => `<div class="sgx-globe-tip"><strong>${r.name}</strong><br/>${r.totalVisits.toLocaleString('es-PR')} ${es ? 'visitas' : 'visits'} · ${r.uniqueVisitors.toLocaleString('es-PR')} ${es ? 'únicas' : 'unique'}</div>`);

    const recent = located.filter((r) => r.lastVisitAt && now - r.lastVisitAt < RECENT_MS);
    g.ringsData([{ lat: HQ.lat, lon: HQ.lng, hq: true }, ...recent])
      .ringLat('lat')
      .ringLng('lon')
      .ringColor((d: any) => (t: number) => (d.hq ? `rgba(253,204,13,${1 - t})` : `rgba(0,221,255,${1 - t})`))
      .ringMaxRadius((d: any) => (d.hq ? 5 : 2.5))
      .ringPropagationSpeed(reduceMotion ? 0 : 2)
      .ringRepeatPeriod((d: any) => (d.hq ? 900 : 1400));

    g.labelsData([{ lat: HQ.lat, lng: HQ.lng, text: 'CHROMA SPACE STUDIOS', hq: true }, ...outside.slice(0, 6).map((r) => ({ lat: r.lat, lng: r.lon, text: r.name.toUpperCase() }))])
      .labelLat('lat')
      .labelLng('lng')
      .labelText('text')
      .labelSize((d: any) => (d.hq ? 0.9 : 0.55))
      .labelDotRadius((d: any) => (d.hq ? 0.35 : 0.2))
      .labelColor((d: any) => (d.hq ? '#FDCC0D' : 'rgba(255,255,255,0.8)'))
      .labelResolution(2)
      .labelAltitude(0.012);
  }, [ready, located, outside, visitedCountries, maxVisits, mineId, es, reduceMotion]);

  const flyTo = (lat: number, lng: number, name: string, altitude = 0.9) => {
    const g = globeRef.current;
    if (!g) return;
    g.controls().autoRotate = false;
    g.pointOfView({ lat, lng, altitude }, 1800);
    pushLog(`> ${es ? 'OBJETIVO FIJADO' : 'TARGET LOCKED'}: ${name.toUpperCase()}`);
  };

  const converge = () => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView({ lat: 24, lng: -55, altitude: 2.6 }, 2600);
    if (!reduceMotion) g.controls().autoRotate = true;
    pushLog(es ? `> CONVERGENCIA: ${outside.length} ZONAS → SAN JUAN` : `> CONVERGENCE: ${outside.length} ZONES → SAN JUAN`);
  };

  return (
    <div className="sgx-globe" ref={wrapRef}>
      <div ref={elRef} className="sgx-globe__canvas" aria-label={es ? 'Globo de visitas' : 'Visits globe'} role="img" />
      {!ready && !failed && <div className="sgx-globe__boot sgx-readout">{es ? 'CARGANDO RADAR GLOBAL…' : 'LOADING GLOBAL RADAR…'}</div>}
      {failed && <div className="sgx-globe__boot sgx-readout">{es ? 'Tu navegador no pudo iniciar el globo 3D. Usa la vista Puerto Rico.' : 'Your browser could not start the 3D globe. Use the Puerto Rico view.'}</div>}

      <div className="sgx-globe__hud sgx-panel">
        <h3 className="sgx-panel__title">{es ? 'Radar global' : 'Global radar'}</h3>
        <p className="sgx-globe__sub">{es ? 'Cada arco es una zona que nos visita, rumbo a San Juan.' : 'Every arc is a zone visiting us, bound for San Juan.'}</p>
        <div className="sgx-globe__buttons">
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => flyTo(HQ.lat, HQ.lng, HQ.name, 0.6)}>01 · San Juan</button>
          {topTargets.map((r, i) => (
            <button key={r.id} type="button" className="sgx-btn sgx-btn--sm" onClick={() => flyTo(r.lat as number, r.lon as number, r.name)}>
              0{i + 2} · {r.name.split(',')[0]}
            </button>
          ))}
          <span className="sgx-glow">
            <button type="button" className="sgx-btn sgx-btn--sm sgx-globe__converge" onClick={converge}>
              [ {es ? 'Convergencia global' : 'Global convergence'} ]
            </button>
          </span>
        </div>
        <div className="sgx-globe__log" aria-live="polite">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
};

export default SgxVisitGlobe;
