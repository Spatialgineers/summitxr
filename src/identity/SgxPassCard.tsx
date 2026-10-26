import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useLanguage } from '../context/LanguageContext';
import { usePilotProfile } from '../context/PilotProfileContext';
import { PILLAR_BY_KEY, SGX_PILLARS } from '../lib/sgxPillars';
import { PILLAR_ACCENT, passQrUrl } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { SgxPilotGlyph } from './SgxPilotGlyph';

/* THE SGX PASS. Ticket, Holo Card, credential and networking QR are this one
   card. Front: who you are + the QR that opens doors on Day 3. Back: what you
   have done (rank, XP, Reactor, Rolodex). Stamps fill in as you play. */

export function usePassQr(dark = '#050505', light = '#FDCC0D'): string | null {
  const { identity, myUid } = useSgxIdentity();
  const [qr, setQr] = useState<string | null>(null);
  const pass = identity.pass;
  useEffect(() => {
    if (!pass) { setQr(null); return; }
    const url = passQrUrl({
      c: pass.code, n: pass.fullName, s: identity.callsign, p: identity.affinity,
      r: pass.roleTitle, o: pass.organization, u: myUid || undefined,
    });
    let alive = true;
    QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark, light } })
      .then((d) => { if (alive) setQr(d); })
      .catch(() => { if (alive) setQr(null); });
    return () => { alive = false; };
  }, [pass, identity.callsign, identity.affinity, myUid, dark, light]);
  return qr;
}

interface Props {
  flipped?: boolean;
  onFlip?: () => void;
  /** Ceremony: the card prints in from a scan line. */
  printing?: boolean;
  compact?: boolean;
}

