import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Tv, 
  Volume2, 
  VolumeX, 
  Radio, 
  ShieldCheck, 
  Compass, 
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import { playNotificationChime } from '../../lib/summitData';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface SummitCountdownVisualizerProps {
  onOpenCalendar?: () => void;
  onOpenStage?: () => void;
  onOpenMap?: () => void;
  onExploreAgenda?: () => void;
  onOpenPasses?: () => void;
  onOpenSponsors?: () => void;
}

export const SummitCountdownVisualizer: React.FC<SummitCountdownVisualizerProps> = ({
  onOpenCalendar,
  onOpenStage,
  onOpenMap,
  onExploreAgenda,
  onOpenPasses,
  onOpenSponsors,
}) => {
  const { tenant, styles } = useTenantTheme();
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    millis: number;
  }>({
    days: 103,
    hours: 15,
    minutes: 42,
    seconds: 28,
    millis: 74,
  });

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pulseWave, setPulseWave] = useState<number[]>([40, 65, 85, 30, 95, 55, 75, 45, 90, 60, 35, 80]);

  useEffect(() => {
    // Target: Dec 11, 2026 10:00 AM AST (UTC-4)
    const target = new Date('2026-12-11T10:00:00-04:00').getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      const ms = Math.floor((diff % 1000) / 10);

      setTimeLeft({
        days: d,
        hours: h,
        minutes: m,
        seconds: s,
        millis: ms,
      });

      // Animate reactive visualizer wave bars
      setPulseWave(prev => prev.map(() => Math.floor(25 + Math.random() * 75)));
    }, 60);

    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      playNotificationChime();
    }
  };

  // SVG Circle Gauge calculations
  // Radius: 38, Circumference = 2 * PI * 38 ≈ 238.76
  const CIRCLE_CIRCUMFERENCE = 238.76;
  const daysPercent = Math.min(1, timeLeft.days / 120);
  const hoursPercent = timeLeft.hours / 24;
  const minsPercent = timeLeft.minutes / 60;
  const secsPercent = (timeLeft.seconds * 1000 + timeLeft.millis * 10) / 60000;

  const getStrokeOffset = (percent: number) => {
    return CIRCLE_CIRCUMFERENCE * (1 - percent);
  };

  return (
    <div 
      className="relative w-full sgx-crystal-card p-5 sm:p-6 overflow-hidden text-slate-100 transition-all duration-300"
      style={{ 
        borderColor: tenant.branding.primaryColor,
        boxShadow: `0 12px 36px -6px rgba(0, 0, 0, 0.88), 0 0 28px ${tenant.branding.glowShadow}, inset 0 1px 0 rgba(255, 255, 255, 0.25)`
      }}
    >
      {/* Volumetric Crystal Rim Illumination (No flat dot/grid patterns) */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${tenant.branding.primaryColor}22 0%, rgba(56, 189, 248, 0.08) 45%, transparent 80%)`
        }}
      />
      
      {/* Top Header Controls & Live Signal */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sgx-secondary)]/60 pb-3">
        <div className="flex items-center space-x-2">
          <span 
            className="w-2.5 h-2.5 animate-ping" 
            style={{ 
              clipPath: 'polygon(1px 0, 100% 0, 100% calc(100% - 1px), calc(100% - 1px) 100%, 0 100%, 0 1px)',
              backgroundColor: tenant.branding.primaryColor 
            }} 
          />
          <span className="font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5" style={{ color: tenant.branding.primaryColor }}>
            <Radio className="w-3.5 h-3.5" />
            <span>{t('countdown_hud_title', 'SGX HUD • CONTEO REGRESIVO OFICIAL')}</span>
          </span>
        </div>

        <div className="flex items-center space-x-2 font-mono text-[10px]">
          <span 
            className="px-2 py-0.5 border font-bold" 
            style={{ 
              clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)',
              ...styles.neonBadgeStyle 
            }}
          >
            UTC-4 (SAN JUAN)
          </span>
          <button
            onClick={handleToggleSound}
            className={`p-1.5 border transition-colors ${soundEnabled ? 'border-cyan-400 text-cyan-300' : 'bg-[var(--sgx-bg)] border-[var(--sgx-secondary)] text-slate-400 hover:text-white'}`}
            style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
            title="Audio Pulse Chime"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 4 Radial Circular Progress Rings */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-4 sm:py-5">
        
        {/* DAYS GAUGE */}
        <div 
          className="flex flex-col items-center justify-center p-2 bg-[var(--sgx-card-bg)]/60 border border-[var(--sgx-secondary)]/40 group hover:border-cyan-400 transition-all"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
        >
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-[#2B2B2B]"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                className="transition-all duration-500 ease-out"
                stroke={tenant.branding.primaryColor}
                strokeWidth="6"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={getStrokeOffset(daysPercent)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-xl sm:text-3xl font-black text-white font-['Orbitron',sans-serif] tracking-tight">
                {timeLeft.days}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase -mt-0.5" style={{ color: tenant.branding.primaryColor }}>
                {t('countdown_days', 'DÍAS')}
              </span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-slate-400 mt-1">DIC 11, 2026</span>
        </div>

        {/* HOURS GAUGE */}
        <div 
          className="flex flex-col items-center justify-center p-2 bg-[var(--sgx-card-bg)]/60 border border-[var(--sgx-secondary)]/40 group hover:border-[var(--sgx-accent)] transition-all"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
        >
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-[#2B2B2B]"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-[var(--sgx-accent)] transition-all duration-500 ease-out"
                strokeWidth="6"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={getStrokeOffset(hoursPercent)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-xl sm:text-3xl font-black text-white font-['Orbitron',sans-serif] tracking-tight">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--sgx-accent)] tracking-wider uppercase -mt-0.5">
                {t('countdown_hours', 'HORAS')}
              </span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-slate-400 mt-1">{t('countdown_cycle', 'CICLO 24H')}</span>
        </div>

        {/* MINUTES GAUGE */}
        <div 
          className="flex flex-col items-center justify-center p-2 bg-[var(--sgx-card-bg)]/60 border border-[var(--sgx-secondary)]/40 group hover:border-[#32527B] transition-all"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
        >
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-[#2B2B2B]"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-[#32527B] transition-all duration-500 ease-out"
                strokeWidth="6"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={getStrokeOffset(minsPercent)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-xl sm:text-3xl font-black text-white font-['Orbitron',sans-serif] tracking-tight">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-[#32527B] tracking-wider uppercase -mt-0.5">
                {t('countdown_mins', 'MIN')}
              </span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-slate-400 mt-1">60M</span>
        </div>

        {/* SECONDS GAUGE WITH LIVE MILLISECONDS PULSE */}
        <div 
          className="flex flex-col items-center justify-center p-2 bg-[var(--sgx-card-bg)]/60 border border-[var(--sgx-secondary)]/40 group hover:border-[#FDCC0D] transition-all"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
        >
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-[#2B2B2B]"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-[#FDCC0D] transition-all duration-75 ease-linear"
                strokeWidth="6"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={getStrokeOffset(secsPercent)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <div className="flex items-baseline space-x-0.5">
                <span className="text-xl sm:text-3xl font-black text-[#FDCC0D] font-['Orbitron',sans-serif] tracking-tight">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-mono text-[#FDCC0D]/80">
                  .{String(timeLeft.millis).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-[#FDCC0D] tracking-wider uppercase -mt-0.5">
                {t('countdown_secs', 'SEG')}
              </span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-slate-400 mt-1">{t('countdown_realtime', 'TIEMPO REAL')}</span>
        </div>

      </div>

      {/* Audio Reactive Waveform Simulator Ticker */}
      <div 
        className="relative z-10 flex items-center justify-between px-3 py-2 bg-[var(--sgx-card-bg)]/80 border border-[var(--sgx-secondary)]/60 my-2"
        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
      >
        <div className="flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-[var(--sgx-neon)] animate-pulse" />
          <span className="text-[10px] font-mono uppercase text-slate-300 font-bold">
            SIGNAL FREQUENCY BUS:
          </span>
        </div>
        
        {/* Equalizer Bars */}
        <div className="flex items-end space-x-1 h-5">
          {pulseWave.map((height, i) => (
            <div
              key={i}
              className="w-1 transition-all duration-100"
              style={{
                height: `${height}%`,
                backgroundColor: i % 3 === 0 ? '#32527B' : i % 3 === 1 ? '#FDCC0D' : '#B87000'
              }}
            />
          ))}
        </div>

        <span className="text-[10px] font-mono text-[#FDCC0D] font-bold">
          LIVE SYNC OK
        </span>
      </div>

      {/* Venue Strategic Partner Clarification Banner */}
      <div 
        className="relative z-10 p-3 bg-[#101010] border border-[var(--sgx-secondary)]/70 space-y-1.5 text-xs font-mono"
        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
      >
        <div className="flex items-center justify-between text-slate-300">
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--sgx-accent)]" />
            <span className="text-slate-400">Sede Presencial:</span>
            <span className="text-white font-bold">Chroma Space Studios</span>
          </div>
          <span 
            className="text-[10px] px-1.5 py-0.5 bg-[var(--sgx-accent)]/10 border border-[var(--sgx-accent)]/40 text-[var(--sgx-accent)]"
            style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
          >
            STRATEGIC VENUE PARTNER
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Chroma Space Studios es nuestro aliado de producción y sede física en San Juan, Puerto Rico para el Gran Cierre Híbrido del Día 3.
        </p>
      </div>

      {/* Action Footer Bar */}
      <div className="relative z-10 pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sgx-secondary)]/50">
        <div className="flex items-center space-x-2">
          {onOpenStage && (
            <button
              onClick={onOpenStage}
              className="px-3 py-1.5 bg-[var(--sgx-neon)]/10 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black text-xs font-mono font-bold transition-all flex items-center space-x-1.5"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>STAGE VISUALIZER 3D</span>
            </button>
          )}
          {onOpenMap && (
            <button
              onClick={onOpenMap}
              className="px-3 py-1.5 bg-[#262626] border border-[var(--sgx-secondary)] text-slate-300 hover:text-white text-xs font-mono font-bold transition-all flex items-center space-x-1.5"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
            >
              <Compass className="w-3.5 h-3.5 text-[var(--sgx-neon)]" />
              <span>MAPA 360°</span>
            </button>
          )}
        </div>

        {onOpenCalendar && (
          <button
            onClick={onOpenCalendar}
            className="px-3 py-1.5 bg-[var(--sgx-accent)] text-black hover:bg-[var(--sgx-accent)]/80 text-xs font-mono font-bold transition-all flex items-center space-x-1 shadow-md shadow-[var(--sgx-accent)]/10"
            style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>SINCRONIZAR CALENDARIO</span>
          </button>
        )}
      </div>
    </div>
  );
};
