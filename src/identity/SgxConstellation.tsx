import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PILLAR_BY_KEY } from '../lib/sgxPillars';
import { PILLAR_ACCENT } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { CONSTELLATION_ORDER, constellationPillars, layoutStars } from './constellation';
import { subscribeConstellationBoard, type ConstellationEntry } from './passNetwork';

/* TU RED: your Rolodex as a network on the holographic grid. You are the
   center node; every pass you swapped is a node in its pillar's sector, and
   nodes of the same pillar link up. Connect all 6 pillars for the secret stamp. */

const hex = (x: number, y: number, r: number) => Array.from({ length: 6 }, (_, k) => {
  const a = (Math.PI / 3) * k - Math.PI / 6;
  return `${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`;
}).join(' ');

export const SgxConstellation: React.FC<{ onScan?: () => void }> = ({ onScan }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { identity, myUid } = useSgxIdentity();
  const [board, setBoard] = useState<ConstellationEntry[] | null | undefined>(undefined);
  const stars = useMemo(() => layoutStars(identity.contacts), [identity.contacts]);
  const covered = constellationPillars(identity);
  const complete = !!identity.stamps['constellation:six'];
  const meAccent = identity.affinity ? PILLAR_ACCENT[identity.affinity] : '#FDCC0D';

  useEffect(() => subscribeConstellationBoard(setBoard), []);

  // Same-pillar stars chain into a constellation, ordered by angle.
  const chains = useMemo(() => CONSTELLATION_ORDER.map((_, i) => stars
    .filter((s) => s.sector === i)
    .sort((a, b) => Math.atan2(a.y - 500, a.x - 500) - Math.atan2(b.y - 500, b.x - 500))), [stars]);

  return (
    <div className="sgx-constellation">
      <div className="sgx-constellation__col">
        <div className="sgx-constellation__map">
          <svg viewBox="0 0 1000 1000" role="img" aria-label={es ? 'Mapa de tu red' : 'Your network map'}>
            <defs>
              <radialGradient id="sgx-cst-bg" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#32527B" stopOpacity="0.3" />
                <stop offset="1" stopColor="#050505" stopOpacity="0" />
              </radialGradient>
              <pattern id="sgx-cst-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(0,221,255,0.09)" strokeWidth="1" />
              </pattern>
              <radialGradient id="sgx-cst-fade" cx="50%" cy="50%" r="50%">
                <stop offset="0.6" stopColor="#fff" stopOpacity="1" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <mask id="sgx-cst-mask"><rect width="1000" height="1000" fill="url(#sgx-cst-fade)" /></mask>
              <filter id="sgx-cst-glow"><feGaussianBlur stdDeviation="6" /></filter>
            </defs>
            <circle cx="500" cy="500" r="500" fill="url(#sgx-cst-bg)" />
            <rect width="1000" height="1000" fill="url(#sgx-cst-grid)" mask="url(#sgx-cst-mask)" />
            {[160, 300, 440].map((r) => <polygon key={r} points={hex(500, 500, r)} className="sgx-constellation__ring" />)}

            {CONSTELLATION_ORDER.map((p, i) => {
              const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
              const mid = ((i + 0.5) / 6) * Math.PI * 2 - Math.PI / 2;
              const on = covered.includes(p);
              return (
                <g key={p} className={`sgx-constellation__sector ${on ? 'is-on' : ''}`} style={{ ['--pillar-accent' as string]: PILLAR_ACCENT[p] }}>
                  <line x1="500" y1="500" x2={500 + Math.cos(a) * 480} y2={500 + Math.sin(a) * 480} />
                  <text x={500 + Math.cos(mid) * 405} y={500 + Math.sin(mid) * 405} textAnchor="middle" dominantBaseline="middle">
                    {PILLAR_BY_KEY[p].name.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {stars.map((s) => (
              <line key={`l-${s.contact.code}`} x1="500" y1="500" x2={s.x} y2={s.y} className="sgx-constellation__link" />
            ))}
            {chains.map((chain, i) => chain.slice(1).map((s, j) => (
              <line key={`c-${i}-${s.contact.code}`} x1={chain[j].x} y1={chain[j].y} x2={s.x} y2={s.y}
                className="sgx-constellation__chain" style={{ ['--pillar-accent' as string]: PILLAR_ACCENT[CONSTELLATION_ORDER[i]] }} />
            )))}

            {stars.map((s, i) => {
              const accent = s.contact.pillar ? PILLAR_ACCENT[s.contact.pillar] : '#ffffff';
              return (
                <g key={s.contact.code} className="sgx-constellation__star" style={{ ['--pillar-accent' as string]: accent, animationDelay: `${(i * 0.37) % 3}s` }}>
                  <title>{`${s.contact.name}${s.contact.callsign ? ` · ${s.contact.callsign}` : ''}${s.contact.pillar ? ` · ${PILLAR_BY_KEY[s.contact.pillar].name}` : ''}`}</title>
                  <polygon points={hex(s.x, s.y, 22)} className="sgx-constellation__halo" filter="url(#sgx-cst-glow)" />
                  <polygon points={hex(s.x, s.y, s.contact.via === 'received' ? 10 : 12)} className="sgx-constellation__core" />
                  {stars.length <= 18 && <text x={s.x} y={s.y + 36} textAnchor="middle">{s.contact.name.split(/\s+/)[0]}</text>}
                </g>
              );
            })}

            <g className="sgx-constellation__me" style={{ ['--pillar-accent' as string]: meAccent }}>
              <polygon points={hex(500, 500, 34)} className="sgx-constellation__halo" filter="url(#sgx-cst-glow)" />
              <polygon points={hex(500, 500, 26)} className="sgx-constellation__frame" />
              <polygon points="515.4,476.9 478.3,505.8 493.7,505.8 484.6,523.1 521.6,494.2 506.2,494.2" className="sgx-constellation__core" />
              <text x="500" y="560" textAnchor="middle">{identity.callsign || (es ? 'TÚ' : 'YOU')}</text>
            </g>
          </svg>
        </div>
        {stars.length === 0 && (
          <div className="sgx-constellation__empty">
            <p>{es ? 'Tu red está vacía. Cada pase que intercambies suma un nodo en el sector de su pilar.' : 'Your network is empty. Every pass you swap adds a node in its pillar sector.'}</p>
            {onScan && <button type="button" className="sgx-btn" onClick={onScan}>{es ? 'Escanear un pase' : 'Scan a pass'}</button>}
          </div>
        )}
      </div>

      <aside className="sgx-constellation__side">
        <dl className="sgx-constellation__stats">
          <div><dt>{es ? 'Conexiones' : 'Connections'}</dt><dd>{stars.length}</dd></div>
          <div><dt>{es ? 'Pilares' : 'Pillars'}</dt><dd>{covered.length}/6</dd></div>
          <div className={complete ? 'is-on' : ''}><dt>{es ? 'Secreto' : 'Secret'}</dt><dd>{complete ? '◆' : '???'}</dd></div>
        </dl>
        <p className="sgx-hangar__note">
          {es
            ? 'Tu pilar ya cuenta como el primero. Conecta con creadores de los demás pilares para completar tu red. Al tablero público solo llegan los números, nunca los nombres de tus contactos.'
            : 'Your own pillar already counts as the first. Connect with creators from the other pillars to complete your network. The public board only gets the numbers, never your contacts’ names.'}
        </p>
        <h4>{es ? 'Redes más grandes' : 'Biggest networks'}</h4>
        {board === undefined ? (
          <p className="sgx-hangar__note">…</p>
        ) : !board || board.length === 0 ? (
          <p className="sgx-hangar__note">{es ? 'Nadie ha conectado su red todavía. El Día 3 se llena.' : 'Nobody has built a network yet. Day 3 fills it.'}</p>
        ) : (
          <ol className="sgx-hangar__board">
            {board.map((e, i) => (
              <li key={e.uid} className={e.uid === myUid ? 'is-me' : ''}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <strong>{e.callsign || e.name} <small className="sgx-constellation__dots">{CONSTELLATION_ORDER.map((p) => (e.pillars.includes(p) ? '◆' : '·')).join('')}</small></strong>
                <b>{e.stars} ◆</b>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
};

export default SgxConstellation;
