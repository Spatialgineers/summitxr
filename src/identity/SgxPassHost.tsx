import React, { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { LazyBoundary } from '../components/common/LazyBoundary';
import { LazyFallback } from '../components/common/LazyFallback';
import { useLanguage } from '../context/LanguageContext';
import { usePilotProfile } from '../context/PilotProfileContext';
import { PILLAR_BY_KEY } from '../lib/sgxPillars';
import { playScanSuccessSound } from '../lib/cyberAudioEngine';
import { parsePassQr, PILLAR_ACCENT, type PassQrPayload, type PassTier } from './sgxIdentity';
import { CHECKIN_CODE_KEY, useSgxIdentity, type CheckinResult } from './SgxIdentityContext';
import { useImmersion } from '../immersion/ImmersionContext';
import type { HangarTab } from './SgxHangar';
import { SgxPilotGlyph } from './SgxPilotGlyph';
import { FORGE_AFTER_SWITCH, SIGNED_IN_EVENT } from './accountSlots';

// The pass surfaces download the first time they open.
const SgxForge = lazy(() => import('./SgxForge').then((m) => ({ default: m.SgxForge })));
const SgxHangar = lazy(() => import('./SgxHangar').then((m) => ({ default: m.SgxHangar })));
const SgxHoloCardGeneratorModal = lazy(() => import('../components/summit/SgxHoloCardGeneratorModal').then((m) => ({ default: m.SgxHoloCardGeneratorModal })));
const SgxHoloViewer = lazy(() => import('./SgxHoloViewer').then((m) => ({ default: m.SgxHoloViewer })));
const PilotBuilderModal = lazy(() => import('./PilotBuilderModal').then((m) => ({ default: m.PilotBuilderModal })));

/** Warm the pass chunks once the page is idle, so the first tap opens instantly. */
function prefetchPassSurfaces() {
  const go = () => { import('./SgxForge'); import('./SgxHangar'); };
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 6000 });
  else window.setTimeout(go, 3000);
}
import type { CredentialRole, HoloCredential } from './credentials';

/* Global owner of the identity surfaces. Every legacy entry point (taquilla,
   passport, profile, drawer, tours, credential generator, role selector)
   lands here and becomes either the Forge or your Studio. Also handles the
   two links the pass QR world produces: ?pase=… (someone's pass) and
   ?checkin=<code> (the Day 3 entrance poster; the code is set in the admin). */

const FORGE_DISMISSED = 'sgx_forge_dismissed';

/** Events that used to open their own modals; they all resolve here now. */
export const IDENTITY_ENTRY_EVENTS = [
  'sgx:open_forge', 'sgx:open_hangar', 'sgx:open_tickets', 'sgx:open_ticket', 'sgx:open_passport',
  'sgx:open_profile_drawer', 'sgx:open_tour',
];

function stripParam(name: string) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(name);
    url.searchParams.delete('checkinTest');
    window.history.replaceState(window.history.state, '', url.toString());
  } catch { /* ignore */ }
}

