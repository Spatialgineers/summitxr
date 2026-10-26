import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePilotProfile } from '../context/PilotProfileContext';
import { PILLAR_BY_KEY } from '../lib/sgxPillars';
import { playScanSuccessSound } from '../lib/cyberAudioEngine';
import { parsePassQr, PILLAR_ACCENT, type PassQrPayload, type PassTier } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { SgxForge } from './SgxForge';
import { SgxHangar, type HangarTab } from './SgxHangar';
import { SgxPilotGlyph } from './SgxPilotGlyph';
import { usePassQr } from './SgxPassCard';
import { passHoloProfile } from './sgxIdentity';
import { SgxHoloCardGeneratorModal, type HoloCardProfile } from '../components/summit/SgxHoloCardGeneratorModal';

/* Global owner of the identity surfaces. Every legacy entry point (taquilla,
   passport, profile, drawer, tours, credential generator, role selector)
   lands here and becomes either the Forge or the Hangar. Also handles the
   two links the pass QR world produces: ?pase=… (someone's pass) and
   ?checkin=chroma26 (the Day 3 entrance poster). */

export const CHECKIN_CODE = 'chroma26';
const FORGE_DISMISSED = 'sgx_forge_dismissed';
/** Generic CTA values ("make your own card") that the pass replaces. */
const PLACEHOLDER_NAMES = ['Speaker SGX', 'Tu Marca / Empresa', 'Speaker / Creador', 'Spatialgineers Summit 2026'];

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

export const SgxPassHost: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { isProfileModalOpen, setIsProfileModalOpen, isRoleModalOpen, setIsRoleModalOpen } = usePilotProfile();
  const { isForged, addContact, checkIn, identity } = useSgxIdentity();
  const passQrUrl = usePassQr('#050505', '#ffffff');
  // Holo Card Studio (visitante / speaker / initiate / sponsor), prefilled from the pass.
  const [holo, setHolo] = useState<{ profile: (HoloCardProfile & { self?: boolean }) | null; mine: boolean; n: number } | null>(null);
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
    // Every Holo Card in the app opens this one Studio. "Mine" (no profile,
    // a role only, or self: true from the speaker / sponsor / portal CTAs) is
    // prefilled from the SGX Pass; someone else's card (a speaker, an
    // initiate) opens with their profile.
    const onHolo = (e: Event) => {
      const d = (e as CustomEvent<(HoloCardProfile & { self?: boolean }) | null>).detail || null;
      const mine = !d || d.self || Object.keys(d).every((k) => k === 'role');
      setForge(null);
      setHangar(null);
      // n remounts the Studio so nothing from the previous card leaks into this one.
      setHolo({ profile: d, mine, n: Date.now() });
    };
    window.addEventListener('sgx:open_holo_card', onHolo);
    window.addEventListener('sgx:open_credential_generator', onHolo);
    return () => {
      IDENTITY_ENTRY_EVENTS.forEach((n) => window.removeEventListener(n, handler));
      window.removeEventListener('sgx:open_holo_card', onHolo);
      window.removeEventListener('sgx:open_credential_generator', onHolo);
    };
  }, [openHangarOrForge]);

  // The profile modal and the role selector are the Hangar and the Forge now.
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
    if ((params.get('checkin') || '').toLowerCase() === CHECKIN_CODE) {
      rehearsalRef.current = params.get('checkinTest') === '1';
      stripParam('checkin');
      if (forgedRef.current) {
        setHangar('day3');
        window.setTimeout(() => { checkIn(rehearsalRef.current); }, 400);
      } else {
        pendingCheckin.current = true;
        setForge({ tier: 'SHOWCASE' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // First visit: the Forge replaces the old tours, once per device.
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
      if (document.querySelector('.sgx-boot, [data-sgx-splash]') || tries < 2) return;
      window.clearInterval(t);
      setForge((f) => f || { tier: 'DIGITAL' });
    }, 900);
    return () => window.clearInterval(t);
  }, []);

  // Whatever was waiting on a pass runs right after forging.
  useEffect(() => {
    if (!isForged) return;
    if (pendingCheckin.current) {
      pendingCheckin.current = false;
      window.setTimeout(() => { checkIn(rehearsalRef.current); }, 2600);
    }
    if (pendingContact.current) {
      const p = pendingContact.current;
      pendingContact.current = null;
      addContact(p);
    }
  }, [isForged, checkIn, addContact]);

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

  const passProfile = passHoloProfile(identity, identity.affinity ? PILLAR_BY_KEY[identity.affinity].name : undefined);
  const holoProfile: HoloCardProfile | null = (() => {
    if (!holo) return null;
    const d = holo.profile;
    if (!holo.mine) return d;
    if (!passProfile) return d ? { ...d } : null;
    const { self: _self, ...rest } = d || {};
    const generic = (v?: string) => !v || PLACEHOLDER_NAMES.includes(v);
    return {
      ...passProfile,
      ...rest,
      role: d?.role || passProfile.role,
      name: generic(rest.name) ? passProfile.name : rest.name,
      org: generic(rest.org) ? passProfile.org : rest.org,
      jobtitle: rest.jobtitle || rest.title || passProfile.jobtitle,
      photoUrl: rest.photoUrl || passProfile.photoUrl,
      ticketCode: passProfile.ticketCode,
      passType: passProfile.passType,
    };
  })();

  return (
    <>
      <SgxHoloCardGeneratorModal
        key={holo?.n || 0}
        isOpen={!!holo}
        onClose={() => setHolo(null)}
        initialProfile={holoProfile}
        passQr={identity.pass && passQrUrl ? { code: identity.pass.code, url: passQrUrl } : null}
      />
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
