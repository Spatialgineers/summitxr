import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Check, Copy, Download, Eye, EyeOff, Mail, MessageCircle } from 'lucide-react';
import { loadPersistedSessions } from '../../lib/summitData';
import { findPillar } from '../../lib/sgxPillars';
import { DAY_LABEL, PILLAR_OPTIONS, inviteEmailHtml, inviteMessage, type InviteFields } from '../../lib/welcomeInvites';
import { WELCOME_ROLES, WELCOME_ROLE_COPY, welcomeIdsFromDoc, type WelcomeRole, type WelcomeVideoIds } from '../../lib/welcomePortal';

/* Invite generator: a short message per role with the person's name, their
   session (typed or taken from the agenda) and their personal welcome link,
   ready to copy, send by WhatsApp or by email, plus the same invite as an
   HTML email (copy formatted, preview, download). Templates: lib/welcomeInvites. */

/** Copies the email formatted (text/html + text/plain); without the Clipboard API, selects a rendered copy. */
async function copyHtml(html: string, text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })]);
      return true;
    }
  } catch { /* fall back below */ }
  try {
    const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] || html;
    const box = document.createElement('div');
    box.contentEditable = 'true';
    box.style.cssText = 'position:fixed;left:-10000px;top:0;width:600px;';
    box.innerHTML = body; // our own template, every field escaped
    document.body.appendChild(box);
    const range = document.createRange();
    range.selectNodeContents(box);
    const sel = window.getSelection();
    sel?.removeAllRanges(); sel?.addRange(range);
    const ok = document.execCommand('copy');
    sel?.removeAllRanges(); box.remove();
    return ok;
  } catch { return false; }
}

