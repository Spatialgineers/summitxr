import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Download, KeyRound, RefreshCw, Search, Users } from 'lucide-react';
import { db } from '../../lib/firebase';
import { approveSpeakerSubmission, fetchSpeakerSubmissions, rejectSpeakerSubmission } from '../../lib/summitData';
import type { SummitSpeaker } from '../../types/summit';
import { findPillar } from '../../lib/sgxPillars';
import { grantCredential } from '../../identity/credentials';
import { SummitInitiatesPanel } from './SummitInitiatesPanel';

/* INSCRITOS: every SGX Pass forged lands in `ticket_inquiries`. The team
   reviews them here, marks who gets the Day 3 invitation, exports the list
   for the invitation email, and sets the Chroma check-in code (kept in
   `summit_private`, which only admins can read). */

type RegStatus = 'PENDING' | 'INVITED' | 'CONFIRMED' | 'DECLINED';

interface Registration {
  id: string;
  fullName: string;
  email: string;
  ticketType: string;
  roleTitle: string;
  organization: string;
  referenceCode: string;
  status: RegStatus;
  imageConsent: boolean | null;
  createdAt: number | null;
}

const STATUS_LABEL: Record<RegStatus, string> = {
  PENDING: 'Pendiente',
  INVITED: 'Invitado Día 3',
  CONFIRMED: 'Confirmado',
  DECLINED: 'No asiste',
};

const STATUS_CLASS: Record<RegStatus, string> = {
  PENDING: 'text-slate-300 border-slate-600',
  INVITED: 'text-[#00DDFF] border-[#00DDFF]/60',
  CONFIRMED: 'text-[#FDCC0D] border-[#FDCC0D]/70',
  DECLINED: 'text-slate-500 border-slate-700',
};

const MAX_ROWS = 5000;
const PUBLIC_URL = 'https://summit.spatialgineers.com';

function toMillis(v: any): number | null {
  if (!v) return null;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  return null;
}

