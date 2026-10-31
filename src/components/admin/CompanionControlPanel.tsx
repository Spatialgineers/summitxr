import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

/* Highbot control: switch the companion on or off and set its daily spend
   cap, live (site_config/companion; the server reads it every minute), plus
   today's numbers from the server (GET /api/companion/stats, admins only).
   The hard ceiling is the spend limit of the key's workspace in the
   Anthropic Console: see docs/HIGHBOT_COMPANION.md. */

interface Stats {
  mode: 'live' | 'mock' | 'off' | 'paused';
  enabled: boolean;
  model: 'set' | 'missing';
  day: string;
  dailyCapUsd: number;
  capFrom: 'admin' | 'env';
  spentUsd: number;
  people: number;
  active: number;
  messages: number;
  refusals: number;
  errors: number;
  blocked: Record<string, number>;
}

const BLOCKED_LABEL: Record<string, string> = {
  ip: 'muchas preguntas desde una red',
  busy: 'demasiadas a la vez',
  no_pass: 'sin pase válido',
  need_google: 'sin cuenta Google',
  slow_down: 'muy seguido (una persona)',
  daily: 'tope por persona',
  budget: 'tope diario de gasto',
  paused: 'Highbot apagado',
};

const MODE_LABEL: Record<Stats['mode'], string> = {
  live: 'Encendido',
  mock: 'Modo de prueba (sin Claude)',
  off: 'Sin configurar en el servidor',
  paused: 'Apagado desde el admin',
};

export const CompanionControlPanel: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [cap, setCap] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => onSnapshot(doc(db, 'site_config', 'companion'), (snap) => {
    const v = snap.data() || {};
    setEnabled(v.enabled !== false);
    setCap(typeof v.dailyUsd === 'number' ? String(v.dailyUsd) : '');
  }, () => { /* no doc yet: defaults */ }), []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const r = await fetch('/api/companion/stats', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (alive && r.ok) setStats(await r.json());
      } catch { /* offline: keep the last numbers */ }
    };
    load();
    const t = window.setInterval(load, 30_000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);

  const save = async (patch: { enabled?: boolean; dailyUsd?: number | null }) => {
    setBusy(true); setMsg(null);
    try {
      const next = { enabled: patch.enabled ?? enabled, dailyUsd: patch.dailyUsd !== undefined ? patch.dailyUsd : (cap === '' ? null : Number(cap)) };
      await setDoc(doc(db, 'site_config', 'companion'), { ...next, updatedAt: serverTimestamp() }, { merge: true });
      setMsg('Guardado. El servidor lo aplica en menos de un minuto.');
    } catch (e: any) {
      setMsg(`No se pudo guardar: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const capValue = cap === '' ? null : Number(cap);
  const capValid = capValue === null || (Number.isFinite(capValue) && capValue >= 0 && capValue <= 1000);
  const pct = stats && stats.dailyCapUsd > 0 ? Math.min(100, (stats.spentUsd / stats.dailyCapUsd) * 100) : 0;
  const blocked = stats ? Object.entries(stats.blocked).filter(([, n]) => Number(n) > 0) : [];

  return (
    <div className="sgx-hbctl">
      <div className="sgx-hbctl__row">
        <div className="sgx-hbctl__state">
          <span className={`sgx-hbctl__dot is-${stats?.mode || 'off'}`} aria-hidden="true" />
          <div>
            <strong>{stats ? MODE_LABEL[stats.mode] : 'Leyendo el estado…'}</strong>
            {stats?.mode === 'off' && <small>Faltan ANTHROPIC_API_KEY o COMPANION_MODEL en el servidor.</small>}
          </div>
        </div>
        <button type="button" className={`sgx-btn sgx-btn--sm ${enabled ? 'sgx-btn--ground' : ''}`} disabled={busy} onClick={() => { setEnabled(!enabled); save({ enabled: !enabled }); }}>
          {enabled ? 'Apagar el Highbot' : 'Encender el Highbot'}
        </button>
      </div>

      <div className="sgx-hbctl__row">
        <label className="sgx-hbctl__cap">
          <span>Tope de gasto por día (USD)</span>
          <input type="number" min={0} max={1000} step={1} inputMode="decimal" value={cap} placeholder={stats && stats.capFrom === 'env' ? String(stats.dailyCapUsd) : '30'} onChange={(e) => setCap(e.target.value)} />
        </label>
        <button type="button" className="sgx-btn sgx-btn--sm" disabled={busy || !capValid} onClick={() => save({ dailyUsd: capValue })}>Guardar tope</button>
        {cap !== '' && <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" disabled={busy} onClick={() => { setCap(''); save({ dailyUsd: null }); }}>Usar el del servidor</button>}
      </div>
      {msg && <p className="sgx-hbctl__msg" role="status">{msg}</p>}

      {stats && (
        <>
          <div className="sgx-hbctl__spend" aria-label={`Gastado hoy ${stats.spentUsd.toFixed(2)} de ${stats.dailyCapUsd} dólares`}>
            <div className="sgx-hbctl__bar"><span style={{ width: `${pct}%` }} /></div>
            <span><b>${stats.spentUsd.toFixed(2)}</b> de ${stats.dailyCapUsd} hoy ({stats.capFrom === 'admin' ? 'tope del admin' : 'tope del servidor'})</span>
          </div>
          <dl className="sgx-hbctl__kpis">
            <div><dt>Mensajes</dt><dd>{stats.messages}</dd></div>
            <div><dt>Personas</dt><dd>{stats.people}</dd></div>
            <div><dt>En curso</dt><dd>{stats.active}</dd></div>
            <div><dt>Negativas</dt><dd>{stats.refusals}</dd></div>
            <div><dt>Errores</dt><dd>{stats.errors}</dd></div>
          </dl>
          {blocked.length > 0 && (
            <p className="sgx-hbctl__blocked">Bloqueados hoy: {blocked.map(([k, n]) => `${BLOCKED_LABEL[k] || k} ${n}`).join(' · ')}</p>
          )}
          <p className="sgx-hbctl__note">Números de hoy ({stats.day}, UTC); vuelven a cero con cada deploy. El límite duro es el del workspace en la Console de Anthropic.</p>
        </>
      )}
    </div>
  );
};

export default CompanionControlPanel;
