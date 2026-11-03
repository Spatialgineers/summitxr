import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, ExternalLink, Newspaper, Search } from 'lucide-react';
import { mediaTypeLabel } from '../../lib/pressKit';
import {
  PRESS_SLOTS, PRESS_STATUS_LABEL, approvedCount, decidePressRequest, duplicateOutlets, outletKey, pressCsv, subscribePressRequests,
  type DecisionResult, type PressRequest, type PressStatus,
} from '../../lib/pressRequests';
import { LeadFlag } from './LeadFlag';

/* PRENSA (Personas → Prensa): the accreditation requests sent from /prensa.
   Approve / decline / back to pending. Approving turns the person's pass into
   the PRENSA Holo Card and invites their pass to Day 3 in Inscritos (status
   INVITED, the same as inviting them by hand). 6 slots, one per outlet: the
   counter and the duplicate-outlet warning are here so nobody over-books. */

const STATUS_CLASS: Record<PressStatus, string> = {
  PENDING_REVIEW: 'text-slate-300 border-slate-600',
  APPROVED: 'text-[#FDCC0D] border-[#FDCC0D]/70',
  DECLINED: 'text-slate-500 border-slate-700',
};

function describe(r: PressRequest, status: PressStatus, res: DecisionResult): string {
  const who = `${r.name} (${r.outlet})`;
  if (status === 'APPROVED') {
    const card = res.card === 'ok' ? 'Su Holo Card ya dice PRENSA.'
      : res.card === 'no-uid' ? 'La solicitud no trae su cuenta: su Holo Card no cambia.'
        : 'No se pudo marcar su Holo Card (¿reglas de Firestore sin publicar?).';
    const day3 = res.day3 === 'invited' ? 'Quedó invitado al Día 3 en Inscritos.'
      : res.day3 === 'already' ? 'Ya estaba invitado al Día 3.'
        : res.day3 === 'no-pass' ? 'No encontramos su pase en Inscritos: invítalo a mano.'
          : 'No se pudo invitar al Día 3: hazlo en Inscritos.';
    return `${who} aprobado. ${card} ${day3}`;
  }
  const undo = [
    res.card === 'ok' ? 'Se quitó PRENSA de su Holo Card.' : res.card === 'failed' ? 'No se pudo quitar PRENSA de su Holo Card.' : '',
    res.day3 === 'reverted' ? 'Su invitación al Día 3 volvió a Pendiente.' : res.day3 === 'kept' ? 'Su estado del Día 3 no se tocó (lo cambiaron en Inscritos).' : '',
  ].filter(Boolean).join(' ');
  return `${who}: ${PRESS_STATUS_LABEL[status].toLowerCase()}.${undo ? ` ${undo}` : ''}`;
}