/** `quiet`: venue screens (stage, multiview) never show the forge nudge. */
export const SgxPassHost: React.FC<{ quiet?: boolean }> = ({ quiet = false }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { isProfileModalOpen, setIsProfileModalOpen, isRoleModalOpen, setIsRoleModalOpen } = usePilotProfile();
  const { isForged, addContact, checkIn, identity, myUid } = useSgxIdentity();
  useEffect(() => { if (!quiet) prefetchPassSurfaces(); }, [quiet]);
  const { pushToast } = useImmersion();
  // Holo Card Studio (visitante / speaker / initiate / sponsor), prefilled from the pass.
  const [holo, setHolo] = useState<{ role?: CredentialRole; n: number } | null>(null);
  const [viewCard, setViewCard] = useState<HoloCredential | null>(null);
  const [pilotStudio, setPilotStudio] = useState(false);
  const [forge, setForge] = useState<{ tier: PassTier } | null>(null);
  const [hangar, setHangar] = useState<HangarTab | null>(null);
  const [incoming, setIncoming] = useState<PassQrPayload | null>(null);
  const [incomingResult, setIncomingResult] = useState<string>('');
  const forgedRef = useRef(isForged);
  forgedRef.current = isForged;
  const pendingCheckin = useRef(false);
  const rehearsalRef = useRef(false);
  const pendingContact = useRef<PassQrPayload | null>(null);

  const openHangarOrForge = useCallback((tab: HangarTab, tier: PassTier = 'DIGITAL') => {
    if (forgedRef.current) { setForge(null); setHangar(tab); }
    else { setHangar(null); setForge({ tier }); }
  }, []);

  // Every old entry point, one router.
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ tab?: HangarTab; tier?: PassTier; edit?: boolean }>).detail || {};
      switch (e.type) {
        case 'sgx:open_forge': setHangar(null); setForge({ tier: d.tier || 'DIGITAL' }); break;
        case 'sgx:open_hangar': setForge(null); setHangar(d.tab || 'pass'); break;
        case 'sgx:open_passport': setForge(null); setHangar('reactor'); break;
        case 'sgx:open_profile_drawer': setForge(null); setHangar(forgedRef.current ? 'pass' : 'reactor'); break;
        case 'sgx:open_tour': openHangarOrForge('reactor'); break;
        default: openHangarOrForge('pass', d.tier); // tickets, ticket, credential generator
      }
    };
    IDENTITY_ENTRY_EVENTS.forEach((n) => window.addEventListener(n, handler));
    // Every Holo Card in the app opens this one Studio, on the cards you
    // really hold. detail.role only picks which of them shows first.
    const onHolo = (e: Event) => {
      const raw = String((e as CustomEvent<{ role?: string } | null>).detail?.role || '').toLowerCase();
      const role = (['speaker', 'initiate', 'sponsor'].includes(raw) ? raw : 'visitor') as CredentialRole;
      setForge(null);
      setHangar(null);
      setHolo({ role, n: Date.now() });
    };
    // Someone else's official card (a published speaker, a Guild initiate).
    const onView = (e: Event) => {
      const c = (e as CustomEvent<HoloCredential | null>).detail;
      if (c?.name) setViewCard(c);
    };
    window.addEventListener('sgx:view_holo_card', onView);
    const onAvatar = () => { setHangar(null); setPilotStudio(true); };
    window.addEventListener('sgx:open_avatar', onAvatar);
    window.addEventListener('sgx:open_holo_card', onHolo);
    window.addEventListener('sgx:open_credential_generator', onHolo);
    return () => {
      IDENTITY_ENTRY_EVENTS.forEach((n) => window.removeEventListener(n, handler));
      window.removeEventListener('sgx:open_holo_card', onHolo);
      window.removeEventListener('sgx:open_credential_generator', onHolo);
      window.removeEventListener('sgx:view_holo_card', onView);
      window.removeEventListener('sgx:open_avatar', onAvatar);
    };
  }, [openHangarOrForge]);

  // The profile modal and the role selector are your Studio and the Forge now.
  useEffect(() => {
    if (!isProfileModalOpen) return;
    setIsProfileModalOpen(false);
    setForge(null);
    setHangar('log');
  }, [isProfileModalOpen, setIsProfileModalOpen]);

  useEffect(() => {
    if (!isRoleModalOpen) return;
    setIsRoleModalOpen(false);
    openHangarOrForge('reactor');
  }, [isRoleModalOpen, setIsRoleModalOpen, openHangarOrForge]);

  // Deep links from the physical world.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pase = params.get('pase');
    if (pase) {
      const payload = parsePassQr(`?pase=${pase}`);
      stripParam('pase');
      if (payload) setIncoming(payload);
    }
    const doorCode = (params.get('checkin') || '').trim().toLowerCase();
    if (/^[a-z0-9_-]{6,40}$/.test(doorCode)) {
      rehearsalRef.current = params.get('checkinTest') === '1';
      try { sessionStorage.setItem(CHECKIN_CODE_KEY, doorCode); } catch { /* ignore */ }
      stripParam('checkin');
      // The check-in itself runs from the effect below, once the pass AND the signed-in uid exist.
      pendingCheckin.current = true;
      if (forgedRef.current) setHangar('day3');
      else setForge({ tier: 'SHOWCASE' });
    }
    // Email buttons: ?estudio=pass|day3|reactor|red opens your Studio on that tab (or the Forge
    // without a pass). ?hangar= is the older name, kept for emails already sent.
    const key = params.has('estudio') ? 'estudio' : 'hangar';
    const raw = params.get(key);
    const tab = raw === 'red' ? 'stars' : raw;
    if (tab) {
      stripParam(key);
      const valid = ['pass', 'reactor', 'stars', 'rolodex', 'day3', 'log'];
      window.setTimeout(() => openHangarOrForge((valid.includes(tab) ? tab : 'pass') as HangarTab, tab === 'day3' ? 'SHOWCASE' : 'DIGITAL'), 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A different Google account just signed in (or one without a pass on this
  // device): open the Forge, which also offers that account's existing pass.
  useEffect(() => {
    let fromSwitch = false;
    try { fromSwitch = sessionStorage.getItem(FORGE_AFTER_SWITCH) === '1'; } catch { /* ignore */ }
    // The flag is cleared only when the Forge opens (a remount in between keeps it).
    const t = fromSwitch ? window.setTimeout(() => {
      try { sessionStorage.removeItem(FORGE_AFTER_SWITCH); } catch { /* ignore */ }
      if (!forgedRef.current) setForge({ tier: 'DIGITAL' });
    }, 1200) : 0;
    const onSignedIn = () => { if (!forgedRef.current) { setHangar(null); setForge({ tier: 'DIGITAL' }); } };
    window.addEventListener(SIGNED_IN_EVENT, onSignedIn);
    return () => { window.clearTimeout(t); window.removeEventListener(SIGNED_IN_EVENT, onSignedIn); };
  }, []);

  // First visit: a quiet nudge to forge the pass, once per device. It never
  // covers the first screen; the hero's own button opens the Forge directly.
  const [nudge, setNudge] = useState(false);
  useEffect(() => {
    if (forgedRef.current) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem(FORGE_DISMISSED) === '1'; } catch { /* ignore */ }
    const embed = new URLSearchParams(window.location.search).get('embed') === 'true';
    if (dismissed || embed) return;
    // Wait for the boot sequence and the intro splash to leave, then a breath more.
    let tries = 0;
    const t = window.setInterval(() => {
      tries += 1;
      if (forgedRef.current || tries > 110) { window.clearInterval(t); return; }
      if (document.querySelector('.sgx-boot, [data-sgx-splash]') || tries < 22) return; // ~20 s after the intro
      window.clearInterval(t);
      setNudge(true);
    }, 900);
    return () => window.clearInterval(t);
  }, []);

  // Whatever was waiting on a pass runs right after forging.
  useEffect(() => {
    if (!isForged) return;
    if (pendingCheckin.current && (myUid || rehearsalRef.current)) {
      pendingCheckin.current = false;
      const rehearsal = rehearsalRef.current;
      window.setTimeout(() => {
        checkIn(rehearsal).then((r: CheckinResult) => {
          const copy: Record<CheckinResult, [string, string]> = es ? {
            ok: ['Check-in confirmado', 'Bienvenide a Chroma Space Studios.'],
            already: ['Ya hiciste check-in', 'Tu entrada del Día 3 ya está registrada.'],
            closed: ['El check-in aún no abre', 'Abre el 13 de diciembre en la entrada de Chroma Space Studios.'],
            no_pass: ['Primero forja tu SGX Pass', 'Tu pase es tu entrada.'],
            need_code: ['Escanea el QR de la entrada', 'El check-in necesita el código de la puerta.'],
            invalid: ['No pudimos confirmar el check-in', 'Vuelve a escanear el QR de la entrada o pide ayuda al equipo.'],
          } : {
            ok: ['Checked in', 'Welcome to Chroma Space Studios.'],
            already: ['Already checked in', 'Your Day 3 entry is already recorded.'],
            closed: ['Check-in is not open yet', 'It opens on December 13 at the Chroma Space Studios entrance.'],
            no_pass: ['Forge your SGX Pass first', 'Your pass is your ticket.'],
            need_code: ['Scan the entrance QR', 'Check-in needs the door code.'],
            invalid: ['We could not confirm your check-in', 'Scan the entrance QR again or ask the team for help.'],
          };
          pushToast({ tag: es ? 'DÍA 3 · CHROMA' : 'DAY 3 · CHROMA', title: copy[r][0], detail: copy[r][1], tone: r === 'ok' ? 'action' : 'telemetry' });
          setHangar('day3');
        });
      }, 800);
    }
    if (pendingContact.current) {
      const p = pendingContact.current;
      pendingContact.current = null;
      addContact(p);
    }
  }, [isForged, myUid, checkIn, addContact, es, pushToast]);

  const closeForge = () => {
    try { localStorage.setItem(FORGE_DISMISSED, '1'); } catch { /* ignore */ }
    setForge(null);
  };

  const acceptIncoming = () => {
    if (!incoming) return;
    if (!forgedRef.current) {
      pendingContact.current = incoming;
      setIncoming(null);
      setForge({ tier: 'DIGITAL' });
      return;
    }
    const r = addContact(incoming);
    playScanSuccessSound();
    setIncomingResult(r === 'added' ? (es ? 'Agregado a tu Rolodex. Tú también quedaste en el suyo.' : 'Added to your Rolodex. You landed in theirs too.')
      : r === 'known' ? (es ? 'Ya estaba en tu Rolodex.' : 'Already in your Rolodex.')
      : (es ? 'Ese es tu propio pase.' : 'That is your own pass.'));
  };

  const dismissNudge = () => {
    try { localStorage.setItem(FORGE_DISMISSED, '1'); } catch { /* ignore */ }
    setNudge(false);
  };

  return (
    <>
      {nudge && !quiet && !forge && !isForged && (
        <div className="sgx-nudge" role="status">
          <p><b>{es ? 'Forja tu SGX Pass' : 'Forge your SGX Pass'}</b>{es ? 'Tu registro, tu Holo Card y tu entrada del Día 3, en un minuto.' : 'Your registration, Holo Card and Day 3 entrance, in one minute.'}</p>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => { setNudge(false); setForge({ tier: 'DIGITAL' }); }}>{es ? 'Forjar' : 'Forge'}</button>
          <button type="button" className="sgx-nudge__x" onClick={dismissNudge} aria-label={es ? 'Ahora no' : 'Not now'}>✕</button>
        </div>
      )}
      <LazyBoundary fallback={<LazyFallback overlay />}>
        {holo && (
          <SgxHoloCardGeneratorModal
            key={holo.n || 0}
            isOpen
            onClose={() => setHolo(null)}
            initialRole={holo.role}
          />
        )}
        {viewCard && <SgxHoloViewer cred={viewCard} onClose={() => setViewCard(null)} />}
        {pilotStudio && <PilotBuilderModal onClose={() => setPilotStudio(false)} />}
        {forge && (
          <SgxForge
            initialTier={forge.tier}
            onClose={closeForge}
            onOpenHangar={() => { setForge(null); setHangar(pendingCheckin.current ? 'day3' : 'pass'); }}
          />
        )}
        {hangar && (
          <SgxHangar
            initialTab={hangar}
            onClose={() => setHangar(null)}
            onForge={() => { setHangar(null); setForge({ tier: 'DIGITAL' }); }}
          />
        )}
      </LazyBoundary>
      {incoming && (
        <div className="sgx-hangar sgx-incoming" role="dialog" aria-modal="true" onClick={() => setIncoming(null)}>
          <div className="sgx-incoming__card sgx-panel" onClick={(e) => e.stopPropagation()} style={{ ['--pass-accent' as string]: incoming.p ? PILLAR_ACCENT[incoming.p] : '#FDCC0D' }}>
            <p className="sgx-forge__kicker">{es ? 'SGX Pass detectado' : 'SGX Pass detected'}</p>
            <div className="sgx-incoming__who">
              <SgxPilotGlyph seed={incoming.c} accent={incoming.p ? PILLAR_ACCENT[incoming.p] : '#FDCC0D'} size={84} />
              <div>
                <h3>{incoming.n}</h3>
                <p>{[incoming.s, incoming.p && PILLAR_BY_KEY[incoming.p].name, incoming.r, incoming.o].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            {incomingResult ? (
              <>
                <p role="status" className="sgx-incoming__ok">{incomingResult}</p>
                <div className="sgx-forge__actions">
                  <button type="button" className="sgx-btn" onClick={() => { setIncoming(null); setIncomingResult(''); setHangar('rolodex'); }}>{es ? 'Ver Rolodex' : 'Open Rolodex'}</button>
                  <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => { setIncoming(null); setIncomingResult(''); }}>{es ? 'Cerrar' : 'Close'}</button>
                </div>
              </>
            ) : (
              <div className="sgx-forge__actions">
                <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={acceptIncoming}>
                  {isForged ? (es ? 'Intercambiar pases' : 'Swap passes') : (es ? 'Forja tu pase para intercambiar' : 'Forge your pass to swap')}
                </button></span>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => setIncoming(null)}>{es ? 'Ahora no' : 'Not now'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SgxPassHost;
