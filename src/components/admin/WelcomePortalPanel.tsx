import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { db } from '../../lib/firebase';
import { WELCOME_ROLES, WELCOME_VIDEO_KEYS, parseYouTubeId, welcomeUrlFor, type WelcomeRole, type WelcomeVideoKey } from '../../lib/welcomePortal';

/* Welcome portal (/bienvenida/<rol>): one YouTube video per role plus the
   tour, the SGX Pass and the build videos, in site_config/welcome (public
   read; the server reads it every minute for the page's title, OG tags and
   JSON-LD). Takes an id or any YouTube link. Also copies each role's link. */

const LABEL: Record<WelcomeVideoKey, string> = {
  visitante: 'Creadores (visitante) · vertical 9:16',
  speaker: 'Speakers y artistas · vertical 9:16',
  sponsor: 'Sponsors y marcas · vertical 9:16',
  equipo: 'Equipo (interno) · vertical 9:16',
  pass: 'SGX Pass · vertical 9:16',
  tour: 'Recorrido completo · horizontal 16:9',
  build: 'Cómo se construyó la app · horizontal 16:9 (opcional)',
};

type Values = Record<WelcomeVideoKey, string>;
const EMPTY = Object.fromEntries(WELCOME_VIDEO_KEYS.map((k) => [k, ''])) as Values;

export const WelcomePortalPanel: React.FC = () => {
  const [values, setValues] = useState<Values>(EMPTY);
  const [saved, setSaved] = useState<Values>(EMPTY);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => onSnapshot(doc(db, 'site_config', 'welcome'), (snap) => {
    const v = snap.data() || {};
    const next = { ...EMPTY };
    for (const k of WELCOME_VIDEO_KEYS) next[k] = typeof v[k] === 'string' ? v[k] : '';
    setSaved(next);
    setValues((cur) => (WELCOME_VIDEO_KEYS.some((k) => cur[k] !== EMPTY[k]) ? cur : next));
    setDates(v.dates && typeof v.dates === 'object' ? v.dates : {});
  }, () => { /* no doc yet */ }), []);

  const invalid = WELCOME_VIDEO_KEYS.filter((k) => values[k].trim() && !parseYouTubeId(values[k]));
  const dirty = WELCOME_VIDEO_KEYS.some((k) => values[k].trim() !== saved[k]);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const out: Record<string, unknown> = {};
      const nextDates: Record<string, string> = { ...dates };
      for (const k of WELCOME_VIDEO_KEYS) {
        const id = parseYouTubeId(values[k]) || '';
        out[k] = id;
        // When a video first appears on the portal (its date for the VideoObject in search results).
        if (id && id !== parseYouTubeId(saved[k])) nextDates[k] = today;
        if (!id) delete nextDates[k];
      }
      await setDoc(doc(db, 'site_config', 'welcome'), { ...out, dates: nextDates, updatedAt: serverTimestamp() });
      setValues(out as Values);
      setMsg('Guardado. La página lo muestra al instante; los buscadores y las vistas previas lo leen en menos de un minuto.');
    } catch (e: any) {
      setMsg(`No se pudo guardar: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (role: WelcomeRole) => {
    const url = welcomeUrlFor(role);
    try { await navigator.clipboard.writeText(url); setCopied(role); window.setTimeout(() => setCopied(null), 1800); } catch { setMsg(url); }
  };

  return (
    <div className="sgx-hbctl">
      <p className="text-sm text-slate-400">
        Pega el ID o el enlace de YouTube de cada video (youtu.be/…, watch?v=…, shorts/…). Sin video, la página muestra «Video muy pronto».
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {WELCOME_VIDEO_KEYS.map((k) => {
          const id = parseYouTubeId(values[k]);
          const bad = invalid.includes(k);
          return (
            <label key={k} className="grid gap-1">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300">{LABEL[k]}</span>
              <input
                className="sgx-input"
                value={values[k]}
                onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                placeholder="https://youtu.be/… o el ID"
                aria-invalid={bad || undefined}
                spellCheck={false}
                autoComplete="off"
              />
              <small className={`text-xs font-mono ${bad ? 'text-rose-300' : 'text-slate-500'}`}>
                {bad ? 'No parece un enlace de YouTube.' : id ? `ID: ${id}${dates[k] ? ` · desde ${dates[k]}` : ''}` : 'Vacío'}
                {id && <> · <a className="text-cyan-300 underline" href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">ver</a></>}
              </small>
            </label>
          );
        })}
      </div>
      <div className="sgx-hbctl__row">
        <button type="button" className="sgx-btn sgx-btn--sm" disabled={busy || invalid.length > 0 || !dirty} onClick={save}>
          {busy ? 'Guardando…' : 'Guardar videos'}
        </button>
        {msg && <p className="sgx-hbctl__msg" role="status">{msg}</p>}
      </div>

      <div className="grid gap-2">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-300">Enlaces para compartir</span>
        {WELCOME_ROLES.map((r) => {
          const url = welcomeUrlFor(r);
          return (
            <div key={r} className="sgx-hbctl__row">
              <code className="text-xs text-slate-200 break-all flex-1 min-w-0">{url}</code>
              <a className="sgx-btn sgx-btn--sm sgx-btn--ground" href={url.replace('https://summit.spatialgineers.com', '')} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /> Abrir</a>
              <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => copy(r)}>
                {copied === r ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === r ? 'Copiado' : 'Copiar enlace'}
              </button>
            </div>
          );
        })}
        <small className="text-xs text-slate-500">El enlace de equipo es interno: no aparece en el portal ni en los buscadores.</small>
      </div>
    </div>
  );
};

export default WelcomePortalPanel;