export const PressRequestsPanel: React.FC = () => {
  const [rows, setRows] = useState<PressRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | PressStatus>('ALL');

  useEffect(() => subscribePressRequests((r) => { setRows(r); setLoading(false); setError(null); }, (err) => { setLoading(false); setError(err?.message || String(err)); }), []);

  const approved = approvedCount(rows);
  const dupes = useMemo(() => duplicateOutlets(rows), [rows]);
  const outletCount = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => { const k = outletKey(r.outlet); if (k) m.set(k, (m.get(k) || 0) + 1); });
    return m;
  }, [rows]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => (filter === 'ALL' || r.status === filter)
      && (!s || `${r.name} ${r.outlet} ${r.email} ${r.referenceCode} ${r.passCode}`.toLowerCase().includes(s)));
  }, [rows, search, filter]);

  const decide = async (r: PressRequest, status: PressStatus) => {
    if (status === r.status) return;
    if (status === 'APPROVED') {
      const sameOutlet = rows.find((x) => x.id !== r.id && x.status === 'APPROVED' && outletKey(x.outlet) === outletKey(r.outlet));
      if (sameOutlet && !window.confirm(`${sameOutlet.name} ya está aprobado por ${sameOutlet.outlet}. La regla es un cupo por medio. ¿Aprobar de todos modos?`)) return;
      if (approved >= PRESS_SLOTS && !window.confirm(`Ya hay ${approved} de ${PRESS_SLOTS} cupos aprobados. ¿Aprobar de todos modos?`)) return;
    }
    setBusy(r.id);
    setMsg(null);
    try {
      const res = await decidePressRequest(r, status);
      setMsg(describe(r, status, res));
    } catch (err: any) {
      setError(`No se pudo actualizar a ${r.name}: ${err?.message || err}`);
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([pressCsv(filtered)], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGX_Summit_2026_prensa_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-testid="press-panel">
      <div className="sgx-panel space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)] pb-2">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-[var(--sgx-neon)]" />
              <span>Prensa · solicitudes de acreditación ({rows.length})</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Llegan desde /prensa (cierra el 1 de diciembre). Aprobar cambia su pase a PRENSA y lo invita al Día 3 en Inscritos.
            </p>
          </div>
          <button type="button" onClick={exportCsv} disabled={!filtered.length} className="sgx-btn text-[11px] font-mono font-bold py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40">
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV ({filtered.length})</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className={`border py-2 ${approved > PRESS_SLOTS ? 'border-red-500/60 bg-red-950/30' : approved === PRESS_SLOTS ? 'border-[#FDCC0D]/60 bg-black/30' : 'border-white/10 bg-black/30'}`}>
            <div className="text-lg font-bold text-white" data-testid="press-approved">aprobados {approved}/{PRESS_SLOTS}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Cupos (uno por medio)</div>
          </div>
          <div className="border border-white/10 bg-black/30 py-2">
            <div className="text-lg font-bold text-white">{rows.filter((r) => r.status === 'PENDING_REVIEW').length}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Pendientes</div>
          </div>
          <div className="border border-white/10 bg-black/30 py-2">
            <div className="text-lg font-bold text-white">{rows.filter((r) => r.status === 'DECLINED').length}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">No aprobados</div>
          </div>
        </div>

        {dupes.length > 0 && (
          <p className="text-xs font-mono text-[#FDCC0D] border border-[#FDCC0D]/50 bg-[#FDCC0D]/10 p-2 flex items-start gap-2" role="alert" data-testid="press-dupe">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Hay más de una persona aprobada del mismo medio: {dupes.join(', ')}. La regla es un cupo por medio.</span>
          </p>
        )}
        {approved > PRESS_SLOTS && (
          <p className="text-xs font-mono text-red-300 border border-red-500/40 bg-red-950/30 p-2">Hay {approved} aprobados y solo {PRESS_SLOTS} cupos.</p>
        )}
        {msg && <p className="text-xs font-mono text-[#00DDFF]" role="status">{msg}</p>}
        {error && <p className="text-xs font-mono text-red-400 border border-red-500/40 bg-red-950/30 p-2">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2">
          <label className="flex-1 flex items-center gap-2 border border-white/15 bg-black/40 px-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, medio, correo o código…" className="flex-1 bg-transparent py-2 text-xs text-white outline-none" />
          </label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="bg-black/40 border border-white/15 text-xs text-white px-2 py-2" aria-label="Filtrar por estado">
            <option value="ALL">Todos los estados</option>
            {(Object.keys(PRESS_STATUS_LABEL) as PressStatus[]).map((s) => <option key={s} value={s}>{PRESS_STATUS_LABEL[s]}</option>)}
          </select>
        </div>

        {loading && <p className="py-6 text-center text-slate-400 font-mono text-xs">Cargando solicitudes…</p>}
        {!loading && !filtered.length && <p className="py-6 text-center text-slate-400 font-mono text-xs">No hay solicitudes de prensa con estos filtros.</p>}

        <ul className="space-y-2">
          {filtered.map((r) => {
            const shared = (outletCount.get(outletKey(r.outlet)) || 0) > 1;
            return (
              <li key={r.id} className="border border-white/10 bg-black/30 p-3 text-xs" data-testid="press-row">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-white font-semibold text-sm">{r.name}</span>
                      <span className={`inline-block border px-1.5 py-0.5 font-mono text-[10px] uppercase ${STATUS_CLASS[r.status]}`}>{PRESS_STATUS_LABEL[r.status]}</span>
                      {shared && <span className="inline-block border border-[#FDCC0D]/60 text-[#FDCC0D] px-1.5 py-0.5 font-mono text-[10px] uppercase" title="Otra solicitud es del mismo medio">Mismo medio</span>}
                    </div>
                    <div className="text-slate-300">{[r.title, r.outlet, mediaTypeLabel(r.mediaType)].filter(Boolean).join(' · ')}</div>
                    <div className="text-slate-400 break-all">{r.email} · {r.phone}</div>
                    <div className="text-slate-400">Días: {r.days.map((d) => `Día ${d}`).join(', ') || '—'}{r.passCode ? ` · Pase ${r.passCode}` : ' · Sin pase'}</div>
                    {r.plan && <p className="text-slate-300 whitespace-pre-line">{r.plan}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {[r.outletUrl, ...r.clips].filter(Boolean).map((u, i) => (
                        <a key={u + i} href={u} target="_blank" rel="noopener noreferrer" className="text-[#00DDFF] inline-flex items-center gap-1 break-all">
                          <ExternalLink className="w-3 h-3 shrink-0" />{i === 0 ? 'Medio' : `Cobertura ${i}`}
                        </a>
                      ))}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">{r.referenceCode} · {r.submittedAt ? new Date(r.submittedAt).toLocaleString('es-PR') : ''}{r.day3ByPress ? ' · invitado al Día 3 por esta aprobación' : ''}</div>
                    <div><LeadFlag lead={{ kind: 'visitor', ref: r.passCode || r.id, name: r.name, email: r.email, phone: r.phone || undefined, organization: r.outlet, role: r.title || undefined, source: 'solicitud' }} /></div>
                  </div>
                  <div className="flex gap-2 shrink-0" role="group" aria-label={`Decisión sobre ${r.name}`}>
                    <button type="button" disabled={busy === r.id || r.status === 'APPROVED'} onClick={() => decide(r, 'APPROVED')} className="sgx-btn text-[11px] font-mono font-bold py-1.5 px-3 disabled:opacity-40">Aprobar</button>
                    <button type="button" disabled={busy === r.id || r.status === 'DECLINED'} onClick={() => decide(r, 'DECLINED')} className="px-3 py-1.5 border border-white/20 text-[11px] text-slate-300 font-mono disabled:opacity-40">No aprobar</button>
                    <button type="button" disabled={busy === r.id || r.status === 'PENDING_REVIEW'} onClick={() => decide(r, 'PENDING_REVIEW')} className="px-3 py-1.5 border border-white/20 text-[11px] text-slate-300 font-mono disabled:opacity-40">Pendiente</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default PressRequestsPanel;
