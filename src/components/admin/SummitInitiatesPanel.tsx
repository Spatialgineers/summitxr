import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2, UserCheck } from 'lucide-react';
import { SGX_PILLARS } from '../../lib/sgxPillars';
import { loadAllInitiates, saveAllInitiates, type SgxInitiate } from '../../lib/summitData';
import { grantCredential, loadInitiateEmails, saveInitiateEmails, type InitiateRequest } from '../../identity/credentials';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PILLAR_BY_KEY, type PillarKey } from '../../lib/sgxPillars';

/* SGX GUILD INITIATES: the roster on the public Guild section and on each
   initiate's Holo Card. The email is private (summit_private + the claim the
   initiate reads when signed in with Google with that same address). */

const blank = (): SgxInitiate & { email: string } => ({
  id: `init_${Date.now().toString(36)}`, name: '', handle: '', role: '', pillar: 'SGX.STORY', specialty: '', specialtyEn: '', photoUrl: '', email: '',
});

export const SummitInitiatesPanel: React.FC = () => {
  const [rows, setRows] = useState<(SgxInitiate & { email: string })[]>([]);
  const [prevEmails, setPrevEmails] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Requests sent from visitors' passes ("Tu rol en el Summit" → Initiate).
  const [requests, setRequests] = useState<InitiateRequest[]>([]);
  const loadRequests = () => getDocs(collection(db, 'initiate_requests'))
    .then((snap) => setRequests(snap.docs.map((d) => d.data() as InitiateRequest)))
    .catch(() => setRequests([]));
  useEffect(() => { loadRequests(); }, []);

  const approve = async (r: InitiateRequest) => {
    setMsg(null);
    try {
      await grantCredential(r.uid, 'initiate', { name: r.name, title: 'Initiate', org: 'SGX Guild Program 2026', topic: r.note, pillar: r.pillar ?? null });
      // Also on the public Guild roster (publish with "Guardar y publicar").
      setRows((x) => [...x, { ...blank(), name: r.name, role: 'Initiate', specialty: r.note || '', email: r.email, pillar: r.pillar ? PILLAR_BY_KEY[r.pillar as PillarKey].id : 'SGX.STORY' }]);
      await deleteDoc(doc(db, 'initiate_requests', r.uid));
      setRequests((x) => x.filter((y) => y.uid !== r.uid));
      setMsg(`${r.name} aprobado: su pase ya dice INITIATE. Revisa su fila abajo y pulsa "Guardar y publicar" para sumarlo al Guild.`);
    } catch (err: any) { setMsg(`No se pudo aprobar: ${err?.message || err}`); }
  };
  const reject = async (r: InitiateRequest) => {
    if (!window.confirm(`¿Rechazar la solicitud de ${r.name}?`)) return;
    await deleteDoc(doc(db, 'initiate_requests', r.uid)).catch(() => undefined);
    setRequests((x) => x.filter((y) => y.uid !== r.uid));
  };

  useEffect(() => {
    const list = loadAllInitiates();
    setRows(list.map((i) => ({ ...i, email: '' })));
    loadInitiateEmails()
      .then((emails) => { setPrevEmails(emails); setRows(list.map((i) => ({ ...i, email: emails[i.id] || '' }))); })
      .catch((err) => setMsg(`No se pudieron cargar los emails: ${err?.message || err}`));
  }, []);

  const set = (id: string, patch: Partial<SgxInitiate & { email: string }>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const save = async () => {
    const clean = rows.filter((r) => r.name.trim());
    const bad = clean.find((r) => r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email.trim()));
    if (bad) { setMsg(`Revisa el email de ${bad.name}.`); return; }
    setBusy(true);
    setMsg(null);
    try {
      const pub: SgxInitiate[] = clean.map(({ email: _e, ...rest }) => ({
        ...rest, name: rest.name.trim(), handle: rest.handle.trim(), role: rest.role.trim(), specialty: rest.specialty.trim(),
        specialtyEn: rest.specialtyEn?.trim() || undefined, photoUrl: rest.photoUrl?.trim() || undefined,
      }));
      const live = await saveAllInitiates(pub);
      if (!live) throw new Error('la lista no se publicó (revisa la sesión de admin)');
      const emails: Record<string, string> = {};
      clean.forEach((r) => { if (r.email.trim()) emails[r.id] = r.email.trim(); });
      await saveInitiateEmails(emails, prevEmails);
      setPrevEmails(emails);
      setMsg(`Guardado: ${pub.length} initiates en vivo, ${Object.keys(emails).length} con email para su Holo Card.`);
    } catch (err: any) {
      setMsg(`No se pudo guardar: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const input = 'bg-black/40 border border-white/15 px-2 py-1.5 text-xs text-white font-mono outline-none w-full';

  return (
    <div className="sgx-panel space-y-3">
      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-[#00DDFF]" />
        <span>SGX Guild · Initiates y su Holo Card</span>
      </h3>
      <p className="text-[11px] text-slate-400 font-mono">
        Lo que pongas aquí sale en la sección Guild y en la Holo Card de cada initiate. El email es privado: cuando ese initiate entra con Google usando ese email, su pase muestra su Holo Card de Initiate.
      </p>
      {requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-[#FDCC0D] font-mono uppercase tracking-wider">Solicitudes desde el pase ({requests.length})</p>
          {requests.map((r) => (
            <div key={r.uid} className="p-2 border border-[#FDCC0D]/40 space-y-1">
              <p className="text-sm text-white"><b>{r.name}</b> · <span className="font-mono text-xs text-slate-300">{r.email} · {r.passCode}{r.pillar ? ` · ${PILLAR_BY_KEY[r.pillar as PillarKey]?.name}` : ''}</span></p>
              {r.note && <p className="text-xs text-slate-300">{r.note}</p>}
              {r.portfolio && <a className="text-xs text-[#00DDFF] underline break-all" href={r.portfolio} target="_blank" rel="noopener noreferrer">{r.portfolio}</a>}
              <div className="flex gap-2 pt-1">
                <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => approve(r)}>Aprobar</button>
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => reject(r)}>Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 border border-white/10">
            <input className={input} placeholder="Nombre" value={r.name} maxLength={100} onChange={(e) => set(r.id, { name: e.target.value })} />
            <input className={input} placeholder="@handle" value={r.handle} maxLength={60} onChange={(e) => set(r.id, { handle: e.target.value })} />
            <input className={input} placeholder="Rol (ej. Shader Artisan)" value={r.role} maxLength={100} onChange={(e) => set(r.id, { role: e.target.value })} />
            <select className={input} value={r.pillar} onChange={(e) => set(r.id, { pillar: e.target.value })}>
              {SGX_PILLARS.map((p) => <option key={p.key} value={p.id}>{p.id}</option>)}
            </select>
            <input className={`${input} md:col-span-2`} placeholder="Especialidad (español)" value={r.specialty} maxLength={160} onChange={(e) => set(r.id, { specialty: e.target.value })} />
            <input className={`${input} md:col-span-2`} placeholder="Specialty (English)" value={r.specialtyEn || ''} maxLength={160} onChange={(e) => set(r.id, { specialtyEn: e.target.value })} />
            <input className={`${input} md:col-span-2`} placeholder="URL de foto (https://…)" value={r.photoUrl || ''} maxLength={500} onChange={(e) => set(r.id, { photoUrl: e.target.value })} />
            <input className={input} placeholder="Email (privado)" type="email" value={r.email} maxLength={150} onChange={(e) => set(r.id, { email: e.target.value })} />
            <button type="button" onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} className="px-2 py-1.5 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center justify-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />Quitar
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setRows((r) => [...r, blank()])} className="px-3 py-2 border border-white/20 text-xs text-slate-200 font-mono flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Añadir initiate</button>
        <button type="button" disabled={busy} onClick={save} className="sgx-btn text-xs font-mono font-bold py-2 px-3 flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />{busy ? 'Guardando…' : 'Guardar y publicar'}</button>
      </div>
      {msg && <p className="text-xs font-mono text-[#00DDFF]">{msg}</p>}
    </div>
  );
};

export default SummitInitiatesPanel;
