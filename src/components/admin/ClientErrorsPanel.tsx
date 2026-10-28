import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

/* Errores en vivo: what broke on visitors' phones, grouped, newest first.
   Reports come from src/lib/errorMonitor.ts (collection client_errors). */

export interface ClientErrorDoc {
  id: string;
  kind: string;
  message: string;
  stack?: string;
  fingerprint: string;
  component?: string;
  path?: string;
  ua?: string;
  viewport?: string;
  online?: boolean;
  sessionId: string;
  build?: string;
  at?: Timestamp | null;
}

const WINDOW = 400;

/** Live feed of the latest reports. Shared by the nav badge and the panel. */
export function useClientErrors(enabled: boolean) {
  const [items, setItems] = useState<ClientErrorDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'client_errors'), orderBy('at', 'desc'), limit(WINDOW));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClientErrorDoc, 'id'>) })));
      setError(null);
    }, (e) => setError(e.message));
  }, [enabled]);
  return { items, error };
}

const ms = (t?: Timestamp | null) => (t && typeof t.toMillis === 'function' ? t.toMillis() : Date.now());

function device(ua = ''): string {
  if (/iPhone|iPad/.test(ua)) return 'iPhone/iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS X/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Otro';
}
function browser(ua = ''): string {
  if (/CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/FxiOS|Firefox\//.test(ua)) return 'Firefox';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Instagram|FBAN|FBAV/.test(ua)) return 'In-app (IG/FB)';
  if (/Safari\//.test(ua)) return 'Safari';
  return '';
}
function ago(t: number): string {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

const KIND_LABEL: Record<string, string> = {
  error: 'Error', promise: 'Promesa', react: 'Pantalla', chunk: 'Carga', webgl: '3D', manual: 'Aviso',
};

export const ClientErrorsPanel: React.FC<{ items: ClientErrorDoc[]; error: string | null }> = ({ items, error }) => {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 30_000); return () => window.clearInterval(t); }, []);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; docs: ClientErrorDoc[]; last: number; first: number; sessions: Set<string>; devices: Map<string, number> }>();
    for (const d of items) {
      const g = map.get(d.fingerprint) || { key: d.fingerprint, docs: [], last: 0, first: Infinity, sessions: new Set<string>(), devices: new Map<string, number>() };
      g.docs.push(d);
      const t = ms(d.at);
      g.last = Math.max(g.last, t);
      g.first = Math.min(g.first, t);
      g.sessions.add(d.sessionId);
      const dev = `${device(d.ua)} ${browser(d.ua)}`.trim();
      g.devices.set(dev, (g.devices.get(dev) || 0) + 1);
      map.set(d.fingerprint, g);
    }
    return Array.from(map.values()).sort((a, b) => b.last - a.last);
  }, [items]);

  const now = Date.now();
  const last15 = items.filter((d) => now - ms(d.at) < 15 * 60_000);
  const last60 = items.filter((d) => now - ms(d.at) < 60 * 60_000);
  const devices15 = new Set(last15.map((d) => d.sessionId)).size;

  const resolve = async (key: string) => {
    const g = groups.find((x) => x.key === key);
    if (!g || !window.confirm(`¿Marcar como resuelto? Se borran ${g.docs.length} reporte(s) de este error.`)) return;
    setBusy(key);
    try { await Promise.all(g.docs.map((d) => deleteDoc(doc(db, 'client_errors', d.id)))); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-xs font-mono text-red-300 border border-red-500/40 p-3">No se pudieron leer los reportes: {error}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Últimos 15 min', String(last15.length), last15.length ? 'text-[#FDCC0D]' : 'text-white'],
          ['Teléfonos afectados (15 min)', String(devices15), devices15 ? 'text-[#FDCC0D]' : 'text-white'],
          ['Última hora', String(last60.length), 'text-white'],
          ['Errores distintos', String(groups.length), 'text-white'],
        ].map(([label, value, cls]) => (
          <div key={label} className="border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-slate-300 border border-white/10 p-4">Sin errores reportados. Cuando algo falle en el teléfono de alguien, aparece aquí en segundos.</p>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => {
            const d = g.docs[0];
            const isOpen = open === g.key;
            const fresh = now - g.last < 5 * 60_000;
            return (
              <li key={g.key} className={`border ${fresh ? 'border-[#FDCC0D]/70' : 'border-white/10'} bg-black/30`}>
                <button type="button" onClick={() => setOpen(isOpen ? null : g.key)} aria-expanded={isOpen} className="w-full text-left p-3 flex flex-wrap items-start gap-x-3 gap-y-1">
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 border border-white/20 text-slate-200">{KIND_LABEL[d.kind] || d.kind}</span>
                  <span className="flex-1 min-w-0 text-sm text-white break-words">{d.message}</span>
                  <span className="text-xs font-mono text-slate-300 tabular-nums">{g.docs.length}× · {g.sessions.size} disp. · {ago(g.last)}</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2 text-xs">
                    <p className="text-slate-300"><strong className="text-slate-100">Dispositivos:</strong> {Array.from(g.devices.entries()).map(([k, n]) => `${k} (${n})`).join(', ')}</p>
                    <p className="text-slate-300"><strong className="text-slate-100">Dónde:</strong> {Array.from(new Set(g.docs.map((x) => x.path || '/'))).slice(0, 5).join(', ')}</p>
                    {d.component && <p className="text-slate-300"><strong className="text-slate-100">Componente:</strong> {d.component}</p>}
                    <p className="text-slate-300"><strong className="text-slate-100">Primera vez:</strong> {new Date(g.first).toLocaleString('es-PR')} · <strong className="text-slate-100">Pantalla:</strong> {d.viewport} · {d.online === false ? 'sin conexión' : 'en línea'}</p>
                    {d.stack && <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all bg-black/50 border border-white/10 p-2 text-[11px] text-slate-300">{d.stack}</pre>}
                    <button type="button" disabled={busy === g.key} onClick={() => resolve(g.key)} className="sgx-btn sgx-btn--sm">{busy === g.key ? 'Borrando…' : 'Marcar resuelto'}</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] text-slate-400">Se muestran los últimos {WINDOW} reportes. Cada teléfono envía como máximo 15 por visita y los repetidos se agrupan.</p>
    </div>
  );
};

export default ClientErrorsPanel;
