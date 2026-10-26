import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2, Gamepad2, Lightbulb, Zap, Shield, Key } from 'lucide-react';
import { useTenantTheme, hexToRgbStr } from '../../context/TenantThemeContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';

export interface GuideStep {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  badge: string;
  keyControls?: Array<{ key: string; action: string; xpBadge?: string }>;
  tips?: string[];
  visualHint?: string;
}

export interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  guideTitle: string;
  guideCategory: string;
  steps: GuideStep[];
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({
  isOpen,
  onClose,
  guideTitle,
  guideCategory,
  steps,
  onPrimaryAction,
  primaryActionLabel = '¡Entendido, vamos!'
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { tenant } = useTenantTheme();

  if (!isOpen || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex] || steps[0];
  const StepIcon = currentStep.icon || Sparkles;
  const isLastStep = currentStepIndex === steps.length - 1;

  const b = tenant.branding;
  const primaryRgb = hexToRgbStr(b.primaryColor);

  const handleNext = () => {
    playUiChirp(620);
    if (!isLastStep) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      if (onPrimaryAction) onPrimaryAction();
      onClose();
    }
  };

  const handlePrev = () => {
    playUiChirp(440);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-[#0E0E0E] border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all"
        style={{
          borderColor: `rgba(${primaryRgb}, 0.35)`,
          boxShadow: `0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(${primaryRgb}, 0.15)`
        }}
      >
        {/* Header */}
        <div 
          className="p-4 sm:p-5 border-b flex items-center justify-between"
          style={{ 
            borderColor: `rgba(${primaryRgb}, 0.15)`,
            background: `linear-gradient(180deg, rgba(${primaryRgb}, 0.1) 0%, rgba(9, 13, 20, 0.8) 100%)`
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner"
              style={{
                backgroundColor: `rgba(${primaryRgb}, 0.15)`,
                borderColor: `rgba(${primaryRgb}, 0.4)`,
                color: b.primaryColor,
              }}
            >
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border"
                  style={{
                    color: b.primaryColor,
                    borderColor: `rgba(${primaryRgb}, 0.3)`,
                    backgroundColor: `rgba(${primaryRgb}, 0.1)`,
                  }}
                >
                  {guideCategory}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Paso {currentStepIndex + 1} de {steps.length}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide mt-0.5">
                {guideTitle}
              </h2>
            </div>
          </div>

          <button
            onClick={() => { playUiChirp(330); onClose(); }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="px-5 pt-3 pb-1 flex gap-1.5 sm:gap-2">
          {steps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => { playUiChirp(520); setCurrentStepIndex(idx); }}
              className="flex-1 h-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: idx === currentStepIndex 
                  ? b.primaryColor 
                  : idx < currentStepIndex 
                    ? `rgba(${primaryRgb}, 0.5)` 
                    : 'rgba(255, 255, 255, 0.1)'
              }}
              title={s.title}
            />
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold" style={{ color: b.primaryColor }}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentStep.badge}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
              {currentStep.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {currentStep.subtitle}
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm leading-relaxed text-slate-300">
            {currentStep.description}
          </div>

          {/* Key Controls Cheatsheet if provided */}
          {currentStep.keyControls && currentStep.keyControls.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                Controles & Maniobras
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentStep.keyControls.map((ctrl, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-white font-bold text-[11px] shadow">
                        {ctrl.key}
                      </span>
                      <span className="text-slate-300 font-medium">{ctrl.action}</span>
                    </div>
                    {ctrl.xpBadge && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
                        {ctrl.xpBadge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pro Tips */}
          {currentStep.tips && currentStep.tips.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Consejos Tácticos</span>
              </div>
              <ul className="space-y-1 text-xs text-amber-200/90 list-disc list-inside">
                {currentStep.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div 
          className="p-4 sm:p-5 border-t flex items-center justify-between gap-3 bg-slate-950/90"
          style={{ borderColor: `rgba(${primaryRgb}, 0.15)` }}
        >
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
              currentStepIndex === 0
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : 'text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <button
            onClick={handleNext}
            className="flex-1 max-w-[200px] px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-all text-black"
            style={{
              backgroundColor: b.primaryColor,
              boxShadow: `0 0 20px rgba(${primaryRgb}, 0.3)`
            }}
          >
            {isLastStep ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {primaryActionLabel}
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
