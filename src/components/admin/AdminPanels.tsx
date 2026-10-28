import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { CheckCircle2, CloudOff, Download, RotateCcw, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { CsvBar } from './CsvBar';
import { CSV_ENTITIES } from '../../lib/csv/entities';
import { downloadBackup, type CsvEntity } from '../../lib/csv/csvEngine';
import {
  INITIAL_SUMMIT_SESSIONS, INITIAL_SUMMIT_SPEAKERS, INITIAL_MAP_360_NODES, INITIAL_EMBED_WIDGETS, SPONSORSHIP_TIERS,
  saveAllSessions, saveAllSpeakers, saveAllMapNodes, saveAllEmbedWidgets, saveAllSponsorshipTiers,
} from '../../lib/summitData';

/* Building blocks of the admin: section frame with publish status, a plain
   table for CSV-managed lists, the admin roster and backup / restore. */

/* ---------- publish status ---------- */

type Pub = { ok: boolean; at: number; message?: string };
const pubLog: Record<string, Pub> = {};
if (typeof window !== 'undefined') {
  window.addEventListener('sgx:cms_published', (e) => { const k = (e as CustomEvent).detail?.key; if (k) pubLog[k] = { ok: true, at: Date.now() }; });
  window.addEventListener('sgx:cms_publish_failed', (e) => { const d = (e as CustomEvent).detail; if (d?.key) pubLog[d.key] = { ok: false, at: Date.now(), message: d.message }; });
}

export function usePublishStatus(keys: string[]): Pub | null {
  const [, force] = useState(0);
  useEffect(() => {
    const bump = () => force((n) => n + 1);
    window.addEventListener('sgx:cms_published', bump);
    window.addEventListener('sgx:cms_publish_failed', bump);
    return () => { window.removeEventListener('sgx:cms_published', bump); window.removeEventListener('sgx:cms_publish_failed', bump); };
  }, []);
  const hits = keys.map((k) => pubLog[k]).filter(Boolean) as Pub[];
  if (!hits.length) return null;
  return hits.sort((a, b) => b.at - a.at)[0];
}

const hhmm = (t: number) => new Date(t).toLocaleTimeString('es-PR', { hour: '2-digit', minute: '2-digit' });

export const PublishBadge: React.FC<{ keys: string[] }> = ({ keys }) => {
  const s = usePublishStatus(keys);
  if (!s) return <span className="sgx-pub" data-state="idle">Contenido en vivo</span>;
  return s.ok
    ? <span className="sgx-pub" data-state="ok"><CheckCircle2 className="w-3.5 h-3.5" /> Publicado {hhmm(s.at)}</span>
    : <span className="sgx-pub" data-state="fail" title={s.message}><CloudOff className="w-3.5 h-3.5" /> Solo en este equipo: {s.message}</span>;
};

/* ---------- section frame ---------- */

export const AdminSection: React.FC<{
  title: string;
  desc?: string;
  publishKeys?: string[];
  csv?: CsvEntity[];
  onCsvApplied?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, desc, publishKeys, csv, onCsvApplied, actions, children }) => (
  <section className="sgx-asec">
    <header className="sgx-asec__head">
      <div>
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      <div className="sgx-asec__meta">
        {publishKeys && <PublishBadge keys={publishKeys} />}
        {actions}
      </div>
    </header>
    {csv && csv.length > 0 && (
      <div className="sgx-asec__csv">
        {csv.map((e) => (
          <div key={e.key} className="sgx-asec__csvrow">
            {csv.length > 1 && <span>{e.label}</span>}
            <CsvBar entity={e} onApplied={onCsvApplied} compact />
          </div>
        ))}
      </div>
    )}
    <div className="sgx-asec__body">{children}</div>
  </section>
);

/* ---------- plain table for CSV-managed lists ---------- */

