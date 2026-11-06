import React, { useCallback, useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

/* Radar social · Instagram: the posts the server found with the Summit hashtags
   or tagging @spatialgineers (GET /api/social/instagram/candidates, admins only).
   Aprobar / Ocultar write the ids to site_config/social { approvedIg, hiddenIg };
   the public mural shows the approved ones. See docs/INSTAGRAM_RADAR.md. */

interface Candidate {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
  username: string | null;
  source: string;
}
interface Payload {
  status: 'disabled' | 'mock' | 'ok' | 'error' | 'syncing';
  lastSync: string | null;
  error: string | null;
  hashtags: string[];
  approved: string[];
  hidden: string[];
  candidates: Candidate[];
}

const STATUS_LABEL: Record<Payload['status'], string> = {
  disabled: 'Apagado: falta configurar IG_GRAPH_TOKEN e IG_USER_ID en el servidor (docs/INSTAGRAM_RADAR.md).',
  mock: 'Modo de prueba: publicaciones de ejemplo, sin llamar a Instagram.',
  ok: 'Conectado a Instagram.',
  error: 'Error al sincronizar con Instagram.',
  syncing: 'Sincronizando…',
};

export const InstagramRadarPanel: React.FC = () => {
  const [data, setData] = useState<Payload | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'hidden' | 'all'>('pending');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const r = await fetch('/api/social/instagram/candidates', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (r.ok) { setData(await r.json()); setMsg(null); }
      else setMsg(r.status === 401 ? 'El servidor no reconoce tu sesión como admin.' : `No se pudo cargar (HTTP ${r.status}).`);
    } catch { setMsg('Sin conexión con el servidor.'); }
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  const moderate = async (id: string, action: 'approve' | 'hide' | 'reset') => {
    setBusy(id);
    try {
      const patch = action === 'approve'
        ? { approvedIg: arrayUnion(id), hiddenIg: arrayRemove(id) }
        : action === 'hide'
          ? { approvedIg: arrayRemove(id), hiddenIg: arrayUnion(id) }
          : { approvedIg: arrayRemove(id), hiddenIg: arrayRemove(id) };
      await setDoc(doc(db, 'site_config', 'social'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
      setData((d) => d && ({
        ...d,
        approved: action === 'approve' ? [...new Set([...d.approved, id])] : d.approved.filter((x) => x !== id),
        hidden: action === 'hide' ? [...new Set([...d.hidden, id])] : d.hidden.filter((x) => x !== id),
      }));
      setMsg(action === 'approve' ? 'Aprobada. Aparece en el radar social en un minuto.' : action === 'hide' ? 'Oculta.' : 'Devuelta a pendientes.');
    } catch (e: any) {
      setMsg(`No se pudo guardar: ${e?.message || e}`);
    } finally { setBusy(null); }
  };

  const approved = new Set(data?.approved || []);
  const hidden = new Set(data?.hidden || []);
  const stateOf = (id: string) => (hidden.has(id) ? 'hidden' : approved.has(id) ? 'approved' : 'pending');
  const list = (data?.candidates || []).filter((c) => filter === 'all' || stateOf(c.id) === filter);

  return (
    <div className="sgx-igradar-admin space-y-3">
      <h3 className="text-sm font-bold text-white">Radar social · Instagram</h3>
      <p className="sgx-igradar-admin__status text-xs text-slate-300" role="status" data-status={data?.status || ''}>
        {data ? STATUS_LABEL[data.status] : 'Cargando…'}
        {data?.lastSync && <> · Última sincronización: {new Date(data.lastSync).toLocaleString('es-PR')}</>}
        {data?.hashtags?.length ? <> · Hashtags: {data.hashtags.map((h) => `#${h}`).join(', ')}</> : null}
        {data?.error && <span className="block text-red-300">Error: {data.error}</span>}
      </p>
      {msg && <p className="text-xs text-amber-200" aria-live="polite">{msg}</p>}
      <div className="flex flex-wrap gap-2 text-xs" role="group" aria-label="Filtrar">
        {([['pending', 'Pendientes'], ['approved', 'Aprobadas'], ['hidden', 'Ocultas'], ['all', 'Todas']] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={filter === k} className={`sgx-btn px-2.5 py-1 ${filter === k ? '' : 'opacity-60'}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
        <button type="button" className="sgx-btn px-2.5 py-1" onClick={load}>Recargar</button>
      </div>
      {data && list.length === 0 && <p className="text-xs text-slate-400">No hay publicaciones en esta vista.</p>}
      <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 list-none p-0 m-0">
        {list.map((c) => {
          const img = c.mediaType === 'VIDEO' ? c.thumbnailUrl : (c.mediaUrl || c.thumbnailUrl);
          const st = stateOf(c.id);
          return (
            <li key={c.id} className="sgx-igradar-admin__card border border-slate-700 bg-black/40 overflow-hidden" data-id={c.id} data-state={st}>
              <div className="aspect-square bg-black">
                {img ? <img src={img} alt={c.caption.slice(0, 100) || 'Publicación de Instagram'} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : null}
              </div>
              <div className="p-2 space-y-1.5 text-xs">
                <p className="text-slate-400">{c.username ? `@${c.username} · ` : ''}{c.timestamp ? new Date(c.timestamp).toLocaleDateString('es-PR') : ''} · {c.source === 'tag' ? 'nos etiquetó' : c.source}</p>
                <p className="text-slate-200 line-clamp-3">{c.caption || '(sin texto)'}</p>
                <a href={c.permalink} target="_blank" rel="noopener noreferrer" className="underline text-[var(--sgx-primary)]">Ver en Instagram</a>
                <div className="flex gap-1.5 pt-1">
                  {st !== 'approved' && <button type="button" disabled={busy === c.id} className="sgx-btn px-2 py-1 sgx-igradar-admin__approve" onClick={() => moderate(c.id, 'approve')}>Aprobar</button>}
                  {st !== 'hidden' && <button type="button" disabled={busy === c.id} className="sgx-btn px-2 py-1 sgx-igradar-admin__hide" onClick={() => moderate(c.id, 'hide')}>Ocultar</button>}
                  {st !== 'pending' && <button type="button" disabled={busy === c.id} className="sgx-btn px-2 py-1" onClick={() => moderate(c.id, 'reset')}>Pendiente</button>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
