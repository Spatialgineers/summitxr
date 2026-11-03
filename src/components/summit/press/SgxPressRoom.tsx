import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Calendar, Check, CheckCircle2, Copy, Download, FileText, Image as ImageIcon, Lock, Mail, Newspaper, Phone, Send, Zap } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { useOptionalSgxIdentity } from '../../../identity/SgxIdentityContext';
import { useHoloCredentials } from '../../../identity/credentials';
import { SGX_EMAIL, SGX_PHONE } from '../../../lib/sgxLinks';
import {
  PRESS_ABOUT, PRESS_ASSETS, PRESS_DAYS, PRESS_FACTS, PRESS_FACT_SHEET_PDF, PRESS_FAQ, PRESS_FOUNDERS, PRESS_KIT_ZIP,
  PRESS_MEDIA_TYPES, PRESS_META, PRESS_PATH, PRESS_RULES, PRESS_SLOTS, isPressOpen, mediaTypeLabel, type PressAssetKind, type PressMediaType,
} from '../../../lib/pressKit';
import { clearPressReceipt, loadPressReceipt, submitPressRequest, type PressRequest } from '../../../lib/pressRequests';
import '../welcome/sgxWelcome.css';
import '../sgxModals.css';
import './sgxPress.css';

/* SALA DE PRENSA (/prensa). Public: the press kit (ZIP, PDF fact sheet and
   each image), the fact sheet and the founders' bios as plain HTML. The
   accreditation form needs an SGX Pass first (like every role), closes on
   December 1 and sends to the team's inbox with a tracking code. Approved
   press get the PRENSA Holo Card and the Day 3 invitation on their pass. */

const fire = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));
const TEL = `tel:${SGX_PHONE.replace(/[^+\d]/g, '')}`;

/** Sets the page title and description while the page is open, and puts them back after. */
function useHead(title: string, description: string) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    const prevTitle = document.title;
    const prevDesc = meta?.getAttribute('content') || '';
    document.title = title;
    meta?.setAttribute('content', description);
    return () => { document.title = prevTitle; meta?.setAttribute('content', prevDesc); };
  }, [title, description]);
}

