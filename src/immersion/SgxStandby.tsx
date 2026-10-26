import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

/* "Señal en espera": the themed empty state. Nothing in the Summit should
   read as broken; before Day 1 a channel is on standby, with a countdown. */

const DAY1 = new Date('2026-12-11T10:00:00-04:00').getTime();

function left(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60) };
}

interface Props {
  title: string;
  body: string;
  actions?: { label: string; onClick: () => void; primary?: boolean }[];
}

export const SgxStandby: React.FC<Props> = ({ title, body, actions = [] }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const t = left(DAY1 - now);
  const live = now >= DAY1;
  return (
    <div className="sgx-standby sgx-panel">
      <div className="sgx-standby__signal" aria-hidden="true"><span /><span /><span /></div>
      <p className="sgx-standby__tag">{live ? (es ? 'SEÑAL EN VIVO' : 'SIGNAL LIVE') : (es ? 'SEÑAL EN ESPERA' : 'SIGNAL ON STANDBY')}</p>
      <h3 className="sgx-panel__title">{title}</h3>
      <p className="sgx-panel__body">{body}</p>
      {!live && (
        <p className="sgx-standby__count sgx-readout">
          {es ? 'DÍA 1 EN' : 'DAY 1 IN'} {t.d}D {String(t.h).padStart(2, '0')}H {String(t.m).padStart(2, '0')}M
        </p>
      )}
      {actions.length > 0 && (
        <div className="sgx-standby__actions">
          {actions.map((a) => (
            <button key={a.label} type="button" className={`sgx-btn sgx-btn--sm ${a.primary ? '' : 'sgx-btn--ground'}`} onClick={a.onClick}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SgxStandby;