function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  // Names come from visitors: neutralize spreadsheet formulas (=, +, -, @).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const SummitRegistrationsPanel: React.FC = () => {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SHOWCASE_PHYSICAL' | 'DIGITAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RegStatus>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [checkinCode, setCheckinCode] = useState('');
  const [savedCode, setSavedCode] = useState('');
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const [speakerSubs, setSpeakerSubs] = useState<SummitSpeaker[]>([]);
  const [speakerMsg, setSpeakerMsg] = useState<string | null>(null);
  const loadSpeakerSubs = () => fetchSpeakerSubmissions().then(setSpeakerSubs).catch((err) => setSpeakerMsg(`No se pudieron cargar: ${err?.message || err}`));
  useEffect(() => { loadSpeakerSubs(); }, []);
  const decideSpeaker = async (sp: SummitSpeaker, approve: boolean) => {
    try {
      const uid = (sp as any).submittedBy as string | null | undefined;
      let card = '';
      if (approve) {
        await approveSpeakerSubmission(sp);
        // Their speaker Holo Card becomes official on their own pass.
        if (uid) {
          await grantCredential(uid, 'speaker', {
            name: sp.name, title: sp.role, org: sp.organization,
            topic: sp.day ? `Día ${sp.day}` : undefined,
            pillar: findPillar(sp.pillarId)?.key ?? null, photo: sp.avatarUrl || null, handle: sp.handle,
          }).then(() => { card = ' Su Holo Card de speaker ya es oficial.'; })
            .catch(() => { card = ' (No se pudo marcar su Holo Card como oficial.)'; });
        }
      } else await rejectSpeakerSubmission(sp.id);
      setSpeakerMsg(approve ? `${sp.name} ya aparece en el directorio público.${card}` : `Solicitud de ${sp.name} descartada.`);
      loadSpeakerSubs();
    } catch (err: any) {
      setSpeakerMsg(`No se pudo completar: ${err?.message || err}`);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'ticket_inquiries'), orderBy('timestamp', 'desc'), limit(MAX_ROWS));
    const unsub = onSnapshot(q, (snap) => {
      const mapped = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          fullName: x.fullName || '',
          email: x.email || '',
          ticketType: x.ticketType || 'DIGITAL',
          roleTitle: x.roleTitle || '',
          organization: x.organization || '',
          referenceCode: x.referenceCode || '',
          status: (['PENDING', 'INVITED', 'CONFIRMED', 'DECLINED'].includes(x.status) ? x.status : 'PENDING') as RegStatus,
          imageConsent: typeof x.imageConsent === 'boolean' ? x.imageConsent : null,
          createdAt: toMillis(x.timestamp),
          invitedAt: toMillis(x.invitedAt),
        };
      });
      // Before this version every digital pass was written as CONFIRMED: that is not a Day 3 confirmation.
      // And older passes could register more than once: keep one row per pass code, newest details,
      // most advanced status.
      const rank: Record<RegStatus, number> = { PENDING: 0, DECLINED: 1, INVITED: 2, CONFIRMED: 3 };
      const byCode = new Map<string, Registration & { invitedAt: number | null }>();
      for (const r of mapped) {
        if (r.ticketType === 'DIGITAL' && r.status === 'CONFIRMED' && !r.invitedAt) r.status = 'PENDING';
        const key = r.referenceCode || r.id;
        const prev = byCode.get(key);
        if (!prev) { byCode.set(key, r); continue; }
        const newest = (r.createdAt || 0) >= (prev.createdAt || 0) ? r : prev;
        const status = rank[r.status] >= rank[prev.status] ? r.status : prev.status;
        const statusDoc = rank[r.status] >= rank[prev.status] ? r : prev;
        byCode.set(key, { ...newest, id: statusDoc.id, status, imageConsent: newest.imageConsent ?? prev.imageConsent });
      }
      setRows(Array.from(byCode.values()));
      setLoading(false);
      setError(null);
    }, (err) => {
      setLoading(false);
      setError(err?.message || String(err));
    });
    return unsub;
  }, []);

  useEffect(() => {
    getDoc(doc(db, 'summit_private', 'checkin'))
      .then((snap) => {
        const code = (snap.exists() && (snap.data() as any).code) || '';
        setSavedCode(code);
        setCheckinCode(code);
      })
      .catch(() => {});
  }, []);

  const checkinUrl = savedCode ? `${PUBLIC_URL}/?checkin=${encodeURIComponent(savedCode)}` : '';
  useEffect(() => {
    if (!checkinUrl) { setQr(null); return; }
    QRCode.toDataURL(checkinUrl, { margin: 1, width: 360, color: { dark: '#050505', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [checkinUrl]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) =>
      (typeFilter === 'ALL' || r.ticketType === typeFilter) &&
      (statusFilter === 'ALL' || r.status === statusFilter) &&
      (!s || `${r.fullName} ${r.email} ${r.organization} ${r.referenceCode}`.toLowerCase().includes(s)));
  }, [rows, search, typeFilter, statusFilter]);

  const counts = useMemo(() => ({
    total: rows.length,
    showcase: rows.filter((r) => r.ticketType === 'SHOWCASE_PHYSICAL').length,
    invited: rows.filter((r) => r.status === 'INVITED' || r.status === 'CONFIRMED').length,
    confirmed: rows.filter((r) => r.status === 'CONFIRMED').length,
    noConsent: rows.filter((r) => r.imageConsent !== true).length,
  }), [rows]);

  const setStatus = async (r: Registration, status: RegStatus) => {
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, 'ticket_inquiries', r.id), {
        status,
        ...(status === 'INVITED' ? { invitedAt: serverTimestamp() } : {}),
      });
    } catch (err: any) {
      setError(`No se pudo actualizar ${r.email}: ${err?.message || err}`);
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const header = ['Nombre', 'Correo', 'Tipo', 'Estado', 'Rol', 'Organización', 'Código del pase', 'Consentimiento de imagen', 'Fecha de registro'];
    const lines = filtered.map((r) => [
      r.fullName, r.email, r.ticketType === 'SHOWCASE_PHYSICAL' ? 'Día 3 presencial' : 'Digital', STATUS_LABEL[r.status],
      r.roleTitle, r.organization, r.referenceCode,
      r.imageConsent === true ? 'Sí' : r.imageConsent === false ? 'No' : 'Sin dato',
      r.createdAt ? new Date(r.createdAt).toISOString() : '',
    ].map(csvCell).join(','));
    const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGX_Summit_2026_inscritos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const saveCode = async () => {
    const code = checkinCode.trim().toLowerCase();
    if (!/^[a-z0-9_-]{6,40}$/.test(code)) {
      setCodeMsg('El código debe tener de 6 a 40 caracteres: letras, números, guion o guion bajo.');
      return;
    }
    try {
      await setDoc(doc(db, 'summit_private', 'checkin'), { code, updatedAt: serverTimestamp() });
      setSavedCode(code);
      setCheckinCode(code);
      setCodeMsg('Código guardado. Imprime el QR de abajo para la entrada de Chroma.');
    } catch (err: any) {
      setCodeMsg(`No se pudo guardar: ${err?.message || err}`);
    }
  };

  const randomCode = () => {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    setCheckinCode(`chroma-${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8)}`);
  };

  return (
    <div className="space-y-4">
      <div className="sgx-panel space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)] pb-2">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--sgx-neon)]" />
              <span>Inscritos · SGX Pass ({counts.total})</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              En vivo desde Firestore. Marca a quién invitas al Día 3 y exporta la lista para el correo de invitación.
            </p>
          </div>
          <button type="button" onClick={exportCsv} disabled={!filtered.length} className="sgx-btn text-[11px] font-mono font-bold py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40">
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV ({filtered.length})</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
          {[
            ['Total', counts.total],
            ['Quieren Día 3', counts.showcase],
            ['Invitados', counts.invited],
            ['Confirmados', counts.confirmed],
            ['Sin consentimiento', counts.noConsent],
          ].map(([k, v]) => (
            <div key={k as string} className="border border-white/10 bg-black/30 py-2">
              <div className="text-lg font-bold text-white">{v as number}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{k as string}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <label className="flex-1 flex items-center gap-2 border border-white/15 bg-black/40 px-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, correo, organización o código…" className="flex-1 bg-transparent py-2 text-xs text-white outline-none" />
          </label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="bg-black/40 border border-white/15 text-xs text-white px-2 py-2">
            <option value="ALL">Todos los tipos</option>
            <option value="SHOWCASE_PHYSICAL">Día 3 presencial</option>
            <option value="DIGITAL">Digital</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-black/40 border border-white/15 text-xs text-white px-2 py-2">
            <option value="ALL">Todos los estados</option>
            {(Object.keys(STATUS_LABEL) as RegStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>

        {error && <p className="text-xs font-mono text-red-400 border border-red-500/40 bg-red-950/30 p-2">{error}</p>}
        {rows.length >= MAX_ROWS && <p className="text-xs font-mono text-[#FDCC0D]">Se muestran los {MAX_ROWS} registros más recientes.</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-2">Nombre</th>
                <th className="py-2 pr-2">Correo</th>
                <th className="py-2 pr-2">Tipo</th>
                <th className="py-2 pr-2">Imagen</th>
                <th className="py-2 pr-2">Estado</th>
                <th className="py-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-6 text-center text-slate-400 font-mono">Cargando inscritos…</td></tr>}
              {!loading && !filtered.length && <tr><td colSpan={6} className="py-6 text-center text-slate-400 font-mono">No hay inscritos con estos filtros.</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-white/5 align-top">
                  <td className="py-2 pr-2 text-white">
                    <div className="font-semibold">{r.fullName || '—'}</div>
                    <div className="text-[11px] text-slate-400">{[r.roleTitle, r.organization].filter(Boolean).join(' · ')}</div>
                    <div className="text-[10px] font-mono text-slate-500">{r.referenceCode}</div>
                  </td>
                  <td className="py-2 pr-2 text-slate-200 break-all">{r.email}</td>
                  <td className="py-2 pr-2 text-slate-300">{r.ticketType === 'SHOWCASE_PHYSICAL' ? 'Día 3' : 'Digital'}</td>
                  <td className="py-2 pr-2">{r.imageConsent === true ? <span className="text-[#00DDFF]">Sí</span> : <span className="text-slate-500">{r.imageConsent === false ? 'No' : '—'}</span>}</td>
                  <td className="py-2 pr-2"><span className={`inline-block border px-1.5 py-0.5 font-mono text-[10px] uppercase ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td className="py-2">
                    <select
                      value={r.status}
                      disabled={busyId === r.id}
                      onChange={(e) => setStatus(r, e.target.value as RegStatus)}
                      className="bg-black/40 border border-white/15 text-[11px] text-white px-1.5 py-1.5"
                      aria-label={`Estado de ${r.fullName || r.email}`}
                    >
                      {(Object.keys(STATUS_LABEL) as RegStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sgx-panel space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-[#00DDFF]" />
          <span>Solicitudes del portal de speakers ({speakerSubs.length})</span>
        </h3>
        <p className="text-[11px] text-slate-400 font-mono">Solo publica a quien esté confirmado por escrito. Al aprobar, aparece para todos los visitantes.</p>
        {speakerMsg && <p className="text-xs font-mono text-[#00DDFF]">{speakerMsg}</p>}
        {!speakerSubs.length && <p className="text-xs font-mono text-slate-500">No hay solicitudes pendientes.</p>}
        {speakerSubs.map((sp) => (
          <div key={sp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-white/10 bg-black/30 p-2">
            <div className="text-xs">
              <div className="text-white font-semibold">{sp.name} <span className="text-slate-400 font-normal">· {sp.role}{sp.organization ? ` · ${sp.organization}` : ''} · Día {sp.day}</span></div>
              <div className="text-slate-400 line-clamp-2">{sp.bio}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => decideSpeaker(sp, true)} className="sgx-btn text-[11px] font-mono font-bold py-1.5 px-3">Publicar</button>
              <button type="button" onClick={() => decideSpeaker(sp, false)} className="px-3 py-1.5 border border-white/20 text-[11px] text-slate-300 font-mono">Descartar</button>
            </div>
          </div>
        ))}
      </div>

      <div className="sgx-panel space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#FDCC0D]" />
          <span>Día 3 · código de check-in en Chroma</span>
        </h3>
        <p className="text-[11px] text-slate-400 font-mono">
          El código no viaja en la app: solo vive aquí. Ponlo en el QR de la entrada el 13 de diciembre; el check-in solo abre ese día.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={checkinCode} onChange={(e) => setCheckinCode(e.target.value)} placeholder="chroma-xxxxxxxx" className="flex-1 bg-black/40 border border-white/15 px-2 py-2 text-xs text-white font-mono outline-none" maxLength={40} />
          <button type="button" onClick={randomCode} className="px-3 py-2 border border-white/20 text-xs text-slate-200 font-mono flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Generar</button>
          <button type="button" onClick={saveCode} className="sgx-btn text-xs font-mono font-bold py-2 px-3">Guardar código</button>
        </div>
        {codeMsg && <p className="text-xs font-mono text-[#00DDFF]">{codeMsg}</p>}
        {savedCode ? (
          <div className="flex flex-col sm:flex-row items-start gap-3">
            {qr && <img src={qr} alt="QR de check-in del Día 3" className="w-40 h-40 bg-white p-1" />}
            <div className="text-xs font-mono text-slate-300 space-y-1 break-all">
              <div>Enlace del QR:</div>
              <div className="text-white">{checkinUrl}</div>
              {qr && <a href={qr} download="SGX_Dia3_checkin_QR.png" className="inline-block mt-1 text-[#FDCC0D] underline">Descargar QR</a>}
            </div>
          </div>
        ) : (
          <p className="text-xs font-mono text-[#FDCC0D]">Todavía no hay código guardado: el check-in del Día 3 no funcionará hasta que guardes uno.</p>
        )}
      </div>

      <SummitInitiatesPanel />
    </div>
  );
};

export default SummitRegistrationsPanel;
