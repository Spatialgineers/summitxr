import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PILLAR_BY_KEY } from '../lib/sgxPillars';
import { PILLAR_ACCENT } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { CONSTELLATION_ORDER, constellationPillars, layoutStars } from './constellation';
import { subscribeConstellationBoard, type ConstellationEntry } from './passNetwork';

/* CONSTELACIÓN: your Rolodex as a star map. You are the center; every pass
   you swapped is a star in its pillar's sector, and stars of the same pillar
   join into a constellation. Link all 6 sectors for the secret stamp. */

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
      <div className="sgx-constellation__map">
        <svg viewBox="0 0 1000 1000" role="img" aria-label={es ? 'Mapa de tu constelación' : 'Your constellation map'}>
          <defs>
            <radialGradient id="sgx-cst-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#32527B" stopOpacity="0.35" />
              <stop offset="1" stopColor="#050505" stopOpacity="0" />
            </radialGradient>
            <filter id="sgx-cst-glow"><feGaussianBlur stdDeviation="6" /></filter>
          </defs>
          <circle cx="500" cy="500" r="500" fill="url(#sgx-cst-bg)" />
          {[160, 300, 440].map((r) => <circle key={r} cx="500" cy="500" r={r} className="sgx-constellation__ring" />)}

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
                <circle cx={s.x} cy={s.y} r="24" className="sgx-constellation__halo" filter="url(#sgx-cst-glow)" />
                <circle cx={s.x} cy={s.y} r={s.contact.via === 'received' ? 9 : 11} className="sgx-constellation__core" />
                {stars.length <= 18 && <text x={s.x} y={s.y + 36} textAnchor="middle">{s.contact.name.split(/\s+/)[0]}</text>}
              </g>
            );
          })}

          <g className="sgx-constellation__me" style={{ ['--pillar-accent' as string]: meAccent }}>
            <circle cx="500" cy="500" r="34" className="sgx-constellation__halo" filter="url(#sgx-cst-glow)" />
            <path d="M500 470 L510 495 L536 500 L510 505 L500 530 L490 505 L464 500 L490 495 Z" className="sgx-constellation__core" />
            <text x="500" y="560" textAnchor="middle">{identity.callsign || (es ? 'TÚ' : 'YOU')}</text>
          </g>
        </svg>
        {stars.length === 0 && (
          <div className="sgx-constellation__empty">
            <p>{es ? 'Tu cielo está vacío. Cada pase que intercambies enciende una estrella en el sector de su pilar.' : 'Your sky is empty. Every pass you swap lights a star in its pillar sector.'}</p>
            {onScan && <button type="button" className="sgx-btn" onClick={onScan}>{es ? 'Escanear un pase' : 'Scan a pass'}</button>}
          </div>
        )}
      </div>

      <aside className="sgx-constellation__side">
        <dl className="sgx-constellation__stats">
          <div><dt>{es ? 'Estrellas' : 'Stars'}</dt><dd>{stars.length}</dd></div>
          <div><dt>{es ? 'Sectores' : 'Sectors'}</dt><dd>{covered.length}/6</dd></div>
          <div className={complete ? 'is-on' : ''}><dt>{es ? 'Secreto' : 'Secret'}</dt><dd>{complete ? '◆' : '???'}</dd></div>
        </dl>
        <p className="sgx-hangar__note">
          {es
            ? 'Tu pilar ya cuenta como el primer sector. Conecta con pilotos de los demás pilares para completar la constelación. Al tablero público solo llegan los números, nunca los nombres de tus contactos.'
            : 'Your own pillar already counts as the first sector. Link pilots from the other pillars to complete the constellation. The public board only gets the numbers, never your contacts’ names.'}
        </p>
        <h4>{es ? 'Constelaciones más grandes' : 'Biggest constellations'}</h4>
        {board === undefined ? (
          <p className="sgx-hangar__note">…</p>
        ) : !board || board.length === 0 ? (
          <p className="sgx-hangar__note">{es ? 'Nadie ha encendido su cielo todavía. El Día 3 se llena.' : 'Nobody has lit their sky yet. Day 3 fills it.'}</p>
        ) : (
          <ol className="sgx-hangar__board">
            {board.map((e, i) => (
              <li key={e.uid} className={e.uid === myUid ? 'is-me' : ''}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <strong>{e.callsign || e.name} <small className="sgx-constellation__dots">{CONSTELLATION_ORDER.map((p) => (e.pillars.includes(p) ? '◆' : '·')).join('')}</small></strong>
                <b>{e.stars}★</b>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
};

export default SgxConstellation;