export function LiveListTable<T extends { id: string }>({ entity, columns, version = 0 }: { entity: CsvEntity<T>; columns: { label: string; get: (x: T) => React.ReactNode }[]; version?: number }) {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => Promise.resolve(entity.load()).then((v) => { if (alive) setItems(v); });
    load();
    window.addEventListener('storage', load);
    return () => { alive = false; window.removeEventListener('storage', load); };
  }, [entity, version]);
  return (
    <div className="sgx-atable">
      <table>
        <thead><tr><th>id</th>{columns.map((c) => <th key={c.label}>{c.label}</th>)}</tr></thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}><td><code>{it.id}</code></td>{columns.map((c) => <td key={c.label}>{c.get(it)}</td>)}</tr>
          ))}
          {!items.length && <tr><td colSpan={columns.length + 1}>Sin elementos todavía. Descarga la plantilla, llénala e impórtala.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- admin roster ---------- */

type AdminDoc = { id: string; email: string; role: string; name?: string };
const ROLES = ['DIRECTOR', 'OPERATOR', 'SUPER_ADMIN'] as const;
const SUPER = ['info@spatialgineers.com', 'support@spatialgineers.com'];

export const AdminRosterPanel: React.FC = () => {
  const { user } = useAuth();
  const isSuper = !!user?.email && SUPER.includes(user.email.toLowerCase());
  const [list, setList] = useState<AdminDoc[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('OPERATOR');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!isSuper) return;
    try {
      const snap = await getDocs(collection(db, 'admins'));
      setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminDoc, 'id'>) })));
    } catch (e: any) { setMsg(`No se pudo leer la lista: ${e?.message || e}`); }
  };
  useEffect(() => { refresh(); }, [isSuper]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    const target = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) { setMsg('Escribe un email válido.'); return; }
    setBusy(true); setMsg(null);
    try {
      // The person must have opened the app once with that email (their player doc holds the uid).
      const snap = await getDocs(query(collection(db, 'players'), where('email', '==', target), limit(1)));
      if (snap.empty) { setMsg('Esa persona tiene que entrar una vez a la app con Google usando ese email; luego vuelve a intentarlo.'); return; }
      const p = snap.docs[0];
      await setDoc(doc(db, 'admins', p.id), { email: target, role, name: (p.data() as any).nickname || '', addedBy: user?.email || '', addedAt: serverTimestamp() });
      setEmail('');
      setMsg(`${target} ahora es admin (${role}).`);
      refresh();
    } catch (e: any) { setMsg(`No se pudo añadir: ${e?.message || e}`); } finally { setBusy(false); }
  };

  const remove = async (a: AdminDoc) => {
    if (!window.confirm(`¿Quitar el acceso de admin a ${a.email}?`)) return;
    try { await deleteDoc(doc(db, 'admins', a.id)); refresh(); } catch (e: any) { setMsg(`No se pudo quitar: ${e?.message || e}`); }
  };

  return (
    <div className="sgx-roster">
      <p className="sgx-roster__note">
        <ShieldCheck className="w-4 h-4" /> Super admins fijos: {SUPER.join(' · ')} (entrando con Google). Aquí se añaden los demás.
      </p>
      {!isSuper ? (
        <p className="sgx-roster__note">Solo un super admin puede ver y cambiar esta lista.</p>
      ) : (
        <>
          <div className="sgx-roster__add">
            <input type="email" placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select value={role} onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button type="button" className="sgx-btn" disabled={busy} onClick={add}><UserPlus className="w-4 h-4" /> Añadir admin</button>
          </div>
          <ul className="sgx-roster__list">
            {list.map((a) => (
              <li key={a.id}>
                <span><b>{a.email}</b>{a.name ? ` · ${a.name}` : ''}</span>
                <small>{a.role}</small>
                <button type="button" onClick={() => remove(a)} aria-label={`Quitar ${a.email}`}><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
            {!list.length && <li><span>Todavía no hay admins adicionales.</span></li>}
          </ul>
        </>
      )}
      {msg && <p className="sgx-roster__msg">{msg}</p>}
    </div>
  );
};

/* ---------- backup and restore ---------- */

export const ContentBackupPanel: React.FC<{ onRestored: () => void }> = ({ onRestored }) => {
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const all = Object.values(CSV_ENTITIES) as CsvEntity[];

  const backupAll = async () => {
    setBusy(true);
    for (const e of all) {
      await downloadBackup(e);
      await new Promise((r) => setTimeout(r, 250)); // browsers drop rapid-fire downloads
    }
    setBusy(false);
    setMsg(`${all.length} archivos de respaldo descargados.`);
  };

  const restore = async () => {
    if (confirm.trim().toUpperCase() !== 'RESTAURAR') return;
    setBusy(true);
    const core = [CSV_ENTITIES.sessions, CSV_ENTITIES.speakers, CSV_ENTITIES.map, CSV_ENTITIES.embeds, CSV_ENTITIES.tiers] as CsvEntity[];
    for (const e of core) { await downloadBackup(e); await new Promise((r) => setTimeout(r, 250)); }
    saveAllSessions(INITIAL_SUMMIT_SESSIONS);
    saveAllSpeakers(INITIAL_SUMMIT_SPEAKERS);
    saveAllMapNodes(INITIAL_MAP_360_NODES);
    saveAllEmbedWidgets(INITIAL_EMBED_WIDGETS);
    saveAllSponsorshipTiers(SPONSORSHIP_TIERS);
    setConfirm(''); setBusy(false);
    setMsg('Agenda, speakers, mapa, apps y niveles volvieron al contenido original. Se descargó un respaldo de lo anterior.');
    onRestored();
  };

  return (
    <div className="sgx-backup">
      <div>
        <h3>Respaldo completo</h3>
        <p>Un CSV por cada tipo de dato, con lo que está publicado ahora.</p>
        <button type="button" className="sgx-btn" disabled={busy} onClick={backupAll}><Download className="w-4 h-4" /> Descargar respaldo de todo</button>
      </div>
      <div data-danger>
        <h3>Restaurar contenido original</h3>
        <p>Vuelve agenda, speakers, mapa, apps y niveles de auspicio al contenido de fábrica, en vivo para todos. Antes descarga un respaldo. Escribe <b>RESTAURAR</b> para confirmar.</p>
        <div className="sgx-backup__row">
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="RESTAURAR" />
          <button type="button" className="sgx-btn" disabled={busy || confirm.trim().toUpperCase() !== 'RESTAURAR'} onClick={restore}><RotateCcw className="w-4 h-4" /> Restaurar</button>
        </div>
      </div>
      {msg && <p className="sgx-roster__msg">{msg}</p>}
    </div>
  );
};
