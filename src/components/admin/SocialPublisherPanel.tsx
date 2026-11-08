import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

/* Publicador de redes: posts for Instagram + the Facebook Page, scheduled in
   Firestore `social_posts`. Approve one post or a whole week with one click;
   the server (src/server/social/metaPublisher.ts) publishes each one at its
   time and writes back the links or the error. Times are Puerto Rico time
   (UTC-4, no daylight saving). Setup: docs/PUBLICADOR_REDES.md. */

type Kind = 'REEL' | 'IMAGE' | 'CAROUSEL';
type Status = 'draft' | 'approved' | 'publishing' | 'published' | 'failed' | 'missed';
interface Result { id?: string; permalink?: string; error?: string }
interface Post {
  id: string; title: string; kind: Kind; caption: string; mediaUrls: string[];
  publishAt: string; networks: { ig: boolean; fb: boolean }; status: Status;
  results?: { ig?: Result; fb?: Result };
}
interface ServerStatus { mode: string; instagram: boolean; facebook: boolean; database: string; lastTick: string | null; lastError: string | null }

const HASHTAGS = '#SpatialgineersSummit #RoadToSummit #Spatialgineers';
const KIND_LABEL: Record<Kind, string> = { REEL: 'Reel', IMAGE: 'Imagen', CAROUSEL: 'Carrusel' };
const STATUS_LABEL: Record<Status, string> = {
  draft: 'Borrador', approved: 'Aprobado · programado', publishing: 'Publicando…',
  published: 'Publicado', failed: 'Falló', missed: 'No salió (pasó la hora)',
};

/* Puerto Rico is UTC-4 all year. */
const toPrInput = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t - 4 * 3600_000).toISOString().slice(0, 16) : '';
};
const fromPrInput = (local: string) => new Date(`${local}:00-04:00`).toISOString();
const validIso = (iso: unknown): iso is string => typeof iso === 'string' && Number.isFinite(Date.parse(iso));
const prLabel = (iso: string) => !validIso(iso) ? 'sin fecha' : new Date(iso).toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const weekKey = (iso: string) => {
  if (!validIso(iso)) return 'sin-fecha';
  const d = new Date(Date.parse(iso) - 4 * 3600_000);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
  return monday.toISOString().slice(0, 10);
};
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'post';

const empty = (): Omit<Post, 'id'> => ({
  title: '', kind: 'REEL', caption: `\n\n${HASHTAGS}`, mediaUrls: [],
  publishAt: new Date(Date.now() + 86400_000).toISOString(), networks: { ig: true, fb: true }, status: 'draft',
});

