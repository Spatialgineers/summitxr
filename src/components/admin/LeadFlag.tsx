import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { flagLead, leadId, unflagLead, useLeads, type LeadInput } from '../../lib/leads';
import { playUiChirp } from '../../lib/cyberAudioEngine';

/** ⭐ Mark (or un-mark) a person or brand as a potential client. Admins only; renders nothing for anyone else. */
export const LeadFlag: React.FC<{ lead: LeadInput; compact?: boolean }> = ({ lead, compact = false }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return <LeadFlagButton lead={lead} compact={compact} />;
};

const LeadFlagButton: React.FC<{ lead: LeadInput; compact: boolean }> = ({ lead, compact }) => {
  const leads = useLeads();
  const id = leadId(lead.kind, lead.ref);
  const on = leads.some((l) => l.id === id);
  const [busy, setBusy] = useState(false);
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    playUiChirp(on ? 520 : 880);
    try { if (on) await unflagLead(id); else await flagLead(lead); }
    catch (err) { console.warn('[SGX leads] could not save:', err instanceof Error ? err.message : err); }
    finally { setBusy(false); }
  };
  const label = on ? `Quitar a ${lead.name} de clientes potenciales` : `Marcar a ${lead.name} como cliente potencial`;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      aria-label={label}
      title={on ? 'Cliente potencial (toca para quitar)' : 'Marcar como cliente potencial'}
      className={`sgx-leadflag ${on ? 'is-on' : ''} ${compact ? 'is-compact' : ''}`}
    >
      <Star aria-hidden fill={on ? 'currentColor' : 'none'} />
      {!compact && <span>{on ? 'Lead' : 'Marcar lead'}</span>}
    </button>
  );
};

export default LeadFlag;
