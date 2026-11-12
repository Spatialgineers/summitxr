import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLite } from '../lib/lite';
import { useHoloCredentials, ROLE_COPY } from './credentials';
import { configFromSeed } from './pilotAvatar';
import { useLanguage } from '../context/LanguageContext';
import { rankLabel, usePilotProfile } from '../context/PilotProfileContext';
import { navigateToSection } from '../immersion/navigation';
import { goToMission, missionPlace } from './missionNav';
import { bi, PILLAR_BY_KEY, SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { PILLAR_ACCENT } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { isDay3Open, missionsOfPillar, type ReactorMission } from './reactor';
import { usePassQr } from './usePassQr';
import { SgxPassBoard } from './SgxPassSection';
import { SgxPilotGlyph } from './SgxPilotGlyph';
import { SgxConstellation } from './SgxConstellation';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { SgxDialog } from '../components/common/SgxDialog';
import { LeadFlag } from '../components/admin/LeadFlag';
import './SgxStudio.css';
import { DEADLINE_COPY } from '../lib/summitDeadlines';

const SgxPilot3D = lazy(() => import('./SgxPilot3D').then((m) => ({ default: m.SgxPilot3D })));
const SgxStudioRoom = lazy(() => import('./studioRoom/SgxStudioRoom').then((m) => ({ default: m.SgxStudioRoom })));
const CompanionStudio = lazy(() => import('../companion/CompanionStudio').then((m) => ({ default: m.CompanionStudio })));

/* TU ESTUDIO: the one screen for "me". It replaces the profile modal,
   the passport drawer and the passport modal. Pass in front, everything you
   did behind it: Reactor missions per pillar, Rolodex, Day 3 and telemetry.
   The Pass tab is the same board as the SGX Pass section (SgxPassBoard). */

export type HangarTab = 'room' | 'pass' | 'bot' | 'reactor' | 'stars' | 'rolodex' | 'day3' | 'log';

interface Props {
  onClose: () => void;
  onForge: () => void;
  initialTab?: HangarTab;
  /** Rendered as the SGX Pass page (no dialog): the page banner carries the title. */
  asPage?: boolean;
  /** Just the Mission Reactor, as a pop-up: missions per pillar with their quick links. */
  reactorOnly?: boolean;
}

/** Page frame with the dialog's slots, so the Studio reads like the other sections. */
const PageShell: React.FC<{ headerExtra?: React.ReactNode; toolbar?: React.ReactNode; className?: string; children: React.ReactNode } & Record<string, unknown>> = ({ headerExtra, toolbar, className, children }) => (
  <section className={`${className || ''} sgx-studio--page`}>
    <div className="sgx-studio__pagebar">{toolbar}{headerExtra}</div>
    <div className="sgx-studio__pagebody">{children}</div>
  </section>
);

export const SgxHangar: React.FC<Props> = ({ onClose, onForge, initialTab = 'pass', asPage = false, reactorOnly = false }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { profile, leaderboard } = usePilotProfile();
  const liveXp = useMemo(
    () => profile.weekendActivity
      .filter((a) => a.category === 'stage_cyoa' || a.category === 'trivia_vote' || a.category === 'keynote_reaction')
      .reduce((sum, a) => sum + (a.xpEarned || 0), 0),
    [profile.weekendActivity],
  );
  const { identity, isForged, missions, isDone, xpBalance, checkIn } = useSgxIdentity();
  const { user, logout } = useAuth();
  const googleEmail = user && !user.isAnonymous ? user.email : null;
  const [tab, setTab] = useState<HangarTab>(reactorOnly ? 'reactor' : initialTab);
  const lite = useLite();
  // As a page, Tu Estudio IS the 3D room: each part of it opens as a panel over the room.
  // In Lite Mode (no 3D) it keeps the classic tabs.
  const immersive = asPage && !reactorOnly && !lite;
  // Day 3 now lives inside Mi SGX Pass; without the room there is no 'room' view
  const view: HangarTab = tab === 'day3' ? 'pass' : (tab === 'room' && !immersive ? 'pass' : tab);
  const { credentials } = useHoloCredentials();
  const official = (['speaker', 'sponsor', 'press', 'initiate'] as const).find((r) => credentials.some((c) => c.role === r && c.status === 'official'));
  const inReview = credentials.filter((c) => c.role !== 'visitor' && c.status === 'review').length;
  const [copied, setCopied] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState('');
  const qr = usePassQr();
  const cardRef = useRef<HTMLDivElement>(null);
  const done = missions.filter((m) => isDone(m.id)).length;

  useEffect(() => { if (!reactorOnly) setTab(initialTab); }, [initialTab, reactorOnly]);
  // 'day3' opens Mi SGX Pass at its Day 3 part
  useEffect(() => {
    if (tab !== 'day3') return;
    const t = window.setTimeout(() => document.getElementById('sgx-pass-day3')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    return () => window.clearTimeout(t);
  }, [tab]);
  // Escape closes the panel and leaves you in the room
  useEffect(() => {
    if (!immersive || view === 'room') return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setTab('room'); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [immersive, view]);
  useEffect(() => {
    if (reactorOnly) return;
    const onTab = (e: Event) => { const t = (e as CustomEvent<{ tab?: HangarTab }>).detail?.tab; if (t) setTab(t); };
    window.addEventListener('sgx:studio_tab', onTab);
    return () => window.removeEventListener('sgx:studio_tab', onTab);
  }, []);

  const goMission = (m: ReactorMission) => {
    playUiChirp(700);
    if (!m.go) return;
    onClose();
    goToMission(m);
  };

  // jsPDF loads only when someone asks for the PDF.
  const downloadPdf = async () => {
    const svg = cardRef.current?.querySelector('svg') as SVGSVGElement | null;
    const { exportPassPdf } = await import('./passPdf');
    exportPassPdf(identity, qr, `${rankLabel(profile.level, es)} · LV ${profile.level}`, svg);
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
      need_code: es ? 'Escanea el QR de la entrada de Chroma Space Studios para hacer check-in.' : 'Scan the QR code at the Chroma Space Studios entrance to check in.',
      invalid: es ? 'No pudimos confirmar el check-in. Vuelve a escanear el QR de la entrada o pide ayuda al equipo.' : 'We could not confirm your check-in. Scan the entrance QR again or ask the team for help.',
    }[r]);
  };

  const tabs: { id: HangarTab; label: string }[] = [
    { id: 'pass', label: es ? 'Mi SGX Pass' : 'My SGX Pass' },
    { id: 'bot', label: es ? 'Tu Highbot' : 'Your Highbot' },
    { id: 'reactor', label: `Reactor ${done}/${missions.length}` },
    { id: 'log', label: es ? 'Bitácora' : 'Log' },
    { id: 'rolodex', label: `Rolodex ${identity.contacts.length}` },
    { id: 'stars', label: `${es ? 'Red' : 'Network'} ${identity.contacts.length}` },
  ];
  // the panels over the room, grouped the way the stations are
  const SHEETS: Array<{ ids: HangarTab[]; es: string; en: string }> = [
    { ids: ['pass'], es: 'Mi SGX Pass', en: 'My SGX Pass' },
    { ids: ['bot'], es: 'Tu Highbot', en: 'Your Highbot' },
    { ids: ['reactor', 'log'], es: 'Misiones y bitácora', en: 'Missions and log' },
    { ids: ['rolodex', 'stars'], es: 'Tus conexiones', en: 'Your connections' },
  ];
  const sheet = SHEETS.find((g) => g.ids.includes(view)) || SHEETS[0];

  const scan = () => { onClose(); window.setTimeout(() => window.dispatchEvent(new CustomEvent('sgx:open_qr_scanner')), 80); };

  const Shell = (asPage ? PageShell : SgxDialog) as React.FC<any>;

  const panels = (
    <>
                    {!isForged && view !== 'reactor' && view !== 'log' && view !== 'bot' && view !== 'room' ? (
            <div className="sgx-hangar__empty">
              <h3>{es ? 'Forja tu SGX Pass' : 'Forge your SGX Pass'}</h3>
              <p>{es ? 'Tu Holo Card, tu QR de networking y tu entrada del Día 3. Toma un minuto.' : 'Your Holo Card, your networking QR and your Day 3 entrance. It takes a minute.'}</p>
              <span className="sgx-glow"><button type="button" className="sgx-btn" data-guide="forjar" onClick={onForge}>[ ⚡ {es ? 'Forjar ahora' : 'Forge now'} ]</button></span>
            </div>
          ) : null}

          {isForged && view === 'pass' && (
            <div className="sgx-studio__pass">
              {/* Mi SGX Pass: everything about you in one place, at a glance first */}
              <dl className="sgx-dossier">
                <div><dt>{es ? 'Rol' : 'Role'}</dt><dd>{official ? (es ? ROLE_COPY[official].label[0] : ROLE_COPY[official].label[1]).toUpperCase() : (es ? 'CREADOR' : 'CREATOR')}</dd></div>
                <div><dt>{es ? 'Solicitudes' : 'Requests'}</dt><dd>{inReview ? (es ? `${inReview} en revisión` : `${inReview} in review`) : (es ? 'Ninguna abierta' : 'None open')}</dd></div>
                <div><dt>{es ? 'Día 3' : 'Day 3'}</dt><dd>{identity.stamps['chroma:checkin'] ? (es ? 'Presente' : 'Present') : identity.pass?.tier === 'SHOWCASE' ? (es ? 'Solicitado' : 'Requested') : (es ? 'Digital' : 'Digital')}</dd></div>
                <div><dt>{es ? 'Conexiones' : 'Connections'}</dt><dd>{identity.contacts.length}</dd></div>
                <div><dt>XP</dt><dd>{profile.totalXp.toLocaleString('es-PR')} · LV {profile.level}</dd></div>
              </dl>
              {/* Same board as the SGX Pass section: tap the card to see the back with the event and your QR. */}
              <SgxPassBoard
                onClose={onClose}
                actions={(
                  <>
                    <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={downloadPdf}>{es ? 'Pase en PDF' : 'Pass as PDF'}</button></span>
                    <button type="button" className="sgx-btn sgx-btn--ground" onClick={copyCode}>{copied ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar código' : 'Copy code')}</button>
                    <button type="button" className="sgx-btn sgx-btn--ground" onClick={scan}>{es ? 'Escanear pase' : 'Scan pass'}</button>
                  </>
                )}
              />
              <div ref={cardRef} hidden aria-hidden="true">
                <SgxPilotGlyph seed={identity.avatar.seed} config={identity.avatar.pilot} accent={identity.affinity ? PILLAR_ACCENT[identity.affinity] : '#FDCC0D'} size={300} />
              </div>
              <div className="sgx-studio__extras">
                {!immersive && <section className="sgx-panel sgx-studio__avatar3d" aria-label={es ? 'Tu Highbot en 3D' : 'Your Highbot in 3D'}>
                  <div>
                    <h3 className="sgx-panel__title">{es ? 'Tu Highbot' : 'Your Highbot'}</h3>
                    <p className="sgx-studio__text">{es ? 'El mismo de tu Holo Card, en 3D. Arrástralo para girarlo; también aparece junto al núcleo.' : 'The one on your Holo Card, in 3D. Drag to turn it; it also appears next to the core.'}</p>
                  </div>
                  <Suspense fallback={<div className="sgx-studio__wait">{es ? 'Cargando 3D…' : 'Loading 3D…'}</div>}>
                    <SgxPilot3D
                      config={identity.avatar.pilot || configFromSeed(identity.avatar.seed, identity.affinity ? PILLAR_ACCENT[identity.affinity] : '#FDCC0D')}
                      height={220}
                      label={es ? 'Tu Highbot en 3D. Arrastra para girarlo.' : 'Your Highbot in 3D. Drag to turn it.'}
                    />
                  </Suspense>
                </section>}
                <section className="sgx-panel sgx-studio__live">
                  <h3 className="sgx-panel__title">SGX Live</h3>
                  <p className="sgx-studio__text">
                    {es
                      ? 'Tu perfil de jugador vive en este pase: tu callsign sale en el escenario y cada voto y reacción suma XP aquí.'
                      : 'Your player profile lives on this pass: your callsign shows on the stage and every vote and reaction adds XP here.'}
                  </p>
                  <dl>
                    <div><dt>{es ? 'Votos' : 'Votes'}</dt><dd>{profile.weekendStats.votesSubmitted}</dd></div>
                    <div><dt>{es ? 'Reacciones' : 'Reactions'}</dt><dd>{profile.weekendStats.reactionsSent}</dd></div>
                    <div><dt>{es ? 'XP en vivo' : 'Live XP'}</dt><dd>{liveXp.toLocaleString('es-PR')}</dd></div>
                  </dl>
                  <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('sgx:navigate_page', { detail: { page: 'play' } })); }}>
                    {es ? 'Ir a SGX Live' : 'Go to SGX Live'} →
                  </button>
                </section>
              </div>
              <p className="sgx-hangar__note">
                {es
                  ? 'Tu Holo Card es tu pase: tu registro, tu QR (en el reverso) y tu entrada del Día 3. Tócala para voltearla. El PDF es una copia con el mismo QR.'
                  : 'Your Holo Card is your pass: your registration, your QR (on the back) and your Day 3 entrance. Tap it to flip it. The PDF is a copy with the same QR.'}
              </p>
            </div>
          )}

          {view === 'bot' && (
            <Suspense fallback={<div className="sgx-studio__wait">{es ? 'Despertando a tu Highbot…' : 'Waking up your Highbot…'}</div>}>
              <CompanionStudio />
            </Suspense>
          )}

          {view === 'reactor' && (
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
                            <li key={m.id} className={`${ok ? 'is-done' : ''} ${m.go ? 'is-go' : ''}`} onClick={m.go ? () => goMission(m) : undefined}>
                              <span className="sgx-hangar__check" aria-hidden="true">{ok ? '◆' : '◇'}</span>
                              <div>
                                <strong>{m.secret && !ok ? '???' : copy.title}{m.day3 ? (es ? ' · Día 3' : ' · Day 3') : ''}</strong>
                                <small>{copy.hint}</small>
                              </div>
                              <span className="sgx-hangar__mxp">+{m.xp}</span>
                              {m.go && <button type="button" className="sgx-hangar__go" onClick={(e) => { e.stopPropagation(); goMission(m); }} aria-label={`${copy.title}: ${es ? 'ir a' : 'go to'} ${missionPlace(m, es)}`}>{missionPlace(m, es)} →</button>}
                              {!m.go && m.day3 && <span className="sgx-hangar__where">{es ? 'Día 3 · Chroma' : 'Day 3 · Chroma'}</span>}
                            </li>
                          );
                        })}
                        {p.key === 'SHOWCASE' && !hasSponsor && (
                          <li className="sgx-hangar__slot">
                            <span className="sgx-hangar__check" aria-hidden="true">▣</span>
                            <div>
                              <strong>{es ? 'Reto de partner' : 'Partner challenge'}</strong>
                              <small>{es ? 'Los partners Paquete 3 en adelante traen su propio reto y sello. Se activa al confirmarse.' : 'Package 3+ partners bring their own challenge and stamp. It switches on once confirmed.'}</small>
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

          {isForged && view === 'stars' && (
            <SgxConstellation onScan={scan} />
          )}

          {isForged && view === 'rolodex' && (
            <div className="sgx-hangar__rolodex">
              <div className="sgx-hangar__actions">
                <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={scan}>
                  {es ? 'Escanear un pase' : 'Scan a pass'}
                </button></span>
                {identity.contacts.length > 0 && <button type="button" className="sgx-btn sgx-btn--ground" onClick={exportVcards}>{es ? 'Exportar vCard' : 'Export vCard'}</button>}
              </div>
              <p className="sgx-hangar__note">
                {es
                  ? 'Cuando escaneas el pase de alguien, tú quedas en su Rolodex y esa persona en el tuyo. También puedes mostrar tu QR desde Mi SGX Pass.'
                  : "When you scan someone's pass, you land in their Rolodex and they land in yours. You can also show your QR from My SGX Pass."}
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
                      {/* team only: mark this person for the follow-up after the event */}
                      <LeadFlag compact lead={{ kind: 'visitor', ref: c.code, name: c.name, organization: c.organization, role: c.role, pillar: c.pillar, source: 'rolodex' }} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isForged && view === 'pass' && (
            <div className="sgx-hangar__day3" id="sgx-pass-day3">
              <div className="sgx-hangar__bigqr">
                {qr && <img src={qr} alt={es ? 'QR de tu pase' : 'Your pass QR'} />}
                <code>{identity.pass!.code}</code>
              </div>
              <div className="sgx-hangar__day3-info">
                <h3>{es ? 'Tu pase es la llave del Día 3' : 'Your pass is the Day 3 key'}</h3>
                <p>{es ? DEADLINE_COPY.day3Invitations.es : DEADLINE_COPY.day3Invitations.en} {es ? 'Si te invitan, este mismo pase es tu entrada.' : 'If you are invited, this same pass is your entrance.'}</p>
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

          {/* Cuenta: the Google sign-in, last part of Mi SGX Pass */}
          {!reactorOnly && view === 'pass' && <div className={`sgx-hangar__account ${googleEmail ? 'is-linked' : ''}`}>
            {googleEmail ? (
              <>
                <p>{es ? 'Cuenta conectada' : 'Account connected'} · <strong>{googleEmail}</strong></p>
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => { playUiChirp(420); logout(); }}>{es ? 'Cerrar sesión' : 'Sign out'}</button>
              </>
            ) : (
              <>
                <p>{es ? 'Inicia sesión con Google para guardar tu progreso en tu cuenta.' : 'Sign in with Google to save your progress to your account.'}</p>
                <GoogleSignInButton variant="compact" buttonText={es ? 'Iniciar con Google' : 'Sign in with Google'} />
              </>
            )}
          </div>}
          {view === 'log' && (
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
                <h4>{es ? 'Leaderboard de creadores' : 'Creator leaderboard'}</h4>
                {leaderboard.length === 0 ? (
                  <p className="sgx-hangar__note">{es ? 'Todavía no hay creadores en el ranking.' : 'No creators ranked yet.'}</p>
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
    </>
  );

  return (
    <Shell
      onClose={onClose}
      size="lg"
      className="sgx-studio"
      icon={<img src="/brand/sgx-bolt.svg" alt="" />}
      title={reactorOnly ? (es ? 'Reactor de misiones' : 'Mission reactor') : (es ? 'Tu Estudio' : 'Your Studio')}
      kicker={reactorOnly ? `${done}/${missions.length} ${es ? 'misiones · toca una para ir' : 'missions · tap one to go'}` : isForged ? `${identity.pass!.fullName} · ${identity.callsign}` : (es ? 'Sin pase todavía' : 'No pass yet')}
      headerExtra={(
        <div className="sgx-hangar__xp">
          <span><b>{profile.totalXp.toLocaleString('es-PR')}</b> XP</span>
          <span className="sgx-hangar__xp-sub">{xpBalance.toLocaleString('es-PR')} {es ? 'para gastar' : 'to spend'} · {rankLabel(profile.level, es)}</span>
        </div>
      )}
      toolbar={reactorOnly || immersive ? undefined : (
        <nav className="sgx-studio__tabs" role="tablist" aria-label={es ? 'Secciones de tu Estudio' : 'Studio sections'}>
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" data-guide={`estudio-${t.id}`} aria-selected={view === t.id} className={view === t.id ? 'is-on' : ''} onClick={() => { playUiChirp(560); setTab(t.id); }}>
              {t.label}
            </button>
          ))}
        </nav>
      )}
    >
      {immersive ? (
        <>
          <Suspense fallback={null}><SgxStudioRoom embedded /></Suspense>
          {view !== 'room' && createPortal(
            <aside className="sgx-sheet sgx-studio" role="region" aria-label={es ? sheet.es : sheet.en}>
              <header className="sgx-sheet__head">
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => { playUiChirp(420); setTab('room'); }}>← {es ? 'Al cuarto' : 'To the room'}</button>
                <strong>{es ? sheet.es : sheet.en}</strong>
                {sheet.ids.length > 1 && (
                  <nav role="tablist" className="sgx-sheet__tabs">
                    {sheet.ids.map((id) => {
                      const t = tabs.find((x) => x.id === id)!;
                      return <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? 'is-on' : ''} onClick={() => { playUiChirp(560); setTab(id); }}>{t.label}</button>;
                    })}
                  </nav>
                )}
              </header>
              <div className="sgx-sheet__body">{panels}</div>
            </aside>,
            document.body,
          )}
        </>
      ) : panels}
    </Shell>
  );
};

export default SgxHangar;