export const SgxPassCard: React.FC<Props> = ({ flipped = false, onFlip, printing = false, compact = false }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { profile } = usePilotProfile();
  const { identity, missions, xpBalance } = useSgxIdentity();
  const qr = usePassQr();
  const pass = identity.pass;
  const affinity = identity.affinity ? PILLAR_BY_KEY[identity.affinity] : null;
  const accent = identity.affinity ? PILLAR_ACCENT[identity.affinity] : '#FDCC0D';
  const done = Object.keys(identity.missions).length;
  const chroma = !!identity.stamps['chroma:checkin'];
  const sponsorStamps = Object.keys(identity.stamps).filter((k) => k.startsWith('sponsor:')).length;

  if (!pass) return null;

  return (
    <div
      className={`sgx-pass ${flipped ? 'is-flipped' : ''} ${printing ? 'is-printing' : ''} ${compact ? 'sgx-pass--compact' : ''}`}
      style={{ ['--pass-accent' as string]: accent }}
    >
      <div className="sgx-pass__inner">
        {/* FRONT */}
        <div className="sgx-pass__face sgx-pass__front" aria-hidden={flipped}>
          <div className="sgx-pass__holo" aria-hidden="true" />
          <header className="sgx-pass__head">
            <img src="/brand/sgx-bolt.svg" alt="" className="sgx-pass__bolt" />
            <div>
              <div className="sgx-pass__brand">SGX PASS</div>
              <div className="sgx-pass__event">SPATIALGINEERS SUMMIT 2026 · 11–13 DIC</div>
            </div>
            <div className="sgx-pass__serial">#{pass.serial}</div>
          </header>

          <div className="sgx-pass__body">
            <div className="sgx-pass__portrait">
              {identity.avatar.png
                ? <img src={identity.avatar.png} alt={pass.fullName} />
                : <SgxPilotGlyph seed={identity.avatar.seed} accent={accent} size={compact ? 92 : 120} />}
              <span className="sgx-pass__tier">{pass.tier === 'SHOWCASE' ? (es ? 'DÍA 3 · CHROMA' : 'DAY 3 · CHROMA') : (es ? 'DIGITAL GLOBAL' : 'GLOBAL DIGITAL')}</span>
            </div>
            <div className="sgx-pass__who">
              <div className="sgx-pass__label">{es ? 'Piloto' : 'Pilot'}</div>
              <div className="sgx-pass__name">{pass.fullName}</div>
              <div className="sgx-pass__callsign">{identity.callsign}</div>
              {affinity && (
                <div className="sgx-pass__pillar">
                  <img src={affinity.iconUrl} alt="" />
                  <span>{affinity.name}</span>
                </div>
              )}
              <div className="sgx-pass__rank">{profile.rankTitle} · LV {profile.level}</div>
            </div>
            <div className="sgx-pass__qr">
              {qr ? <img src={qr} alt={es ? 'QR de tu SGX Pass' : 'Your SGX Pass QR'} /> : <div className="sgx-pass__qr-wait" />}
              <code>{pass.code}</code>
            </div>
          </div>

          <footer className="sgx-pass__stamps" aria-label={es ? 'Sellos de pilar' : 'Pillar stamps'}>
            {SGX_PILLARS.map((p) => {
              const on = !!identity.stamps[`pillar:${p.key}`];
              return (
                <span key={p.key} className={`sgx-pass__stamp ${on ? 'is-on' : ''}`} title={`${p.name}${on ? ' ✓' : ''}`}>
                  <img src={p.iconUrl} alt={p.name} />
                </span>
              );
            })}
            <span className={`sgx-pass__stamp sgx-pass__stamp--chroma ${chroma ? 'is-on' : ''}`} title="Chroma Space Studios · Día 3">
              CHROMA
            </span>
          </footer>
          {pass.status === 'PENDING' && (
            <div className="sgx-pass__pending">{es ? 'Solicitud Día 3 en revisión · por invitación' : 'Day 3 request in review · by invitation'}</div>
          )}
        </div>

        {/* BACK */}
        <div className="sgx-pass__face sgx-pass__back" aria-hidden={!flipped}>
          <div className="sgx-pass__holo" aria-hidden="true" />
          <header className="sgx-pass__head">
            <div className="sgx-pass__brand">{es ? 'TELEMETRÍA DEL PILOTO' : 'PILOT TELEMETRY'}</div>
            <div className="sgx-pass__serial">#{pass.serial}</div>
          </header>
          <dl className="sgx-pass__stats">
            <div><dt>XP</dt><dd>{profile.totalXp.toLocaleString('es-PR')}</dd></div>
            <div><dt>{es ? 'Para gastar' : 'Spendable'}</dt><dd>{xpBalance.toLocaleString('es-PR')}</dd></div>
            <div><dt>Reactor</dt><dd>{done}/{missions.length}</dd></div>
            <div><dt>Rolodex</dt><dd>{identity.contacts.length}</dd></div>
            <div><dt>{es ? 'Sellos' : 'Stamps'}</dt><dd>{Object.keys(identity.stamps).filter((k) => k.startsWith('pillar:')).length}/6</dd></div>
            <div><dt>Sponsors</dt><dd>{sponsorStamps}</dd></div>
          </dl>
          <p className="sgx-pass__fine">
            {es
              ? 'Días 1 y 2: YouTube Live. Día 3: Chroma Space Studios, San Juan, por invitación y cupo limitado. Este mismo QR es tu entrada, tu tarjeta de contacto y tu ficha de premios.'
              : 'Days 1 and 2: YouTube Live. Day 3: Chroma Space Studios, San Juan, by invitation and limited capacity. This same QR is your entrance, your contact card and your prize token.'}
          </p>
          <div className="sgx-pass__issued">{es ? 'Forjado' : 'Forged'} · {new Date(pass.forgedAt).toLocaleDateString(es ? 'es-PR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>
      {onFlip && (
        <button type="button" className="sgx-pass__flip" onClick={onFlip} aria-label={es ? 'Voltear pase' : 'Flip pass'}>
          ⟲ {flipped ? (es ? 'Frente' : 'Front') : (es ? 'Telemetría' : 'Telemetry')}
        </button>
      )}
    </div>
  );
};

export default SgxPassCard;
