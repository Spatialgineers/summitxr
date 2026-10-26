import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePilotProfile } from '../context/PilotProfileContext';
import { PILLAR_BY_KEY } from '../lib/sgxPillars';
import { PILLAR_ACCENT } from './sgxIdentity';
import { useOptionalSgxIdentity } from './SgxIdentityContext';
import { SgxPilotGlyph } from './SgxPilotGlyph';

/* Compact "who am I" strip for menus: pass identity, XP, Reactor progress and
   the two doors (Hangar, Reactor). Unforged pilots get the Forge instead. */

const fire = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

export const SgxPassStrip: React.FC<{ onAction?: () => void }> = ({ onAction }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { profile } = usePilotProfile();
  const sgx = useOptionalSgxIdentity();
  if (!sgx) return null;
  const { identity, isForged, missions, isDone } = sgx;
  const accent = identity.affinity ? PILLAR_ACCENT[identity.affinity] : '#FDCC0D';
  const go = (name: string, detail?: unknown) => { onAction?.(); fire(name, detail); };

  if (!isForged) {
    return (
      <div className="sgx-passstrip sgx-passstrip--forge">
        <div>
          <strong>{es ? 'Todavía no tienes SGX Pass' : 'No SGX Pass yet'}</strong>
          <small>{es ? 'Registro, Holo Card, QR y entrada del Día 3 en un solo pase.' : 'Registration, Holo Card, QR and Day 3 entrance in one pass.'}</small>
        </div>
        <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => go('sgx:open_forge')}>⚡ {es ? 'Forjar pase' : 'Forge pass'}</button>
      </div>
    );
  }

  const done = missions.filter((m) => isDone(m.id)).length;
  return (
    <div className="sgx-passstrip" style={{ ['--pass-accent' as string]: accent }}>
      <span className="sgx-passstrip__face">
        {identity.avatar.png ? <img src={identity.avatar.png} alt="" /> : <SgxPilotGlyph seed={identity.avatar.seed} accent={accent} size={30} />}
      </span>
      <div className="sgx-passstrip__who">
        <strong>{identity.callsign} <span>#{identity.pass!.serial}</span></strong>
        <small>
          {identity.affinity ? `${PILLAR_BY_KEY[identity.affinity].name} · ` : ''}{profile.totalXp.toLocaleString('es-PR')} XP · {profile.rankTitle}
        </small>
      </div>
      <div className="sgx-passstrip__actions">
        <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => go('sgx:open_hangar', { tab: 'pass' })}>{es ? 'Mi Hangar' : 'My Hangar'}</button>
        <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => go('sgx:open_hangar', { tab: 'reactor' })}>Reactor {done}/{missions.length}</button>
      </div>
    </div>
  );
};

export default SgxPassStrip;
