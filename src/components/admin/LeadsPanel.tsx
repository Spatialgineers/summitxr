import React, { useMemo, useState } from 'react';
import { Download, Mail, Phone, Search, Star, Trash2 } from 'lucide-react';
import { SGX_PILLARS, type PillarKey } from '../../lib/sgxPillars';
import { LEAD_KIND_LABEL, LEAD_STATUS, leadsCsv, unflagLead, updateLead, useLeads, type Lead, type LeadKind, type LeadStatus } from '../../lib/leads';

/* Admin → Personas → Clientes potenciales: everyone the team starred (⭐) in
   Inscritos, Sponsors or their Rolodex, for the follow-up after the event.
   Status, the pillars they care about and a note per lead; CSV for the CRM. */

const NoteBox: React.FC<{ lead: Lead }> = ({ lead }) => {
  const [v, setV] = useState(lead.note);
  const [saved, setSaved] = useState(false);
  return (
    <div className="sgx-leads__note">
      <textarea
        value={v}
        rows={2}
        maxLength={2000}
        placeholder="Nota: qué le interesa, qué hablaron, próximo paso…"
        onChange={(e) => { setV(e.target.value); setSaved(false); }}
        onBlur={() => { if (v !== lead.note) updateLead(lead.id, { note: v }).then(() => setSaved(true)).catch(() => undefined); }}
        aria-label={`Nota sobre ${lead.name}`}
      />
      {saved && <small>Guardado</small>}
    </div>
  );
};

export const LeadsPanel: React.FC = () => {
  const leads = useLeads();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<LeadStatus | 'ALL'>('ALL');
  const [kind, setKind] = useState<LeadKind | 'ALL'>('ALL');

  const counts = useMemo(() => Object.fromEntries(LEAD_STATUS.map((s) => [s.id, leads.filter((l) => l.status === s.id).length])) as Record<LeadStatus, number>, [leads]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return leads.filter((l) => (status === 'ALL' || l.status === status) && (kind === 'ALL' || l.kind === kind)
      && (!t || [l.name, l.email, l.organization, l.role, l.note].some((x) => (x || '').toLowerCase().includes(t))));
  }, [leads, q, status, kind]);

  const exportCsv = () => {
    const blob = new Blob(['﻿' + leadsCsv(list)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sgx-summit-clientes-potenciales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggleInterest = (l: Lead, p: PillarKey) => {
    const next = l.interest.includes(p) ? l.interest.filter((x) => x !== p) : [...l.interest, p];
    updateLead(l.id, { interest: next }).catch(() => undefined);
  };

  return (
    <div className="sgx-leads">
      <div className="sgx-leads__how">
        <Star aria-hidden />
        <p>Toca la ⭐ junto a una persona o marca para marcarla: en <b>Inscritos</b>, en <b>Sponsors</b> (solicitudes y marcas) o en <b>tu Rolodex</b> de Tu Estudio, justo después de escanear su pase en el evento. Aquí les das seguimiento.</p>
      </div>

      <div className="sgx-leads__stats" role="group" aria-label="Por estado">
        <button type="button" className={status === 'ALL' ? 'is-on' : ''} onClick={() => setStatus('ALL')}><b>{leads.length}</b><span>Todos</span></button>
        {LEAD_STATUS.map((s) => (
          <button key={s.id} type="button" className={status === s.id ? 'is-on' : ''} style={{ ['--lead-tone' as string]: s.tone }} onClick={() => setStatus(s.id)}>
            <b>{counts[s.id] || 0}</b><span>{s.label}</span>
          </button>
        ))}
      </div>

      <div className="sgx-leads__bar">
        <label className="sgx-leads__search"><Search aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre, email, empresa o nota…" aria-label="Buscar leads" /></label>
        <select value={kind} onChange={(e) => setKind(e.target.value as LeadKind | 'ALL')} aria-label="Tipo">
          <option value="ALL">Todos los tipos</option>
          {(Object.keys(LEAD_KIND_LABEL) as LeadKind[]).map((k) => <option key={k} value={k}>{LEAD_KIND_LABEL[k]}</option>)}
        </select>
        <button type="button" className="sgx-btn text-[11px] font-mono font-bold py-1.5 px-3 flex items-center gap-1.5" onClick={exportCsv} disabled={!list.length}>
          <Download className="w-3.5 h-3.5" aria-hidden />CSV ({list.length})
        </button>
      </div>

      {!leads.length && <p className="sgx-leads__empty">Todavía no hay clientes potenciales. Marca el primero con la ⭐.</p>}
      {!!leads.length && !list.length && <p className="sgx-leads__empty">Nadie con estos filtros.</p>}

      <ul className="sgx-leads__list">
        {list.map((l) => {
          const tone = LEAD_STATUS.find((s) => s.id === l.status)?.tone || '#FDCC0D';
          return (
            <li key={l.id} className="sgx-leads__item" style={{ ['--lead-tone' as string]: tone }}>
              <div className="sgx-leads__head">
                <div className="sgx-leads__who">
                  <strong>{l.name}</strong>
                  <small>{[l.role, l.organization].filter(Boolean).join(' · ') || '—'}</small>
                  <span className="sgx-leads__kind">{LEAD_KIND_LABEL[l.kind]} · {l.ref}</span>
                </div>
                <select value={l.status} onChange={(e) => updateLead(l.id, { status: e.target.value as LeadStatus }).catch(() => undefined)} aria-label={`Estado de ${l.name}`}>
                  {LEAD_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="sgx-leads__contact">
                {l.email && <a href={`mailto:${l.email}?subject=${encodeURIComponent('Spatialgineers · seguimiento del Summit 2026')}`}><Mail aria-hidden />{l.email}</a>}
                {l.phone && <a href={`tel:${l.phone}`}><Phone aria-hidden />{l.phone}</a>}
                {!l.email && !l.phone && <span>Sin contacto guardado: búscalo por su pase {l.ref}.</span>}
              </div>
              <div className="sgx-leads__pillars" role="group" aria-label={`Pilares de interés de ${l.name}`}>
                {SGX_PILLARS.map((p) => (
                  <button key={p.key} type="button" aria-pressed={l.interest.includes(p.key)} className={l.interest.includes(p.key) ? 'is-on' : ''} onClick={() => toggleInterest(l, p.key)}>
                    {p.name.replace('SGX.', '')}
                  </button>
                ))}
              </div>
              <NoteBox lead={l} />
              <div className="sgx-leads__foot">
                <small>Marcado por {l.flaggedBy || 'admin'}{l.flaggedAt ? ` · ${new Date(l.flaggedAt).toLocaleString('es-PR', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</small>
                <button type="button" onClick={() => { if (window.confirm(`¿Quitar a ${l.name} de clientes potenciales?`)) unflagLead(l.id).catch(() => undefined); }} aria-label={`Quitar a ${l.name}`}><Trash2 aria-hidden />Quitar</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LeadsPanel;