export const WelcomeInvitePanel: React.FC = () => {
  const sessions = useMemo(() => [...loadPersistedSessions()].sort((a, b) => a.day - b.day || a.startMinutes - b.startMinutes), []);
  const [role, setRole] = useState<WelcomeRole>('speaker');
  const [f, setF] = useState<InviteFields>({});
  const [copied, setCopied] = useState<'text' | 'html' | null>(null);
  const [preview, setPreview] = useState(false);
  const [ids, setIds] = useState<WelcomeVideoIds>({});
  useEffect(() => onSnapshot(doc(db, 'site_config', 'welcome'), (snap) => setIds(welcomeIdsFromDoc(snap.data())), () => {}), []);
  const flash = (k: 'text' | 'html') => { setCopied(k); window.setTimeout(() => setCopied(null), 1800); };
  const set = (patch: Partial<InviteFields>) => setF((cur) => ({ ...cur, ...patch }));

  const pickSession = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) { set({ sessionId: undefined }); return; }
    set({ sessionId: s.id, dia: s.day, hora: s.startTime, titulo: s.title, pilar: findPillar(s.pillarId)?.slug });
  };
  // Typing over a field taken from the agenda turns the link into explicit fields.
  const edit = (patch: Partial<InviteFields>) => set({ ...patch, sessionId: undefined });

  const msg = inviteMessage(role, f);
  const email = inviteEmailHtml(role, f, ids[role]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([email], { type: 'text/html' }));
    const a = document.createElement('a');
    const who = (f.nombre || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.href = url; a.download = `invitacion-${role}${who ? `-${who}` : ''}.html`;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const hasSession = role === 'speaker' || role === 'equipo';
  const copy = async () => {
    try { await navigator.clipboard.writeText(msg.text); flash('text'); } catch { /* select the text by hand */ }
  };

  return (
    <div className="sgx-hbctl">
      <strong className="text-white">Mensaje de invitación</strong>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-300">Rol</span>
          <select className="sgx-input" value={role} onChange={(e) => setRole(e.target.value as WelcomeRole)}>
            {WELCOME_ROLES.map((r) => <option key={r} value={r}>{WELCOME_ROLE_COPY[r].label.es}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-300">Nombre</span>
          <input className="sgx-input" maxLength={60} value={f.nombre || ''} onChange={(e) => set({ nombre: e.target.value })} placeholder="Ej: Sofía" />
        </label>

        {hasSession && (
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300">Tomar de la agenda</span>
            <select className="sgx-input" value={f.sessionId || ''} onChange={(e) => pickSession(e.target.value)}>
              <option value="">— Escribir a mano —</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{`${DAY_LABEL[s.day]} · ${s.startTime} · ${s.title}`}</option>)}
            </select>
          </label>
        )}

        {hasSession && (
          <>
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300">Presentación (nombre o tema)</span>
              <input className="sgx-input" maxLength={120} value={f.titulo || ''} onChange={(e) => edit({ titulo: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300">Pilar</span>
              <select className="sgx-input" value={f.pilar || ''} onChange={(e) => edit({ pilar: e.target.value || undefined })}>
                <option value="">—</option>
                {PILLAR_OPTIONS.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            </label>
            <div className="grid gap-3 grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-300">Día</span>
                <select className="sgx-input" value={f.dia || ''} onChange={(e) => edit({ dia: (Number(e.target.value) || undefined) as InviteFields['dia'] })}>
                  <option value="">—</option>
                  {([1, 2, 3] as const).map((d) => <option key={d} value={d}>{DAY_LABEL[d]}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-300">Hora</span>
                <input className="sgx-input" maxLength={20} value={f.hora || ''} onChange={(e) => edit({ hora: e.target.value })} placeholder="10:00 AM" />
              </label>
            </div>
          </>
        )}

        {role === 'sponsor' && (
          <label className="grid gap-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300">Paquete (opcional)</span>
            <select className="sgx-input" value={f.paquete || ''} onChange={(e) => set({ paquete: Number(e.target.value) || undefined })}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((k) => <option key={k} value={k}>Paquete {k}</option>)}
            </select>
          </label>
        )}
      </div>

      <textarea className="sgx-input font-mono text-xs" readOnly rows={5} value={msg.text} aria-label="Mensaje listo para enviar" />
      <div className="sgx-hbctl__row">
        <button type="button" className="sgx-btn sgx-btn--sm" onClick={copy}>
          {copied === 'text' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === 'text' ? 'Copiado' : 'Copiar'}
        </button>
        <a className="sgx-btn sgx-btn--sm sgx-btn--ground" href={`https://wa.me/?text=${encodeURIComponent(msg.text)}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>
        <a className="sgx-btn sgx-btn--sm sgx-btn--ground" href={`mailto:?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.text)}`}>
          <Mail className="w-3.5 h-3.5" /> Email
        </a>
      </div>
      <small className="text-xs text-slate-500 break-all">Enlace personal: {msg.link}</small>

      <strong className="text-white">Email en HTML</strong>
      <div className="sgx-hbctl__row">
        <button type="button" className="sgx-btn sgx-btn--sm" onClick={async () => { if (await copyHtml(email, msg.text)) flash('html'); }}>
          {copied === 'html' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === 'html' ? 'Copiado' : 'Copiar email (HTML)'}
        </button>
        <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" aria-pressed={preview} onClick={() => setPreview(!preview)}>
          {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {preview ? 'Ocultar vista previa' : 'Vista previa'}
        </button>
        <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={download}>
          <Download className="w-3.5 h-3.5" /> Descargar .html
        </button>
      </div>
      {preview && (
        <iframe title="Vista previa del email" sandbox="" srcDoc={email} style={{ width: '100%', maxWidth: 640, height: 820, border: '1px solid rgba(255,255,255,0.15)', background: '#050505' }} />
      )}
      <small className="text-xs text-slate-500">Pega el email copiado directo en Gmail, Outlook o Apple Mail; asunto sugerido: «{msg.subject}».</small>
    </div>
  );
};

export default WelcomeInvitePanel;