const mb = (bytes?: number) => (!bytes ? '' : bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`);
const fileName = (path: string) => path.split('/').pop() || path;
/** "elnuevodia.com" → "https://elnuevodia.com"; anything that is not a link → ''. */
function normUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    return u.hostname.includes('.') ? u.toString() : '';
  } catch { return ''; }
}

/* ---------- the accreditation form ---------- */

const PressForm: React.FC<{ es: boolean; onSent: (r: PressRequest) => void }> = ({ es, onSent }) => {
  const sgx = useOptionalSgxIdentity();
  const pass = sgx?.identity.pass || null;
  const { user } = useAuth();
  const [name, setName] = useState(pass?.fullName || '');
  const [outlet, setOutlet] = useState(pass?.organization || '');
  const [title, setTitle] = useState(pass?.roleTitle || '');
  const [email, setEmail] = useState(pass?.email || '');
  const [phone, setPhone] = useState('');
  const [mediaType, setMediaType] = useState<PressMediaType | ''>('');
  const [outletUrl, setOutletUrl] = useState('');
  const [clips, setClips] = useState<string[]>(['', '', '']);
  const [plan, setPlan] = useState('');
  const [days, setDays] = useState<(1 | 2 | 3)[]>([1, 2, 3]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = es ? 'Escribe tu nombre.' : 'Enter your name.';
    if (!outlet.trim()) e.outlet = es ? 'Escribe el nombre de tu medio.' : 'Enter your outlet’s name.';
    if (!title.trim()) e.title = es ? 'Escribe tu cargo.' : 'Enter your title.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = es ? 'Escribe un correo válido.' : 'Enter a valid email.';
    if (phone.replace(/\D/g, '').length < 7) e.phone = es ? 'Escribe un teléfono o WhatsApp.' : 'Enter a phone or WhatsApp number.';
    if (!mediaType) e.mediaType = es ? 'Elige el tipo de medio.' : 'Pick the type of outlet.';
    if (!normUrl(outletUrl)) e.outletUrl = es ? 'Pega el enlace de tu medio o de sus redes.' : 'Paste the link to your outlet or its social media.';
    const cleanClips = clips.map(normUrl);
    if (!cleanClips.some(Boolean)) e.clip0 = es ? 'Comparte al menos un enlace de una cobertura previa.' : 'Share at least one link to past coverage.';
    clips.forEach((c, i) => { if (c.trim() && !cleanClips[i]) e[`clip${i}`] = es ? 'Ese enlace no es válido.' : 'That link is not valid.'; });
    if (plan.trim().length < 10) e.plan = es ? 'Cuéntanos en una oración qué planeas cubrir.' : 'Tell us in one sentence what you plan to cover.';
    if (!days.length) e.days = es ? 'Marca al menos un día.' : 'Pick at least one day.';
    if (!consent) e.consent = es ? 'Necesitamos tu consentimiento para revisar la solicitud.' : 'We need your consent to review the request.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSendError('');
    if (!validate()) {
      window.setTimeout(() => (document.querySelector('.sgx-press-form [aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
      return;
    }
    if (!user?.uid) { setSendError(es ? 'Espera un momento a que cargue tu sesión e inténtalo otra vez.' : 'Wait a moment for your session to load and try again.'); return; }
    setBusy(true);
    try {
      const sent = await submitPressRequest({
        name: name.trim(), outlet: outlet.trim(), title: title.trim(), email: email.trim(), phone: phone.trim(),
        outletUrl: normUrl(outletUrl), mediaType: mediaType as PressMediaType,
        clips: clips.map(normUrl).filter(Boolean), plan: plan.trim(), days: [...days].sort(), consent,
        passCode: pass?.code || '', submittedBy: user.uid,
      });
      onSent(sent);
    } catch {
      setSendError(es ? `No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo, o escríbenos a ${SGX_EMAIL}.` : `We couldn't send your request. Check your connection and try again, or write to ${SGX_EMAIL}.`);
    } finally { setBusy(false); }
  };

  const field = (key: string, label: string, value: string, set: (v: string) => void, opts: { type?: string; placeholder?: string; autoComplete?: string; max?: number; required?: boolean } = {}) => (
    <label className="sgx-m-field">
      <span>{label}{opts.required !== false && <em> *</em>}</span>
      <input
        className="sgx-m-input" name={key} type={opts.type || 'text'} value={value} maxLength={opts.max || 120}
        onChange={(e) => set(e.target.value)} placeholder={opts.placeholder} autoComplete={opts.autoComplete}
        aria-invalid={errors[key] ? true : undefined} aria-describedby={errors[key] ? `sgx-press-err-${key}` : undefined}
      />
      {errors[key] && <span id={`sgx-press-err-${key}`} className="sgx-m-err">{errors[key]}</span>}
    </label>
  );

  return (
    <form className="sgx-m sgx-m-stack sgx-press-form" onSubmit={submit} noValidate aria-label={es ? 'Solicitud de acreditación de prensa' : 'Press accreditation request'}>
      {pass && (
        <p className="sgx-m-fine">{es ? `Va con tu SGX Pass ${pass.code}. Si te aprueban, ese pase dice PRENSA y su QR es tu entrada al Día 3.` : `It goes with your SGX Pass ${pass.code}. If approved, that pass says PRESS and its QR is your Day 3 entrance.`}</p>
      )}
      <div className="sgx-press-grid">
        {field('name', es ? 'Nombre' : 'Name', name, setName, { autoComplete: 'name', max: 100 })}
        {field('outlet', es ? 'Medio' : 'Outlet', outlet, setOutlet, { placeholder: es ? 'Nombre del medio o del canal' : 'Outlet or channel name', autoComplete: 'organization', max: 120 })}
        {field('title', es ? 'Cargo' : 'Title', title, setTitle, { placeholder: es ? 'Periodista, productora, editor…' : 'Journalist, producer, editor…', autoComplete: 'organization-title', max: 100 })}
        {field('email', es ? 'Email' : 'Email', email, setEmail, { type: 'email', autoComplete: 'email', max: 150 })}
        {field('phone', es ? 'Teléfono / WhatsApp' : 'Phone / WhatsApp', phone, setPhone, { type: 'tel', autoComplete: 'tel', max: 40 })}
        {field('outletUrl', es ? 'Enlace del medio o sus redes' : 'Link to the outlet or its social media', outletUrl, setOutletUrl, { type: 'url', placeholder: 'https://', max: 300 })}
      </div>

      <fieldset className="sgx-press-fieldset" aria-describedby={errors.mediaType ? 'sgx-press-err-mediaType' : undefined}>
        <legend className="sgx-m-label">{es ? 'Tipo de medio' : 'Type of outlet'}<em> *</em></legend>
        <div className="sgx-press-chips">
          {PRESS_MEDIA_TYPES.map((t) => (
            <label key={t.id} className={`sgx-m-chip ${mediaType === t.id ? 'is-on' : ''}`}>
              <input type="radio" name="sgx-press-type" value={t.id} checked={mediaType === t.id} onChange={() => setMediaType(t.id)} aria-invalid={errors.mediaType ? true : undefined} />
              {es ? t.label.es : t.label.en}
            </label>
          ))}
        </div>
        {errors.mediaType && <span id="sgx-press-err-mediaType" className="sgx-m-err">{errors.mediaType}</span>}
      </fieldset>

      <fieldset className="sgx-press-fieldset">
        <legend className="sgx-m-label">{es ? 'Coberturas previas (1 a 3 enlaces)' : 'Past coverage (1 to 3 links)'}<em> *</em></legend>
        <div className="sgx-press-grid sgx-press-grid--3">
          {clips.map((c, i) => (
            <label key={i} className="sgx-m-field">
              <span className="sgx-visually-hidden">{es ? `Cobertura previa ${i + 1}` : `Past coverage ${i + 1}`}</span>
              <input
                className="sgx-m-input" type="url" value={c} maxLength={300} placeholder={i === 0 ? 'https://' : (es ? 'https:// (opcional)' : 'https:// (optional)')}
                onChange={(e) => setClips((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
                aria-label={es ? `Enlace de cobertura previa ${i + 1}` : `Past coverage link ${i + 1}`}
                aria-invalid={errors[`clip${i}`] ? true : undefined} aria-describedby={errors[`clip${i}`] ? `sgx-press-err-clip${i}` : undefined}
              />
              {errors[`clip${i}`] && <span id={`sgx-press-err-clip${i}`} className="sgx-m-err">{errors[`clip${i}`]}</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="sgx-m-field">
        <span>{es ? 'Qué planeas cubrir' : 'What you plan to cover'}<em> *</em></span>
        <textarea
          className="sgx-m-input" rows={3} maxLength={400} value={plan} onChange={(e) => setPlan(e.target.value)}
          placeholder={es ? 'Ej.: nota y entrevista a los fundadores; reels del Día 3 en Chroma.' : 'E.g. a story and an interview with the founders; reels from Day 3 at Chroma.'}
          aria-invalid={errors.plan ? true : undefined} aria-describedby={errors.plan ? 'sgx-press-err-plan' : 'sgx-press-plan-count'}
        />
        <span id="sgx-press-plan-count" className="sgx-m-fine">{plan.length}/400</span>
        {errors.plan && <span id="sgx-press-err-plan" className="sgx-m-err">{errors.plan}</span>}
      </label>

      <fieldset className="sgx-press-fieldset" aria-describedby={errors.days ? 'sgx-press-err-days' : undefined}>
        <legend className="sgx-m-label">{es ? 'Días que cubrirás' : 'Days you will cover'}<em> *</em></legend>
        <div className="sgx-press-days">
          {PRESS_DAYS.map((d) => {
            const on = days.includes(d.day);
            return (
              <label key={d.day} className={`sgx-m-check ${on ? 'is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => setDays((cur) => (on ? cur.filter((x) => x !== d.day) : [...cur, d.day]))} />
                <span><b>{es ? d.label.es : d.label.en}</b><br /><small>{es ? d.how.es : d.how.en}</small></span>
              </label>
            );
          })}
        </div>
        {errors.days && <span id="sgx-press-err-days" className="sgx-m-err">{errors.days}</span>}
      </fieldset>

      <label className={`sgx-m-check ${consent ? 'is-on' : ''}`}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? 'sgx-press-err-consent' : undefined} />
        <span>
          {es
            ? 'Acepto que Spatialgineers use estos datos para revisar mi acreditación y escribirme sobre el Summit. Entiendo que hay 6 cupos, uno por medio, y que la acreditación se confirma por escrito.'
            : 'I agree that Spatialgineers may use these details to review my accreditation and write to me about the Summit. I understand there are 6 slots, one per outlet, and that accreditation is confirmed in writing.'}
        </span>
      </label>
      {errors.consent && <span id="sgx-press-err-consent" className="sgx-m-err">{errors.consent}</span>}

      {sendError && <p className="sgx-m-note sgx-m-note--warn" role="alert"><AlertTriangle size={16} aria-hidden /> {sendError}</p>}
      <div className="sgx-press-submit">
        <span className="sgx-glow">
          <button type="submit" className="sgx-btn" disabled={busy}>
            <Send aria-hidden="true" />{busy ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar solicitud de acreditación' : 'Send accreditation request')}
          </button>
        </span>
        <p className="sgx-m-fine">{es ? `Las acreditaciones cierran el 1 de diciembre de 2026. Dudas: ${SGX_EMAIL}` : `Accreditation closes December 1, 2026. Questions: ${SGX_EMAIL}`}</p>
      </div>
    </form>
  );
};

/* ---------- the submitted state (tracking code) ---------- */

const PressReceipt: React.FC<{ es: boolean; req: PressRequest; approved: boolean; onAnother: () => void }> = ({ es, req, approved, onAnother }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(req.referenceCode).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  const download = () => {
    const lines = [
      'SPATIALGINEERS SUMMIT 2026 · SOLICITUD DE ACREDITACIÓN DE PRENSA',
      '11–13 de diciembre de 2026 · Días 1 y 2 por YouTube Live · Día 3 en Chroma Space Studios, San Juan',
      '',
      `CÓDIGO DE SEGUIMIENTO: ${req.referenceCode}`,
      `FECHA: ${new Date(req.submittedAt).toLocaleString('es-PR')}`,
      `ESTADO: ${approved ? 'Aprobada' : 'En revisión por Spatialgineers'}`,
      '',
      `Nombre: ${req.name}`,
      `Medio: ${req.outlet} (${mediaTypeLabel(req.mediaType)})`,
      `Cargo: ${req.title}`,
      `Email: ${req.email} · Teléfono: ${req.phone}`,
      `Medio / redes: ${req.outletUrl}`,
      `Coberturas previas: ${req.clips.join(' · ')}`,
      `Qué planea cubrir: ${req.plan}`,
      `Días: ${req.days.map((d) => `Día ${d}`).join(', ')}`,
      req.passCode ? `SGX Pass: ${req.passCode}` : '',
      '',
      '6 cupos, uno por medio. La acreditación se confirma por escrito.',
      `Contacto: ${SGX_EMAIL} · ${SGX_PHONE}`,
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `SGX_Prensa_${req.referenceCode}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="sgx-m sgx-m-stack sgx-press-receipt" role="status">
      <div className="sgx-m-note sgx-m-note--ok">
        <CheckCircle2 size={18} aria-hidden />
        <div>
          {approved ? (
            <><strong>{es ? 'Acreditación aprobada. ' : 'Accreditation approved. '}</strong>{es ? 'Tu SGX Pass ya dice PRENSA y su QR es tu entrada al Día 3 en Chroma Space Studios.' : 'Your SGX Pass now says PRESS and its QR is your Day 3 entrance at Chroma Space Studios.'}</>
          ) : (
            <><strong>{es ? 'Solicitud enviada. ' : 'Request sent. '}</strong>{es ? `Gracias, ${req.name}. El equipo de Spatialgineers la revisa y te escribe a ${req.email}. Mientras tanto, tu Holo Card muestra PRENSA · EN REVISIÓN.` : `Thank you, ${req.name}. The Spatialgineers team reviews it and writes to ${req.email}. Meanwhile, your Holo Card shows PRESS · IN REVIEW.`}</>
          )}
        </div>
      </div>
      <div className="sgx-m-code">
        <div>
          <p className="sgx-m-fine">{es ? 'Código de seguimiento' : 'Tracking code'}</p>
          <code>{req.referenceCode}</code>
        </div>
        <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={copy}>
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar' : 'Copy')}
        </button>
      </div>
      <div className="sgx-m-card">
        <p className="sgx-m-kicker">{es ? 'Resumen' : 'Summary'}</p>
        <div className="sgx-m-grid sgx-m-grid--2">
          <div className="sgx-m-readout"><span>{es ? 'Medio' : 'Outlet'}</span><b>{req.outlet} · {mediaTypeLabel(req.mediaType, es)}</b></div>
          <div className="sgx-m-readout"><span>{es ? 'Cargo' : 'Title'}</span><b>{req.title}</b></div>
          <div className="sgx-m-readout"><span>{es ? 'Días' : 'Days'}</span><b>{req.days.map((d) => (es ? `Día ${d}` : `Day ${d}`)).join(', ')}</b></div>
          <div className="sgx-m-readout"><span>Email</span><b style={{ overflowWrap: 'anywhere' }}>{req.email}</b></div>
        </div>
      </div>
      <div className="sgx-press-submit">
        <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={download}><Download aria-hidden="true" />{es ? 'Descargar comprobante (.txt)' : 'Download receipt (.txt)'}</button>
        <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => fire('sgx:open_hangar', { tab: 'pass' })}><BadgeCheck aria-hidden="true" />{es ? 'Ver mi Holo Card' : 'See my Holo Card'}</button>
        {!approved && <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={onAnother}>{es ? 'Corregir y enviar otra' : 'Fix and send another'}</button>}
      </div>
    </div>
  );
};

/* ---------- the page ---------- */

const KIND_TITLE: Record<PressAssetKind, { es: string; en: string }> = {
  logo: { es: 'Logos', en: 'Logos' },
  photo: { es: 'Fotos de los fundadores y del equipo', en: 'Photos of the founders and the team' },
  screenshot: { es: 'Capturas de la webapp', en: 'Web app screenshots' },
};

export const SgxPressRoom: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const sgx = useOptionalSgxIdentity();
  const forged = !!sgx?.isForged;
  const { credentials } = useHoloCredentials();
  const approved = credentials.some((c) => c.role === 'press' && c.status === 'official');
  const [receipt, setReceipt] = useState<PressRequest | null>(() => loadPressReceipt());
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const open = useMemo(() => isPressOpen(), []);

  useHead(es ? PRESS_META.title.es : PRESS_META.title.en, es ? PRESS_META.description.es : PRESS_META.description.en);

  // file sizes written by the kit builder (optional: the links work without them)
  useEffect(() => {
    let alive = true;
    fetch('/press/kit.json').then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j?.sizes) setSizes(j.sizes); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  // An alias (/press, /media, /sala-de-prensa…) settles on the clean link.
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    if (pathname !== PRESS_PATH && /^\/(press|media|sala-de-prensa|kit-de-prensa|press-kit|acreditacion)\/?$/i.test(pathname)) {
      window.history.replaceState(window.history.state, '', PRESS_PATH + search + hash);
    }
  }, []);

  // /prensa#kit, /prensa#acreditacion, /prensa#ficha: land on that block
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!/^(acreditacion|kit|ficha|fundadores)$/.test(id)) return;
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 500);
    return () => window.clearTimeout(t);
  }, []);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const deadline = es ? PRESS_RULES.deadline.es : PRESS_RULES.deadline.en;
  const facts = [
    { k: es ? 'Fecha límite' : 'Deadline', v: es ? '1 de diciembre de 2026' : 'December 1, 2026' },
    { k: es ? `${PRESS_SLOTS} cupos` : `${PRESS_SLOTS} slots`, v: es ? 'Uno por medio' : 'One per outlet' },
    { k: es ? 'Los 3 días' : 'All 3 days', v: es ? 'YouTube Live + Día 3 en Chroma' : 'YouTube Live + Day 3 at Chroma' },
  ];

  let formBody: React.ReactNode;
  if (receipt || approved) {
    formBody = receipt
      ? <PressReceipt es={es} req={receipt} approved={approved} onAnother={() => { clearPressReceipt(); setReceipt(null); }} />
      : (
        <div className="sgx-m-note sgx-m-note--ok" role="status"><CheckCircle2 size={18} aria-hidden /><div><strong>{es ? 'Acreditación aprobada. ' : 'Accreditation approved. '}</strong>{es ? 'Tu SGX Pass ya dice PRENSA y su QR es tu entrada al Día 3.' : 'Your SGX Pass now says PRESS and its QR is your Day 3 entrance.'}</div></div>
      );
  } else if (!open) {
    formBody = (
      <div className="sgx-press-gate is-closed">
        <Lock aria-hidden="true" />
        <div>
          <h3>{es ? 'Las acreditaciones de prensa cerraron' : 'Press accreditation is closed'}</h3>
          <p>{es ? `La fecha límite era el 1 de diciembre de 2026. Para entrevistas o material del Summit, escríbenos a ${SGX_EMAIL}. El kit de prensa sigue disponible abajo.` : `The deadline was December 1, 2026. For interviews or Summit material, write to ${SGX_EMAIL}. The press kit is still available below.`}</p>
        </div>
      </div>
    );
  } else if (!forged) {
    formBody = (
      <div className="sgx-press-gate">
        <Zap aria-hidden="true" />
        <div>
          <h3>{es ? 'Forja tu pase primero' : 'Forge your pass first'}</h3>
          <p>{es ? 'Todo empieza con tu SGX Pass, gratis y en un minuto. Desde tu pase solicitas la acreditación; si te aprueban, ese mismo pase dice PRENSA y su QR es tu entrada al Día 3.' : 'Everything starts with your SGX Pass, free and in a minute. You request accreditation from your pass; if approved, that same pass says PRESS and its QR is your Day 3 entrance.'}</p>
          <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={() => fire('sgx:open_forge', { tier: 'DIGITAL' })}><Zap aria-hidden="true" />{es ? 'Forjar mi SGX Pass' : 'Forge my SGX Pass'}</button></span>
        </div>
      </div>
    );
  } else {
    formBody = <PressForm es={es} onSent={setReceipt} />;
  }

  const kinds: PressAssetKind[] = ['logo', 'photo', 'screenshot'];

  return (
    <div id="summit-section-prensa" className="sgx-wel sgx-press">
      <header className="sgx-wel-hero" aria-labelledby="sgx-press-title">
        <div className="sgx-wel-hero__copy">
          <p className="sgx-wel-eyebrow">
            <img src="/brand/sgx-bolt.svg" alt="" width={20} height={20} />
            <span>Spatialgineers Summit 2026 · {es ? 'Sala de prensa' : 'Press room'}</span>
          </p>
          <h1 id="sgx-press-title" className="sgx-wel-title">{es ? 'Sala de prensa' : 'Press room'}</h1>
          <p className="sgx-wel-lead">
            {es
              ? 'Acreditación para medios y creadores de contenido, y el kit de prensa del Spatialgineers Summit 2026 (11–13 de diciembre). '
              : 'Accreditation for media and content creators, and the Spatialgineers Summit 2026 press kit (December 11–13). '}
            {es ? PRESS_RULES.access.es : PRESS_RULES.access.en}
          </p>
          <dl className="sgx-wel-facts">
            {facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}
          </dl>
          <div className="sgx-wel-actions">
            <span className="sgx-glow">
              <a href="#acreditacion" className="sgx-btn sgx-wel-cta" onClick={scrollTo('acreditacion')}><Newspaper aria-hidden="true" />{open ? (es ? 'Solicitar acreditación' : 'Request accreditation') : (es ? 'Acreditación (cerrada)' : 'Accreditation (closed)')}</a>
            </span>
            <a href={PRESS_KIT_ZIP} download className="sgx-btn sgx-btn--ground"><Download aria-hidden="true" />{es ? 'Kit de prensa (ZIP)' : 'Press kit (ZIP)'}</a>
            <a href="#ficha" className="sgx-btn sgx-btn--ground" onClick={scrollTo('ficha')}><FileText aria-hidden="true" />{es ? 'Ficha y bios' : 'Fact sheet and bios'}</a>
          </div>
        </div>
      </header>

      <section id="acreditacion" className="sgx-wel-section sgx-press-acc" aria-labelledby="sgx-press-acc">
        <div className="sgx-wel-head">
          <p className="sgx-wel-kicker">{es ? 'Acreditación' : 'Accreditation'}</p>
          <h2 id="sgx-press-acc" className="sgx-wel-h2">{es ? 'Solicita tu acreditación' : 'Request your accreditation'}</h2>
        </div>
        <ul className="sgx-press-rules">
          <li><Calendar aria-hidden="true" /><span><b>{deadline}.</b> {es ? 'Después de esa fecha no se reciben solicitudes.' : 'No requests are taken after that date.'}</span></li>
          <li><Newspaper aria-hidden="true" /><span><b>{es ? PRESS_RULES.slots.es : PRESS_RULES.slots.en}.</b> {es ? 'Si dos personas del mismo medio solicitan, el equipo acredita a una.' : 'If two people from the same outlet apply, the team accredits one.'}</span></li>
          <li><BadgeCheck aria-hidden="true" /><span><b>{es ? 'Los 3 días.' : 'All 3 days.'}</b> {es ? 'Días 1 y 2 por YouTube Live; Día 3 presencial en Chroma Space Studios con el QR de tu SGX Pass (cuenta dentro de los 6 cupos).' : 'Days 1 and 2 on YouTube Live; Day 3 in person at Chroma Space Studios with your SGX Pass QR (it counts within the 6 slots).'}</span></li>
        </ul>
        <div className="sgx-press-panel">{formBody}</div>
      </section>

      <section id="kit" className="sgx-wel-section" aria-labelledby="sgx-press-kit">
        <div className="sgx-wel-head">
          <p className="sgx-wel-kicker">{es ? 'Kit de prensa' : 'Press kit'}</p>
          <h2 id="sgx-press-kit" className="sgx-wel-h2">{es ? 'Logos, fotos, capturas y ficha' : 'Logos, photos, screenshots and fact sheet'}</h2>
          <p className="sgx-wel-fine">{es ? 'Libre uso editorial para cubrir el Spatialgineers Summit 2026, con el crédito indicado. Para otros usos, escríbenos.' : 'Free editorial use to cover Spatialgineers Summit 2026, with the credit shown. For other uses, write to us.'}</p>
        </div>
        <div className="sgx-press-downloads">
          <a href={PRESS_KIT_ZIP} download className="sgx-press-dl is-zip">
            <Download aria-hidden="true" />
            <span><b>{es ? 'Kit completo (ZIP)' : 'Full kit (ZIP)'}</b><small>{[es ? 'Logos, fotos, capturas y ficha en PDF' : 'Logos, photos, screenshots and PDF fact sheet', mb(sizes[fileName(PRESS_KIT_ZIP)])].filter(Boolean).join(' · ')}</small></span>
          </a>
          <a href={PRESS_FACT_SHEET_PDF} download className="sgx-press-dl">
            <FileText aria-hidden="true" />
            <span><b>{es ? 'Ficha de prensa (PDF)' : 'Press fact sheet (PDF)'}</b><small>{[es ? 'Datos del Summit y bios de los fundadores' : 'Summit facts and founders’ bios', mb(sizes[fileName(PRESS_FACT_SHEET_PDF)])].filter(Boolean).join(' · ')}</small></span>
          </a>
        </div>
        {kinds.map((k) => (
          <div key={k} className="sgx-press-assets-group">
            <h3 className="sgx-press-h3"><ImageIcon aria-hidden="true" />{es ? KIND_TITLE[k].es : KIND_TITLE[k].en}</h3>
            <ul className={`sgx-press-assets is-${k}`}>
              {PRESS_ASSETS.filter((a) => a.kind === k).map((a) => (
                <li key={a.file}>
                  <figure>
                    <a href={a.file} target="_blank" rel="noopener" className="sgx-press-thumb">
                      <img src={a.thumb} alt={es ? a.title.es : a.title.en} loading="lazy" decoding="async" />
                    </a>
                    <figcaption>
                      <span>{es ? a.title.es : a.title.en}</span>
                      <small>{a.credit}</small>
                      <a href={a.file} download><Download aria-hidden="true" />{es ? 'Descargar' : 'Download'}{sizes[fileName(a.file)] ? ` · ${mb(sizes[fileName(a.file)])}` : ''}</a>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section id="ficha" className="sgx-wel-section" aria-labelledby="sgx-press-facts">
        <div className="sgx-wel-head">
          <p className="sgx-wel-kicker">{es ? 'Ficha del evento' : 'Fact sheet'}</p>
          <h2 id="sgx-press-facts" className="sgx-wel-h2">Spatialgineers Summit 2026</h2>
        </div>
        <div className="sgx-press-about">
          <p>{es ? PRESS_ABOUT.summit.es : PRESS_ABOUT.summit.en}</p>
          <p>{es ? PRESS_ABOUT.studio.es : PRESS_ABOUT.studio.en}</p>
        </div>
        <dl className="sgx-press-facts">
          {PRESS_FACTS.map((f) => (
            <div key={f.k.es}><dt>{es ? f.k.es : f.k.en}</dt><dd>{es ? f.v.es : f.v.en}</dd></div>
          ))}
        </dl>
      </section>

      <section id="fundadores" className="sgx-wel-section" aria-labelledby="sgx-press-bios">
        <div className="sgx-wel-head">
          <p className="sgx-wel-kicker">{es ? 'Bios' : 'Bios'}</p>
          <h2 id="sgx-press-bios" className="sgx-wel-h2">{es ? 'Los fundadores' : 'The founders'}</h2>
        </div>
        <div className="sgx-press-bios">
          {PRESS_FOUNDERS.map((f) => (
            <article key={f.id} className="sgx-press-bio">
              <img src={f.photo.replace('/fotos/', '/thumbs/')} alt={`${f.name}, "${f.alias}"`} loading="lazy" decoding="async" width={480} height={331} />
              <div>
                <h3>{f.name} <span>"{f.alias}"</span></h3>
                <p className="sgx-press-bio__role">{es ? f.role.es : f.role.en} · Spatialgineers LLC</p>
                <p>{es ? f.bio.es : f.bio.en}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sgx-wel-section" aria-labelledby="sgx-press-faq">
        <div className="sgx-wel-head">
          <p className="sgx-wel-kicker">{es ? 'Preguntas frecuentes' : 'FAQ'}</p>
          <h2 id="sgx-press-faq" className="sgx-wel-h2">{es ? 'Para medios' : 'For media'}</h2>
        </div>
        <div className="sgx-wel-faq">
          {PRESS_FAQ.map((f, i) => (
            <details key={i} className="sgx-panel" open={i === 0}>
              <summary><h3>{es ? f.q.es : f.q.en}</h3></summary>
              <p>{es ? f.a.es : f.a.en}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="sgx-wel-section sgx-wel-contact" aria-labelledby="sgx-press-contact">
        <div className="sgx-wel-head">
          <p className="sgx-wel-kicker">{es ? 'Contacto de prensa' : 'Press contact'}</p>
          <h2 id="sgx-press-contact" className="sgx-wel-h2">{es ? 'Entrevistas y material' : 'Interviews and material'}</h2>
        </div>
        <ul className="sgx-wel-contact__list">
          <li><a href={`mailto:${SGX_EMAIL}?subject=${encodeURIComponent('Prensa · Spatialgineers Summit 2026')}`}><Mail aria-hidden="true" /><span><small>Email</small>{SGX_EMAIL}</span></a></li>
          <li><a href={TEL}><Phone aria-hidden="true" /><span><small>{es ? 'Teléfono' : 'Phone'}</small>{SGX_PHONE}</span></a></li>
        </ul>
      </section>
    </div>
  );
};

export default SgxPressRoom;
