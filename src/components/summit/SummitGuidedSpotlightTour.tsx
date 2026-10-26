import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  RotateCcw, 
  Play, 
  Compass,
  CheckCircle2,
  Layers,
  Zap,
} from 'lucide-react';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { usePilotProfile } from '../../context/PilotProfileContext';

export interface TourStepDefinition {
  id: string;
  targetSelector: string; // CSS selector or data-tour identifier
  title: string;
  directive: string;
  xpReward: number;
  fallbackSection?: string;
  isStickyHeader?: boolean;
}

const TOUR_STEPS: TourStepDefinition[] = [
  {
    id: 'step_brand',
    targetSelector: '[data-tour="brand-logo"]',
    title: 'Spatialgineers Live Engine',
    directive: 'Toca el logotipo en cualquier momento para retornar a la pantalla principal del Summit y reiniciar tu vista orbital.',
    xpReward: 35,
    fallbackSection: 'OVERVIEW',
    isStickyHeader: true,
  },
  {
    id: 'step_nav_tabs',
    targetSelector: '[data-tour="nav-tabs"]',
    title: 'Pestañas Tácticas del Pilar',
    directive: 'Navega rápidamente entre las salas maestras, agenda en vivo, speakers 3D y experiencias asociadas al pilar activo.',
    xpReward: 35,
    fallbackSection: 'OVERVIEW',
    isStickyHeader: true,
  },
  {
    id: 'step_passport',
    targetSelector: '[data-tour="user-passport-btn"]',
    title: 'Pasaporte & Progreso XP',
    directive: 'Abre tu pasaporte para revisar tu rango espacial, misiones cumplidas, insignias ganadas y saldo de experiencia XP.',
    xpReward: 35,
    fallbackSection: 'OVERVIEW',
    isStickyHeader: true,
  },
  {
    id: 'step_interactive_modules',
    targetSelector: '[data-tour="interactive-modules-bar"]',
    title: 'Módulos & Salas Interactivas',
    directive: 'Accede a Speakers 3D, Salas 4K, Tour 360°, Simulador de Drones y la Arena Gamificada de Spatialgineers.',
    xpReward: 40,
    fallbackSection: 'OVERVIEW',
  },
  {
    id: 'step_countdown',
    targetSelector: '#summit-countdown-visualizer',
    title: 'Cuenta Regresiva & Pases Oficiales',
    directive: 'Monitorea en tiempo real el inicio del Summit y consulta tu pase: entrada gratuita a los días digitales y Día 3 por invitación.',
    xpReward: 40,
    fallbackSection: 'OVERVIEW',
  },
  {
    id: 'step_experience_hub',
    targetSelector: '#summit-experience-hub',
    title: 'Hub Operativo & 6 Pilares SGX',
    directive: 'Explora el manifiesto de Spatial Computing, la tecnología orbital central y los casos de estudio aplicados.',
    xpReward: 40,
    fallbackSection: 'OVERVIEW',
  },
  {
    id: 'step_completion',
    targetSelector: '[data-tour="user-passport-btn"]',
    title: '¡Recorrido Táctico Completado!',
    directive: 'Has explorado todas las áreas maestras del ecosistema. ¡Reclama tu bono especial de +250 XP en tu pasaporte!',
    xpReward: 250,
    fallbackSection: 'OVERVIEW',
    isStickyHeader: true,
  }
];

interface SummitGuidedSpotlightTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSection?: (sectionKey: string) => void;
}

