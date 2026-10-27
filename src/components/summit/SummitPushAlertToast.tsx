import React, { useEffect } from 'react';
import { BellRing, X, ExternalLink, Zap, AlertTriangle } from 'lucide-react';
import { SummitNotification } from '../../types/summit';
import { useLanguage } from '../../context/LanguageContext';

interface SummitPushAlertToastProps {
  notification: SummitNotification | null;
  onClose: () => void;
  onActionClick?: (actionUrl?: string) => void;
}

export const SummitPushAlertToast: React.FC<SummitPushAlertToastProps> = ({
  notification,
  onClose,
  onActionClick,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 9000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const isUrgent = notification.priority === 'URGENT';
  const isHigh = notification.priority === 'HIGH';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-short">
      <div 
        className={`p-4 border backdrop-blur-xl shadow-2xl flex items-start space-x-3.5 ${
          isUrgent 
            ? 'bg-rose-950/95 border-rose-500 text-white shadow-rose-500/30' 
            : isHigh 
            ? 'bg-[var(--sgx-card-bg)]/95 border-[var(--sgx-accent)] text-white shadow-[var(--sgx-accent)]/20'
            : 'bg-[var(--sgx-card-bg)]/95 border-[var(--sgx-neon)] text-white shadow-[var(--sgx-neon)]/20'
        }`}
        style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
      >
        {/* Left Icon */}
        <div 
          className={`p-2 shrink-0 ${
            isUrgent ? 'bg-rose-600 text-white' : isHigh ? 'bg-[var(--sgx-accent)] text-black' : 'bg-[var(--sgx-neon)] text-black'
          }`}
          style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
        >
          {isUrgent ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <BellRing className="w-5 h-5 animate-pulse" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 bg-black/40 border border-white/20">
              {isUrgent ? (es ? '🔴 ALERTA URGENTE DEL SUMMIT' : '🔴 URGENT SUMMIT ALERT') : (es ? '⚡ NOTIFICACIÓN EN VIVO' : '⚡ LIVE NOTIFICATION')}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h4 className="text-xs font-bold font-['Orbitron',sans-serif] leading-tight">
            {notification.title}
          </h4>

          <p className="text-xs text-slate-200 leading-snug">
            {notification.message}
          </p>

          {/* Action Button */}
          {notification.actionUrl && (
            <button
              onClick={() => {
                if (onActionClick) onActionClick(notification.actionUrl);
                onClose();
              }}
              className="mt-2 text-[10px] font-bold font-mono text-[var(--sgx-neon)] hover:underline flex items-center space-x-1"
            >
              <span>{notification.actionLabel || (es ? 'Ver detalles de la sesión' : 'View session details')}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
