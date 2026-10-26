import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePilotProfile } from '../context/PilotProfileContext';
import { navigateToSection } from '../immersion/navigation';
import { goToMission } from './missionNav';
import { bi, PILLAR_BY_KEY, SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { PILLAR_ACCENT } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { isDay3Open, missionsOfPillar, type ReactorMission } from './reactor';
import { SgxPassCard, usePassQr } from './SgxPassCard';
import { exportPassPdf } from './passPdf';
import { SgxConstellation } from './SgxConstellation';

/* HANGAR DEL PILOTO: the one screen for "me". It replaces the profile modal,
   the passport drawer and the passport modal. Pass in front, everything you
   did behind it: Reactor missions per pillar, Rolodex, Day 3 and telemetry. */

export type HangarTab = 'pass' | 'reactor' | 'stars' | 'rolodex' | 'day3' | 'log';

interface Props {
  onClose: () => void;
  onForge: () => void;
  initialTab?: HangarTab;
}

export const SgxHangar: React.FC<Props> = ({ onClose, onForge, initialTab = 'pass' }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { profile, leaderboard } = usePilotProfile();
  const { identity, isForged, missions, isDone, xpBalance, checkIn } = useSgxIdentity();
  const [tab, setTab] = useState<HangarTab>(initialTab);
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState('');
  const qr = usePassQr();
  const cardRef = useRef<HTMLDivElement>(null);
  const done = missions.filter((m) => isDone(m.id)).length;

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const goMission = (m: ReactorMission) => {
    playUiChirp(700);
    if (!m.go) return;
    onClose();
    goToMission(m);
  };

  const downloadPdf = () => {
    const svg = cardRef.current?.querySelector('.sgx-pass__portrait svg') as SVGSVGElement | null;
    exportPassPdf(identity, qr, `${profile.rankTitle} · LV ${profile.level}`, svg);
  };

  const copyCode = () => {
    if (!identity.pass) return;
    navigator.clipboard?.writeText(identity.pass.code).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const exportVcards = () => {
    const vcf = identity.contacts.map((c) => [
      'BEGIN:VCARD', 'VERSION:3.0', `FN:${c.name}`, c.organization ? `ORG:${c.organization}` : '', c.role ? `TITLE:${c.role}` : '',
      `NOTE:Spatialgineers Summit 2026 · ${c.callsign || c.code}${c.pillar ? ` · ${PILLAR_BY_KEY[c.pillar].name}` : ''}`, 'END:VCARD',
    ].filter(Boolean).join('\n')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard' }));
    a.download = 'sgx-rolodex.vcf';
    a.click();
  };

  const doCheckin = async () => {
    const r = await checkIn();
    setCheckinMsg({
      ok: es ? 'Check-in confirmado. Bienvenide a Chroma Space Studios.' : 'Checked in. Welcome to Chroma Space Studios.',
      already: es ? 'Ya hiciste check-in hoy.' : 'You already checked in today.',
      closed: es ? 'El check-in abre el Día 3 (13 de diciembre) en la entrada de Chroma Space Studios.' : 'Check-in opens on Day 3 (December 13) at the Chroma Space Studios entrance.',
      no_pass: es ? 'Primero forja tu SGX Pass.' : 'Forge your SGX Pass first.',
    }[r]);
  };

  const tabs: { id: HangarTab; label: string }[] = [
    { id: 'pass', label: es ? 'Pase' : 'Pass' },
    { id: 'reactor', label: `Reactor ${done}/${missions.length}` },
    { id: 'stars', label: `${es ? 'Constelación' : 'Constellation'} ${identity.contacts.length}★` },
    { id: 'rolodex', label: `Rolodex ${identity.contacts.length}` },
    { id: 'day3', label: es ? 'Día 3' : 'Day 3' },
    { id: 'log', label: es ? 'Telemetría' : 'Telemetry' },
  ];

  return (
    <div className="sgx-hangar" role="dialog" aria-modal="true" aria-label={es ? 'Hangar del piloto' : 'Pilot hangar'} onClick={onClose}>
      <div className="sgx-hangar__frame" onClick={(e) => e.stopPropagation()}>
        <header className="sgx-hangar__head">
          <div className="sgx-hangar__title">
            <img src="/brand/sgx-bolt.svg" alt="" />
            <div>
              <h2>{es ? 'Hangar del piloto' : 'Pilot hangar'}</h2>
              <p>{isForged ? `${identity.pass!.fullName} · ${identity.callsign}` : (es ? 'Sin pase todavía' : 'No pass yet')}</p>
            </div>
          </div>
          <div className="sgx-hangar__xp">
            <span><b>{profile.totalXp.toLocaleString('es-PR')}</b> XP</span>
            <span className="sgx-hangar__xp-sub">{xpBalance.toLocaleString('es-PR')} {es ? 'para gastar' : 'to spend'} · {profile.rankTitle}</span>
          </div>
          <button type="button" className="sgx-hangar__close" onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'}>✕</button>
        </header>

        <nav className="sgx-hangar__tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => { playUiChirp(560); setTab(t.id); }}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="sgx-hangar__body">
          {!isForged && tab !== 'reactor' && tab !== 'log' ? (
            <div className="sgx-hangar__empty">
              <h3>{es ? 'Forja tu SGX Pass' : 'Forge your SGX Pass'}</h3>
              <p>{es ? 'Un solo pase es tu registro, tu Holo Card, tu credencial, tu QR de networking y tu entrada del Día 3.' : 'One pass is your registration, Holo Card, credential, networking QR and Day 3 entrance.'}</p>
              <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={onForge}>[ ⚡ {es ? 'Forjar ahora' : 'Forge now'} ]</button></span>
            </div>
          ) : null}

          {isForged && tab === 'pass' && (
            <div className="sgx-hangar__pass">
              <div ref={cardRef}><SgxPassCard flipped={flipped} onFlip={() => { playUiChirp(480); setFlipped((f) => !f); }} /></div>
              <div className="sgx-hangar__actions">
                <button type="button" className="sgx-btn" onClick={downloadPdf}>{es ? 'Descargar PDF' : 'Download PDF'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={copyCode}>{copied ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar código' : 'Copy code')}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => { onClose(); window.setTimeout(() => window.dispatchEvent(new CustomEvent('sgx:open_avatar')), 80); }}>Avatar Studio</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={onForge}>{es ? 'Editar datos' : 'Edit details'}</button>
              </div>
              <div className="sgx-hangar__holo">
                {identity.holo?.image && <img src={identity.holo.image} alt={es ? 'Tu Holo Card' : 'Your Holo Card'} />}
                <div>
                  <h4>{identity.holo ? `Holo Card · ${identity.holo.role}` : 'Holo Card 3D'}</h4>
                  <p>
                    {identity.holo
                      ? (es ? 'Tu última Holo Card exportada. Lleva tu código de pase y, como visitante, el mismo QR en el reverso.' : 'Your last exported Holo Card. It carries your pass code and, as a visitor, the same QR on the back.')
                      : (es ? 'Crea tu credencial 3D como visitante, speaker, initiate o sponsor. Sale con tu nombre, foto y código del pase.' : 'Make your 3D credential as visitor, speaker, initiate or sponsor. It comes with your name, photo and pass code.')}
                  </p>
                  <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => { onClose(); window.setTimeout(() => window.dispatchEvent(new CustomEvent('sgx:open_credential_generator')), 80); }}>
                    {identity.holo ? (es ? 'Nueva Holo Card' : 'New Holo Card') : (es ? 'Abrir Holo Card Studio' : 'Open Holo Card Studio')}
                  </button>
                  {identity.holo?.image && (
                    <a className="sgx-btn sgx-btn--sm sgx-btn--ground" href={identity.holo.image} download={`sgx-holo-card-${identity.pass!.serial}.jpg`}>{es ? 'Descargar Holo Card' : 'Download Holo Card'}</a>
                  )}
                </div>
              </div>
              <p className="sgx-hangar__note">
                {es
                  ? 'El pase es tu registro, tu QR y tu entrada. El PDF es una copia del mismo pase, con el mismo QR. La Holo Card es su versión para compartir.'
                  : 'The pass is your registration, your QR and your entrance. The PDF is a copy of the same pass, with the same QR. The Holo Card is its shareable version.'}
              </p>
            </div>
          )}

          {tab === 'reactor' && (
            <div className="sgx-hangar__reactor">
              <div className="sgx-hangar__reactor-top">
                <p>{es ? 'Cada pilar tiene sus misiones. Complétalas todas y el pilar queda sellado en tu pase.' : 'Every pillar has its missions. Finish them all and the pillar is stamped on your pass.'}</p>
                <span className="sgx-glow"><button type="button" className="sgx-btn sgx-btn--sm" onClick={() => { onClose(); window.setTimeout(() => window.dispatchEvent(new CustomEvent('sgx:open_rewards')), 80); }}>
                  {es ? `Tienda del Reactor · ${xpBalance} XP` : `Reactor store · ${xpBalance} XP`}
                </button></span>
              </div>
              <div className="sgx-hangar__pillars">
                {SGX_PILLARS.map((p) => {
                  const list = missionsOfPillar(missions, p.key);
                  const stamped = !!identity.stamps[`pillar:${p.key}`];
                  const hasSponsor = list.some((m) => 'sponsor' in m.trigger);
                  return (
                    <section key={p.key} className={`sgx-hangar__pillar ${stamped ? 'is-stamped' : ''}`} style={{ ['--pillar-accent' as string]: PILLAR_ACCENT[p.key as PillarKey] }}>
                      <header>
                        <img src={p.iconUrl} alt="" />
                        <div>
                          <h4>{p.name}</h4>
                          <p>{bi(p.title, language)}</p>
                        </div>
                        <span className="sgx-hangar__stamp">{stamped ? (es ? 'SELLADO' : 'STAMPED') : `${list.filter((m) => isDone(m.id)).length}/${list.length}`}</span>
                      </header>
                      <ul>
                        {list.map((m) => {
                          const ok = isDone(m.id);
                          const copy = es ? m.es : m.en;
                          return (
                            <li key={m.id} className={ok ? 'is-done' : ''}>
                              <span className="sgx-hangar__check" aria-hidden="true">{ok ? '◆' : '◇'}</span>
                              <div>
                                <strong>{m.secret && !ok ? '???' : copy.title}{m.day3 ? (es ? ' · Día 3' : ' · Day 3') : ''}</strong>
                                <small>{copy.hint}</small>
                              </div>
                              <span className="sgx-hangar__mxp">+{m.xp}</span>
                              {!ok && m.go && <button type="button" className="sgx-hangar__go" onClick={() => goMission(m)}>{es ? 'Ir' : 'Go'} →</button>}
                            </li>
                          );
                        })}
                        {p.key === 'SHOWCASE' && !hasSponsor && (
                          <li className="sgx-hangar__slot">
                            <span className="sgx-hangar__check" aria-hidden="true">▣</span>
                            <div>
                              <strong>{es ? 'Reto de partner' : 'Partner challenge'}</strong>
                              <small>{es ? 'Los partners Tier 3 en adelante traen su propio reto y sello. Se activa al confirmarse.' : 'Tier 3+ partners bring their own challenge and stamp. It switches on once confirmed.'}</small>
                            </div>
                          </li>
                        )}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </div>
          )}

          {isForged && tab === 'stars' && (
            <SgxConstellation onScan={() => { onClose(); window.setTimeout(() => window.dispatchEvent(new CustomEvent('sgx:open_qr_scanner')), 80); }} />
          )}

          {isForged && tab === 'rolodex' && (
            <div className="sgx-hangar__rolodex">
              <div className="sgx-hangar__actions">
                <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={() => { onClose(); window.setTimeout(() => window.dispatchEvent(new CustomEvent('sgx:open_qr_scanner')), 80); }}>
                  {es ? 'Escanear un pase' : 'Scan a pass'}
                </button></span>
                {identity.contacts.length > 0 && <button type="button" className="sgx-btn sgx-btn--ground" onClick={exportVcards}>{es ? 'Exportar vCard' : 'Export vCard'}</button>}
              </div>
              <p className="sgx-hangar__note">
                {es
                  ? 'Cuando escaneas el pase de alguien, tú quedas en su Rolodex y esa persona en el tuyo. También puedes mostrar tu QR desde la pestaña Pase.'
                  : "When you scan someone's pass, you land in their Rolodex and they land in yours. You can also show your QR from the Pass tab."}
              </p>
              {identity.contacts.length === 0 ? (
                <div className="sgx-hangar__empty sgx-hangar__empty--sm">{es ? 'Tu Rolodex está vacío. El Día 3 se llena solo.' : 'Your Rolodex is empty. Day 3 fills it up.'}</div>
              ) : (
                <ul className="sgx-hangar__contacts">
                  {identity.contacts.map((c) => (
                    <li key={c.code + c.at}>
                      <div className="sgx-hangar__cav" style={{ ['--pillar-accent' as string]: c.pillar ? PILLAR_ACCENT[c.pillar] : '#00DDFF' }}>{c.name.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <strong>{c.name}</strong>
                        <small>{[c.callsign, c.role, c.organization].filter(Boolean).join(' · ')}</small>
                      </div>
                      <span className="sgx-hangar__via">{c.via === 'received' ? (es ? 'te escaneó' : 'scanned you') : (es ? 'escaneado' : 'scanned')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isForged && tab === 'day3' && (
            <div className="sgx-hangar__day3">
              <div className="sgx-hangar__bigqr">
                {qr && <img src={qr} alt={es ? 'QR de tu pase' : 'Your pass QR'} />}
                <code>{identity.pass!.code}</code>
              </div>
              <div className="sgx-hangar__day3-info">
                <h3>{es ? 'Tu pase es la llave del Día 3' : 'Your pass is the Day 3 key'}</h3>
                <ol>
                  <li><b>{es ? 'Entrada' : 'Entrance'}</b> · {es ? 'Escanea el QR de check-in en la puerta de Chroma Space Studios. Tu municipio se enciende en el radar.' : 'Scan the check-in QR at the Chroma Space Studios door. Your municipality lights up on the radar.'}</li>
                  <li><b>Networking</b> · {es ? 'Bloque de 1:00 a 2:00 PM: muestra este QR y escanea otros pases. El intercambio queda en los dos Rolodex.' : '1:00–2:00 PM block: show this QR and scan other passes. The exchange lands in both Rolodexes.'}</li>
                  <li><b>{es ? 'Premios' : 'Prizes'}</b> · {es ? 'El staff verifica tu pase y tus códigos de canje.' : 'Staff checks your pass and your redemption codes.'}</li>
                </ol>
                <div className="sgx-hangar__checkin">
                  {identity.stamps['chroma:checkin'] ? (
                    <span className="sgx-hangar__stamp is-big">◆ {es ? 'PRESENTE EN CHROMA' : 'PRESENT AT CHROMA'}</span>
                  ) : (
                    <button type="button" className="sgx-btn" onClick={doCheckin} disabled={!isDay3Open()}>
                      {isDay3Open() ? (es ? 'Hacer check-in' : 'Check in') : (es ? 'Check-in abre el 13 de diciembre' : 'Check-in opens December 13')}
                    </button>
                  )}
                  {checkinMsg && <p role="status">{checkinMsg}</p>}
                </div>
                {identity.redemptions.length > 0 && (
                  <div className="sgx-hangar__vouchers">
                    <h4>{es ? 'Códigos de canje' : 'Redemption codes'}</h4>
                    <ul>
                      {identity.redemptions.map((r) => (
                        <li key={r.voucher}><span>{r.title}</span><code>{r.voucher}</code></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'log' && (
            <div className="sgx-hangar__log">
              <section>
                <h4>{es ? 'Bitácora' : 'Log'}</h4>
                <ul className="sgx-hangar__activity">
                  {profile.weekendActivity.slice(0, 14).map((a) => (
                    <li key={a.id}>
                      <span className="sgx-hangar__mxp" style={{ color: a.highlightColor }}>{a.xpEarned >= 0 ? '+' : ''}{a.xpEarned}</span>
                      <div><strong>{a.title}</strong><small>{a.details}</small></div>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h4>{es ? 'Leaderboard de pilotos' : 'Pilot leaderboard'}</h4>
                {leaderboard.length === 0 ? (
                  <p className="sgx-hangar__note">{es ? 'Todavía no hay pilotos en el ranking.' : 'No pilots ranked yet.'}</p>
                ) : (
                  <ol className="sgx-hangar__board">
                    {leaderboard.slice(0, 10).map((e, i) => (
                      <li key={e.uid} className={e.uid === profile.uid ? 'is-me' : ''}>
                        <span>{String(i + 1).padStart(2, '0')}</span><strong>{e.nickname}</strong><b>{e.totalXp.toLocaleString('es-PR')}</b>
                      </li>
                    ))}
                  </ol>
                )}
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => { onClose(); navigateToSection('VISITS'); }}>
                  {es ? 'Ver radar de visitas' : 'Open visit radar'}
                </button>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SgxHangar;