export const SummitGuidedSpotlightTour: React.FC<SummitGuidedSpotlightTourProps> = ({
  isOpen,
  onClose,
  onNavigateToSection,
}) => {
  const { recordActivity } = usePilotProfile();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
  const [savedStepIndex, setSavedStepIndex] = useState<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const isScrollingRef = useRef<boolean>(false);

  // Check saved step on open
  useEffect(() => {
    if (!isOpen) return;

    try {
      const saved = localStorage.getItem('sgx_guided_tour_step');
      if (saved !== null) {
        const stepNum = parseInt(saved, 10);
        if (!isNaN(stepNum) && stepNum > 0 && stepNum < TOUR_STEPS.length) {
          setSavedStepIndex(stepNum);
          setShowResumePrompt(true);
          return;
        }
      }
    } catch {}

    setCurrentStepIndex(0);
    setShowResumePrompt(false);
  }, [isOpen]);

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  // Helper to read current target rect synchronously
  const syncTargetRect = useCallback(() => {
    if (!isOpen || showResumePrompt) return;

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const r = el.getBoundingClientRect();
      setTargetRect(r);
    } else {
      // Fallback
      setTargetRect(null);
    }
  }, [isOpen, showResumePrompt, currentStep]);

  // Execute single, smooth scroll ONLY when step index changes
  useEffect(() => {
    if (!isOpen || showResumePrompt) return;

    // Switch section if step requires overview
    if (currentStep.fallbackSection && onNavigateToSection) {
      onNavigateToSection(currentStep.fallbackSection);
    }

    // Set scroll lock flag
    isScrollingRef.current = true;

    // Allow slight microtask delay for DOM to render if section changed
    const timer = setTimeout(() => {
      const el = document.querySelector(currentStep.targetSelector);

      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);

        // Sticky header items: smoothly scroll window to top if scrolled, do NOT scrollIntoView
        if (currentStep.isStickyHeader) {
          if (window.scrollY > 20) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          // Normal page content: check if element is already pleasantly in viewport
          const headerOffset = 80;
          const isAlreadyInView = 
            rect.top >= headerOffset && 
            rect.bottom <= window.innerHeight - 30;

          if (!isAlreadyInView) {
            // Scroll to element with comfortable header clearance without aggressive centering
            const targetY = Math.max(0, window.scrollY + rect.top - headerOffset - 24);
            window.scrollTo({ top: targetY, behavior: 'smooth' });
          }
        }
      } else {
        setTargetRect(null);
      }

      // Unlock after smooth scroll completes
      setTimeout(() => {
        isScrollingRef.current = false;
        syncTargetRect();
      }, 550);
    }, 60);

    return () => clearTimeout(timer);
  }, [currentStepIndex, isOpen, showResumePrompt, currentStep, onNavigateToSection, syncTargetRect]);

  // Track target bounding rect smoothly during scroll or resize via requestAnimationFrame
  // NOTE: This NEVER calls scrollIntoView or window.scrollTo! It only reads rects to avoid jitter/shaking loops.
  useEffect(() => {
    if (!isOpen || showResumePrompt) return;

    const handleUpdate = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        syncTargetRect();
      });
    };

    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, showResumePrompt, syncTargetRect]);

  // Keyboard navigation (ArrowRight = Next, ArrowLeft = Prev, Escape = Close)
  useEffect(() => {
    if (!isOpen || showResumePrompt) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playUiChirp(440);
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        advanceStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showResumePrompt, currentStepIndex]);

  const advanceStep = () => {
    playUiChirp(840);

    // Award step XP
    try {
      recordActivity(
        `Tour Guiado: ${currentStep.title}`,
        currentStep.xpReward,
        'summit'
      );
    } catch {}

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < TOUR_STEPS.length) {
      setCurrentStepIndex(nextIndex);
      try {
        localStorage.setItem('sgx_guided_tour_step', nextIndex.toString());
      } catch {}
    } else {
      // Completed!
      playUiChirp(980);
      try {
        localStorage.setItem('sgx_guided_tour_step', '0');
        localStorage.setItem('sgx_onboarding_completed', 'true');
        recordActivity('Tour SGX Finalizado', 250, 'summit');
      } catch {}
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStepIndex <= 0) return;
    playUiChirp(520);
    const prev = currentStepIndex - 1;
    setCurrentStepIndex(prev);
    try {
      localStorage.setItem('sgx_guided_tour_step', prev.toString());
    } catch {}
  };

  const handleResume = (resume: boolean) => {
    playUiChirp(700);
    if (resume) {
      setCurrentStepIndex(savedStepIndex);
    } else {
      setCurrentStepIndex(0);
      try {
        localStorage.setItem('sgx_guided_tour_step', '0');
      } catch {}
    }
    setShowResumePrompt(false);
  };

  if (!isOpen) return null;

  // Prompt Dialog to Resume or Restart
  if (showResumePrompt) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
        <div 
          className="max-w-md w-full bg-[#101010] border-2 border-[#32527B] p-6 space-y-4 text-white shadow-2xl"
          style={{
            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
            boxShadow: '0 0 30px rgba(50, 82, 123, 0.5)'
          }}
        >
          <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold uppercase">
            <Compass className="w-5 h-5 text-cyan-400" />
            <span>Tour Guiado Interactivo SGX</span>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-mono font-extrabold text-white">
              ¿Deseas continuar tu recorrido?
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Habías alcanzado el <strong>Paso {savedStepIndex + 1} de {TOUR_STEPS.length}</strong> ({TOUR_STEPS[savedStepIndex]?.title || ''}). Puedes continuar desde donde te quedaste o reiniciar desde el primer paso.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 font-mono text-xs font-bold">
            <button
              onClick={() => handleResume(true)}
              className="py-2.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>CONTINUAR (PASO {savedStepIndex + 1})</span>
            </button>
            <button
              onClick={() => handleResume(false)}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>DESDE EL INICIO</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate coordinates for floating tactical tooltip popup
  const popupWidth = 340;
  let popupTop = 100;
  let popupLeft = 20;
  let isDockedBottom = false;

  if (targetRect) {
    const isVeryTall = targetRect.height > 340;
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (isVeryTall || (spaceBelow < 210 && spaceAbove < 210)) {
      // Large element like #summit-experience-hub: dock cleanly at bottom center to avoid obscuring
      isDockedBottom = true;
    } else if (spaceBelow >= 220) {
      popupTop = Math.min(window.innerHeight - 240, targetRect.bottom + 16);
      popupLeft = Math.max(16, Math.min(window.innerWidth - popupWidth - 16, targetRect.left + (targetRect.width / 2) - (popupWidth / 2)));
    } else {
      popupTop = Math.max(16, targetRect.top - 215);
      popupLeft = Math.max(16, Math.min(window.innerWidth - popupWidth - 16, targetRect.left + (targetRect.width / 2) - (popupWidth / 2)));
    }
  } else {
    // Center popup if target not found
    isDockedBottom = true;
  }

  // SVG Mask cutout coordinates with gentle padding
  const cutoutPadding = 8;
  const cutoutX = targetRect ? Math.max(0, targetRect.left - cutoutPadding) : 0;
  const cutoutY = targetRect ? Math.max(0, targetRect.top - cutoutPadding) : 0;
  const cutoutW = targetRect ? targetRect.width + (cutoutPadding * 2) : 0;
  const cutoutH = targetRect ? targetRect.height + (cutoutPadding * 2) : 0;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      
      {/* 1. Butter-smooth SVG Cutout Mask (Zero seams, zero jitter, zero transition lag) */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-40">
        <defs>
          <mask id="sgx-tour-spotlight-mask">
            {/* White base = Semi-transparent dark veil */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout = Crystal-clear window into target element */}
            {targetRect && (
              <rect
                x={cutoutX}
                y={cutoutY}
                width={cutoutW}
                height={cutoutH}
                rx="8"
                ry="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(4, 8, 17, 0.82)"
          mask="url(#sgx-tour-spotlight-mask)"
        />
      </svg>

      {/* 2. Neon Cyan Tactical Glowing Frame around Target Element */}
      {targetRect && (
        <div 
          className="fixed pointer-events-none z-45 rounded-lg border-2 border-cyan-400 shadow-[0_0_28px_rgba(0, 221, 255,0.45)]"
          style={{
            top: `${cutoutY}px`,
            left: `${cutoutX}px`,
            width: `${cutoutW}px`,
            height: `${cutoutH}px`,
          }}
        >
          {/* Corner HUD Markers */}
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white" />
          <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white" />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />
          
          {/* Subtle live radar ping line */}
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-pulse" />
          </div>
        </div>
      )}

      {/* 3. Floating Tactical Cyber Tooltip Card */}
      <div 
        className={`fixed z-50 bg-[#101010]/98 border-2 border-cyan-400 text-white shadow-2xl p-4.5 space-y-3.5 ${
          isDockedBottom 
            ? 'bottom-6 left-1/2 -translate-x-1/2 w-[92vw] max-w-[420px]' 
            : 'w-[340px]'
        }`}
        style={!isDockedBottom ? {
          top: `${popupTop}px`,
          left: `${popupLeft}px`,
          clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
          boxShadow: '0 0 35px rgba(0, 221, 255, 0.4)'
        } : {
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          boxShadow: '0 0 40px rgba(0, 221, 255, 0.5)'
        }}
      >
        {/* Step Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 bg-cyan-400 text-black tracking-wider">
              PASO {currentStepIndex + 1} DE {TOUR_STEPS.length}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 fill-emerald-400" />
              +{currentStep.xpReward} XP
            </span>
          </div>

          <button
            onClick={() => {
              playUiChirp(440);
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Cerrar tour (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Directive */}
        <div className="space-y-1.5">
          <h4 className="text-sm font-mono font-bold text-white uppercase flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">{currentStep.title}</span>
          </h4>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {currentStep.directive}
          </p>
        </div>

        {/* Tactical Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>PROGRESO INDUCCIÓN</span>
            <span>{Math.round(((currentStepIndex + 1) / TOUR_STEPS.length) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 overflow-hidden rounded-full border border-slate-800">
            <div 
              className="h-full bg-cyan-400 transition-all duration-300 ease-out"
              style={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              playUiChirp(440);
              onClose();
            }}
            className="text-[11px] text-slate-400 hover:text-white cursor-pointer px-2 py-1"
          >
            Saltar Tour
          </button>

          <div className="flex items-center space-x-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold flex items-center space-x-1 transition-all cursor-pointer text-xs"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                title="Paso anterior (←)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>ANT</span>
              </button>
            )}

            <button
              type="button"
              onClick={advanceStep}
              className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md hover:shadow-cyan-400/40 text-xs"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              title="Siguiente paso (→)"
            >
              <span>
                {currentStepIndex === TOUR_STEPS.length - 1 ? '¡FINALIZAR!' : 'SIGUIENTE'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