function validate(p: Omit<Post, 'id'>): string | null {
  if (!p.title.trim()) return 'Ponle un título interno.';
  if (!p.mediaUrls.length || !p.mediaUrls.every((u) => /^https:\/\//.test(u))) return 'Pega los enlaces https de los archivos (uno por línea).';
  if (p.kind === 'CAROUSEL' && p.mediaUrls.length < 2) return 'Un carrusel necesita 2 archivos o más.';
  if (p.kind !== 'CAROUSEL' && p.mediaUrls.length > 1) return 'Reel e imagen llevan un solo archivo.';
  if (!p.caption.includes('#SpatialgineersSummit')) return `El caption tiene que terminar con ${HASHTAGS}.`;
  if (!p.networks.ig && !p.networks.fb) return 'Marca Instagram, Facebook o ambos.';
  return null;
}

export function SocialPublisherPanel() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [edit, setEdit] = useState<(Omit<Post, 'id'> & { id?: string }) | null>(null);
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => onSnapshot(collection(db, 'social_posts'), (snap) => {
    // Normalize every doc so a half-written or hand-edited one can't break the list.
    setPosts(snap.docs.map((d) => {
      const x = d.data() as Partial<Post>;
      return {
        id: d.id,
        title: String(x.title || d.id),
        kind: (['REEL', 'IMAGE', 'CAROUSEL'] as Kind[]).includes(x.kind as Kind) ? x.kind as Kind : 'REEL',
        caption: String(x.caption || ''),
        mediaUrls: Array.isArray(x.mediaUrls) ? x.mediaUrls.filter((u): u is string => typeof u === 'string') : [],
        publishAt: validIso(x.publishAt) ? x.publishAt : '',
        networks: { ig: !!x.networks?.ig, fb: !!x.networks?.fb },
        status: (Object.keys(STATUS_LABEL) as Status[]).includes(x.status as Status) ? x.status as Status : 'draft',
        results: x.results && typeof x.results === 'object' ? x.results : {},
      };
    }));
  }, () => setMsg('No se pudieron leer los posts (¿publicaste las reglas de Firestore?).')), []);

  const api = async (path: string, method = 'GET') => {
    const token = await auth.currentUser?.getIdToken();
    const r = await fetch(`/api/social/publisher/${path}`, { method, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const j = r.ok ? await r.json().catch(() => null) : null;
    return j && typeof j === 'object' ? j : null;
  };
  useEffect(() => {
    let alive = true;
    const load = () => api('status').then((s) => alive && setServer(s)).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const weeks = useMemo(() => {
    const m = new Map<string, Post[]>();
    [...posts].sort((a, b) => a.publishAt.localeCompare(b.publishAt)).forEach((p) => {
      const k = weekKey(p.publishAt);
      m.set(k, [...(m.get(k) || []), p]);
    });
    return [...m.entries()];
  }, [posts]);

  const save = async () => {
    if (!edit) return;
    const err = validate(edit);
    if (err) { setMsg(err); return; }
    setBusy(true);
    const { id, ...data } = edit;
    const docId = id || `${weekKey(data.publishAt)}_${slug(data.title)}`;
    try {
      await setDoc(doc(db, 'social_posts', docId), { ...data, status: 'draft', results: {}, week: weekKey(data.publishAt), updatedAt: serverTimestamp() });
      setEdit(null); setMsg('Guardado como borrador.');
    } catch (e) { setMsg(`No se pudo guardar: ${(e as Error).message}`); }
    setBusy(false);
  };

  const setStatus = async (ids: string[], status: Status) => {
    setBusy(true);
    try {
      const b = writeBatch(db);
      ids.forEach((id) => b.update(doc(db, 'social_posts', id), { status, updatedAt: serverTimestamp() }));
      await b.commit();
      setMsg(status === 'approved' ? `${ids.length} aprobado(s). Salen solos a su hora.` : 'Listo.');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setBusy(false);
  };

  /* Writes a list of posts. approve=true approves them in the same batch. */
  const importList = async (list: unknown, approve = false): Promise<number> => {
    if (!Array.isArray(list)) throw new Error('El JSON tiene que ser una lista');
    const b = writeBatch(db);
    for (const raw of list as any[]) {
      const p: Omit<Post, 'id'> = {
        title: String(raw.title || ''), kind: raw.kind, caption: String(raw.caption || ''),
        mediaUrls: Array.isArray(raw.mediaUrls) ? raw.mediaUrls.map(String) : [],
        publishAt: typeof raw.publishAt === 'string' && raw.publishAt.includes('T') && !/[zZ]|[+-]\d\d:\d\d$/.test(raw.publishAt) ? fromPrInput(raw.publishAt.slice(0, 16)) : new Date(raw.publishAt).toISOString(),
        networks: { ig: raw.networks?.ig !== false, fb: raw.networks?.fb !== false }, status: approve ? 'approved' : 'draft',
      };
      const err = validate(p);
      if (err) throw new Error(`${p.title || '(sin título)'}: ${err}`);
      b.set(doc(db, 'social_posts', `${weekKey(p.publishAt)}_${slug(p.title)}`), { ...p, results: {}, week: weekKey(p.publishAt), updatedAt: serverTimestamp() });
    }
    await b.commit();
    return list.length;
  };

  const importJson = async () => {
    try {
      const n = await importList(JSON.parse(importText));
      setImportText(''); setMsg(`${n} post(s) importados como borrador.`);
    } catch (e) { setMsg(`No se importó nada: ${(e as Error).message}`); }
  };

  /* Paquetes listos: JSON files Claude ships in public/social/batches/. */
  const [batches, setBatches] = useState<{ file: string; label: string }[]>([]);
  const [batch, setBatch] = useState('');
  const [preview, setPreview] = useState<any[] | null>(null);
  useEffect(() => {
    fetch('/social/batches/index.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((l) => {
      if (Array.isArray(l)) setBatches(l.filter((x) => x && typeof x.file === 'string' && /^[\w.-]+\.json$/.test(x.file)));
    }).catch(() => {});
  }, []);
  useEffect(() => {
    setPreview(null);
    if (!batch) return;
    fetch(`/social/batches/${batch}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((l) => setPreview(Array.isArray(l) ? l : null)).catch(() => setPreview(null));
  }, [batch]);
  const loadBatch = async (approve: boolean) => {
    if (!preview) return;
    if (approve && !window.confirm(`¿Cargar y APROBAR ${preview.length} post(s)? Salen solos a su hora en Instagram y Facebook.`)) return;
    setBusy(true);
    try {
      const n = await importList(preview, approve);
      setMsg(approve ? `${n} post(s) cargados y aprobados. Salen solos a su hora.` : `${n} post(s) cargados como borrador.`);
      setBatch('');
    } catch (e) { setMsg(`No se cargó nada: ${(e as Error).message}`); }
    setBusy(false);
  };

  const ready = server && server.instagram && server.facebook && ['bot', 'service', 'emulator'].includes(server.database);

  return (
    <div className="sgx-pub">
      <div className="sgx-pub__server" role="status">
        <strong>Servidor:</strong>{' '}
        {!server ? 'consultando…' : (
          <>
            Instagram {server.instagram ? '✅' : '❌'} · Facebook {server.facebook ? '✅' : '❌'} · Base de datos {['bot', 'service', 'emulator'].includes(server.database) ? '✅' : '❌'}
            {server.mode === 'mock' && ' · modo de prueba'}
            {server.lastError && <span className="sgx-pub__err"> · {server.lastError}</span>}
          </>
        )}
        {server && !ready && <span className="sgx-pub__hint"> Falta configurar el servidor: mira docs/PUBLICADOR_REDES.md.</span>}
        <button type="button" className="sgx-btn sgx-btn--sm" disabled={busy} onClick={() => api('run', 'POST').then(() => setMsg('Revisado.'))}>Revisar ahora</button>
      </div>

      {batches.length > 0 && (
        <div className="sgx-pub__batches">
          <label>Paquetes listos
            <select value={batch} onChange={(e) => setBatch(e.target.value)}>
              <option value="">Elige un paquete…</option>
              {batches.map((x) => <option key={x.file} value={x.file}>{x.label}</option>)}
            </select>
          </label>
          {preview && (
            <>
              <ul>{preview.map((x, i) => <li key={i}><strong>{prLabel(typeof x.publishAt === 'string' && !/[zZ]|[+-]\d\d:\d\d$/.test(x.publishAt) ? fromPrInput(x.publishAt.slice(0, 16)) : String(x.publishAt))}</strong> · {String(x.kind)} · {String(x.title)}</li>)}</ul>
              <div className="sgx-pub__actions">
                <button type="button" className="sgx-btn sgx-btn--sm" disabled={busy} onClick={() => loadBatch(true)}>Cargar y aprobar</button>
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" disabled={busy} onClick={() => loadBatch(false)}>Solo cargar (borrador)</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="sgx-pub__actions">
        <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => setEdit(empty())}>+ Nuevo post</button>
      </div>
      {msg && <p className="sgx-pub__msg" role="status">{msg}</p>}

      {edit && (
        <div className="sgx-pub__form">
          <label>Título interno<input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
          <label>Tipo
            <select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Kind })}>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <label>Fecha y hora (Puerto Rico)<input type="datetime-local" value={toPrInput(edit.publishAt)} onChange={(e) => e.target.value && setEdit({ ...edit, publishAt: fromPrInput(e.target.value) })} /></label>
          <label>Enlaces de los archivos (https, uno por línea)
            <textarea rows={3} value={edit.mediaUrls.join('\n')} onChange={(e) => setEdit({ ...edit, mediaUrls: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
          </label>
          <label>Caption ({edit.caption.length}/2200)<textarea rows={6} value={edit.caption} onChange={(e) => setEdit({ ...edit, caption: e.target.value })} /></label>
          <div className="sgx-pub__nets">
            <label><input type="checkbox" checked={edit.networks.ig} onChange={(e) => setEdit({ ...edit, networks: { ...edit.networks, ig: e.target.checked } })} /> Instagram</label>
            <label><input type="checkbox" checked={edit.networks.fb} onChange={(e) => setEdit({ ...edit, networks: { ...edit.networks, fb: e.target.checked } })} /> Facebook</label>
          </div>
          <div className="sgx-pub__actions">
            <button type="button" className="sgx-btn sgx-btn--sm" disabled={busy} onClick={save}>Guardar borrador</button>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => setEdit(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {weeks.length === 0 && <p className="sgx-pub__empty">No hay posts todavía. Crea uno o importa la semana.</p>}
      {weeks.map(([week, list]) => {
        const drafts = list.filter((p) => p.status === 'draft');
        return (
          <section key={week} className="sgx-pub__week">
            <header>
              <h4>{week === 'sin-fecha' ? 'Sin fecha' : `Semana del ${new Date(`${week}T12:00:00Z`).toLocaleDateString('es-PR', { day: 'numeric', month: 'long' })}`}</h4>
              {drafts.length > 0 && (
                <button type="button" className="sgx-btn sgx-btn--sm" disabled={busy}
                  onClick={() => window.confirm(`¿Aprobar ${drafts.length} post(s) de esta semana? Salen solos a su hora en Instagram y Facebook.`) && setStatus(drafts.map((p) => p.id), 'approved')}>
                  Aprobar la semana ({drafts.length})
                </button>
              )}
            </header>
            <ul>
              {list.map((p) => (
                <li key={p.id} className={`sgx-pub__post is-${p.status}`}>
                  <div className="sgx-pub__thumb">
                    {!p.mediaUrls[0] ? null : p.kind === 'REEL'
                      ? <video src={p.mediaUrls[0]} muted playsInline preload="metadata" />
                      : <img src={p.mediaUrls[0]} alt="" loading="lazy" />}
                  </div>
                  <div className="sgx-pub__body">
                    <p className="sgx-pub__meta"><strong>{prLabel(p.publishAt)}</strong> · {KIND_LABEL[p.kind]} · {[p.networks.ig && 'IG', p.networks.fb && 'FB'].filter(Boolean).join(' + ')} · <span className="sgx-pub__status">{STATUS_LABEL[p.status]}</span></p>
                    <p className="sgx-pub__title">{p.title}</p>
                    <details><summary>Caption</summary><pre>{p.caption}</pre></details>
                    {(['ig', 'fb'] as const).map((n) => p.results?.[n] && (
                      <p key={n} className="sgx-pub__res">
                        {n === 'ig' ? 'Instagram' : 'Facebook'}:{' '}
                        {p.results[n]!.permalink ? <a href={p.results[n]!.permalink} target="_blank" rel="noreferrer">ver post</a> : <span className="sgx-pub__err">{p.results[n]!.error}</span>}
                      </p>
                    ))}
                    <div className="sgx-pub__actions">
                      {p.status === 'draft' && <button type="button" className="sgx-btn sgx-btn--sm" disabled={busy} onClick={() => setStatus([p.id], 'approved')}>Aprobar</button>}
                      {p.status === 'approved' && <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" disabled={busy} onClick={() => setStatus([p.id], 'draft')}>Quitar aprobación</button>}
                      {(p.status === 'failed' || p.status === 'missed') && <button type="button" className="sgx-btn sgx-btn--sm" disabled={busy}
                        onClick={() => updateDoc(doc(db, 'social_posts', p.id), { status: 'approved', publishAt: new Date().toISOString(), updatedAt: serverTimestamp() })}>Reintentar ahora</button>}
                      {(p.status === 'draft' || p.status === 'approved') && <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => setEdit({ ...p })}>Editar</button>}
                      {p.status !== 'publishing' && <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => window.confirm('¿Borrar este post del Publicador? (No borra nada ya publicado en las redes.)') && deleteDoc(doc(db, 'social_posts', p.id))}>Borrar</button>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <details className="sgx-pub__import">
        <summary>Importar una semana (JSON)</summary>
        <p>Pega la lista que te prepara Claude: <code>[{'{'}"title","kind","publishAt","mediaUrls","caption"{'}'}]</code>. La hora sin zona se toma como hora de Puerto Rico. Todo entra como borrador.</p>
        <textarea rows={6} value={importText} onChange={(e) => setImportText(e.target.value)} />
        <button type="button" className="sgx-btn sgx-btn--sm" disabled={!importText.trim()} onClick={importJson}>Importar</button>
      </details>
    </div>
  );
}
