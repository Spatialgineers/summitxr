import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';
import { SgxDialog } from '../components/common/SgxDialog';
import { useSgxIdentity } from './SgxIdentityContext';
import { submitInitiateRequest, type CredentialRole, type HoloCredential } from './credentials';

/* TU ROL EN EL SUMMIT: everyone forges the pass first; from it they ask to be
   a speaker, a sponsor or an SGX Guild initiate. Until the team approves, the
   request shows "En revisión"; once approved, this same pass card switches to
   that role. */

const ROLES: { role: Exclude<CredentialRole, 'visitor'>; es: [string, string]; en: [string, string] }[] = [
  { role: 'speaker', es: ['Speaker o artista', 'Presenta en la agenda del Summit.'], en: ['Speaker or artist', 'Present on the Summit agenda.'] },
  { role: 'initiate', es: ['Initiate del SGX Guild', 'Muestra tu portafolio en el Guild.'], en: ['SGX Guild initiate', 'Show your portfolio in the Guild.'] },
  { role: 'sponsor', es: ['Sponsor', 'Pon tu marca dentro del Summit.'], en: ['Sponsor', 'Put your brand inside the Summit.'] },
];

const fire = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

export const SgxRoleRequests: React.FC<{ credentials: HoloCredential[]; current: CredentialRole }> = ({ credentials, current }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { user } = useAuth();
  const { identity } = useSgxIdentity();
  const [initiateOpen, setInitiateOpen] = useState(false);

  const status = (r: CredentialRole) => {
    const c = credentials.find((x) => x.role === r);
    return c ? c.status : null;
  };

  const ask = (r: Exclude<CredentialRole, 'visitor'>) => {
    playUiChirp(760);
    if (r === 'speaker') fire('sgx:open_speaker_portal');
    else if (r === 'sponsor') fire('sgx:open_sponsor_modal');
    else setInitiateOpen(true);
  };

  return (
    <section className="sgx-roles">
      <h4>{es ? 'Tu rol en el Summit' : 'Your role in the Summit'}</h4>
      <p className="sgx-hstudio__hint">
        {current === 'visitor'
          ? (es ? 'Tu pase dice CREADOR. Solicita un rol y, cuando el equipo lo apruebe, esta misma tarjeta cambia a ese rol.' : 'Your pass says CREATOR. Ask for a role and, once the team approves it, this same card switches to that role.')
          : (es ? `Tu pase ya es de ${current.toUpperCase()}.` : `Your pass is now ${current.toUpperCase()}.`)}
      </p>
      <ul className="sgx-roles__list">
        {ROLES.map((r) => {
          const st = status(r.role);
          const [title, line] = es ? r.es : r.en;
          return (
            <li key={r.role} className={`sgx-roles__item ${st ? `is-${st}` : ''}`}>
              <div>
                <b>{title}</b>
                <span>{line}</span>
              </div>
              {st === 'official' ? (
                <span className="sgx-roles__chip is-ok">{es ? 'Aprobado' : 'Approved'}</span>
              ) : st === 'review' ? (
                <span className="sgx-roles__chip">{es ? 'En revisión' : 'In review'}</span>
              ) : (
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => ask(r.role)}>{es ? 'Solicitar' : 'Apply'}</button>
              )}
            </li>
          );
        })}
      </ul>
      {initiateOpen && identity.pass && (
        <InitiateRequestDialog
          onClose={() => setInitiateOpen(false)}
          uid={user?.uid || null}
          name={identity.pass.fullName}
          email={identity.pass.email}
          passCode={identity.pass.code}
          pillar={identity.affinity}
        />
      )}
    </section>
  );
};

const InitiateRequestDialog: React.FC<{ onClose: () => void; uid: string | null; name: string; email: string; passCode: string; pillar: PillarKey | null }> = ({ onClose, uid, name, email, passCode, pillar }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [pick, setPick] = useState<PillarKey | null>(pillar);
  const [portfolio, setPortfolio] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) { setErr(es ? 'Espera un momento a que cargue tu sesión e inténtalo otra vez.' : 'Wait a moment for your session to load and try again.'); return; }
    if (note.trim().length < 10) { setErr(es ? 'Cuéntanos un poco lo que haces (al menos una oración).' : 'Tell us a bit about what you do (at least one sentence).'); return; }
    setBusy(true); setErr('');
    try {
      await submitInitiateRequest({ uid, name, email, passCode, pillar: pick, portfolio: portfolio.trim() || undefined, note: note.trim() });
      playUiChirp(980);
      setSent(true);
    } catch {
      setErr(es ? 'No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.' : "We couldn't send your request. Check your connection and try again.");
    } finally { setBusy(false); }
  };

  return (
    <SgxDialog
      onClose={onClose}
      size="sm"
      title={es ? 'Solicitud de Initiate' : 'Initiate request'}
      kicker="SGX Guild Program 2026"
      footer={sent
        ? <button type="button" className="sgx-btn sgx-btn--sm" onClick={onClose}>{es ? 'Listo' : 'Done'}</button>
        : (
          <>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={onClose}>{es ? 'Cancelar' : 'Cancel'}</button>
            <button type="submit" form="sgx-initiate-form" className="sgx-btn sgx-btn--sm" disabled={busy}>{busy ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar solicitud' : 'Send request')}</button>
          </>
        )}
    >
      {sent ? (
        <p className="sgx-hstudio__hint" role="status">{es ? 'Recibido. El equipo del SGX Guild la revisa; cuando la apruebe, tu pase dirá INITIATE.' : 'Received. The SGX Guild team reviews it; once approved, your pass will say INITIATE.'}</p>
      ) : (
        <form id="sgx-initiate-form" className="sgx-roles__form" onSubmit={send}>
          <p className="sgx-hstudio__hint">{es ? `Va a nombre de ${name} (${email}), con tu pase ${passCode}.` : `It goes under ${name} (${email}), with your pass ${passCode}.`}</p>
          <label>{es ? 'Tu pilar' : 'Your pillar'}
            <select value={pick || ''} onChange={(e) => setPick((e.target.value || null) as PillarKey | null)}>
              {SGX_PILLARS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
            </select>
          </label>
          <label>{es ? 'Portafolio (enlace, opcional)' : 'Portfolio (link, optional)'}
            <input type="url" value={portfolio} maxLength={300} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://…" />
          </label>
          <label>{es ? 'Qué haces y qué quieres mostrar' : 'What you do and what you want to show'}
            <textarea value={note} maxLength={600} rows={4} onChange={(e) => setNote(e.target.value)} />
          </label>
          {err && <p className="sgx-m-err" role="alert">{err}</p>}
        </form>
      )}
    </SgxDialog>
  );
};

export default SgxRoleRequests;
