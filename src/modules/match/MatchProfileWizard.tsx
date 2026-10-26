// SGX Entrepreneur Match - Profile Setup Wizard

import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Zap, 
  Shield, 
  Eye, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { 
  MatchProfile, 
  MatchPillar, 
  MatchBringChip, 
  MatchSeekingChip, 
  MatchOpenToTag, 
  MatchCandidate 
} from './match.types';
import { MATCH_I18N } from './match.i18n';
import { PILLAR_META, MatchCard } from './MatchCard';
import { saveUserMatchProfile } from './matchData';
import { playUiChirp, playScanSuccessSound } from '../../lib/cyberAudioEngine';
import { triggerMatchConfetti } from './MatchBurstFX';

interface MatchProfileWizardProps {
  initialProfile?: MatchProfile | null;
  userUid: string;
  userName: string;
  userAvatar?: string;
  userXp?: number;
  userOrg?: string;
  userRole?: string;
  lang?: 'es' | 'en';
  onCompleted: (savedProfile: MatchProfile, isFirstPublish: boolean) => void;
  onCancel?: () => void;
}

const BRINGS_OPTIONS: MatchBringChip[] = [
  'capital',
  'technical',
  'design',
  '3d_xr',
  'audio',
  'content',
  'sales',
  'network',
  'mentorship',
  'legal_ops',
  'hardware',
  'community'
];

const SEEKING_OPTIONS: MatchSeekingChip[] = [
  'cofounder',
  'investor',
  'client',
  'collaborator',
  'sponsor',
  'vendor',
  'mentor',
  'talent'
];

const OPEN_TO_OPTIONS: MatchOpenToTag[] = [
  'collab',
  'hire',
  'invest',
  'get_funded',
  'partner'
];

const PILLARS_LIST: MatchPillar[] = [
  'spark',
  'story',
  'showcase',
  'stage',
  'systems',
  'synthesize'
];

export const MatchProfileWizard: React.FC<MatchProfileWizardProps> = ({
  initialProfile,
  userUid,
  userName,
  userAvatar,
  userXp = 250,
  userOrg = 'Spatialgineers Attendee',
  userRole = 'Builder',
  lang = 'es',
  onCompleted,
  onCancel
}) => {
  const strings = MATCH_I18N[lang] || MATCH_I18N.es;

  // Current wizard step: 1 to 6
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [pitch, setPitch] = useState<string>(initialProfile?.pitch || '');
  const [brings, setBrings] = useState<MatchBringChip[]>(initialProfile?.brings || ['technical']);
  const [customBrings, setCustomBrings] = useState<string>(initialProfile?.customBringsText || '');
  const [seeking, setSeeking] = useState<MatchSeekingChip[]>(initialProfile?.seeking || ['collaborator']);
  const [pillar, setPillar] = useState<MatchPillar>(initialProfile?.pillar || 'spark');
  const [openTo, setOpenTo] = useState<MatchOpenToTag[]>(initialProfile?.openTo || ['collab', 'partner']);

  // Helpers for labels
  const getBringLabel = (chip: string) => {
    const key = `brings${chip.charAt(0).toUpperCase() + chip.slice(1).replace(/_([a-z])/g, (_, g) => g.toUpperCase())}` as keyof typeof strings;
    return (strings[key] as string) || chip;
  };

  const getSeekingLabel = (chip: string) => {
    const key = `seeking${chip.charAt(0).toUpperCase() + chip.slice(1)}` as keyof typeof strings;
    return (strings[key] as string) || chip;
  };

  const getOpenToLabel = (tag: string) => {
    const key = `openTo${tag.charAt(0).toUpperCase() + tag.slice(1).replace(/_([a-z])/g, (_, g) => g.toUpperCase())}` as keyof typeof strings;
    return (strings[key] as string) || tag;
  };

  // Toggle Bring chip (max 5)
  const toggleBring = (chip: MatchBringChip) => {
    playUiChirp();
    setErrorMsg(null);
    if (brings.includes(chip)) {
      setBrings(brings.filter(b => b !== chip));
    } else {
      if (brings.length >= 5) {
        setErrorMsg('Máximo 5 habilidades a la vez.');
        return;
      }
      setBrings([...brings, chip]);
    }
  };

  // Toggle Seeking chip (max 3)
  const toggleSeeking = (chip: MatchSeekingChip) => {
    playUiChirp();
    setErrorMsg(null);
    if (seeking.includes(chip)) {
      setSeeking(seeking.filter(s => s !== chip));
    } else {
      if (seeking.length >= 3) {
        setErrorMsg('Selecciona entre 1 y 3 necesidades clave.');
        return;
      }
      setSeeking([...seeking, chip]);
    }
  };

  // Toggle OpenTo tag (max 5)
  const toggleOpenTo = (tag: MatchOpenToTag) => {
    playUiChirp();
    if (openTo.includes(tag)) {
      setOpenTo(openTo.filter(t => t !== tag));
    } else {
      setOpenTo([...openTo, tag]);
    }
  };

  // Validate step navigation
  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!pitch.trim()) {
        setErrorMsg(strings.errPitchRequired);
        return;
      }
      if (pitch.length > 80) {
        setErrorMsg('Máximo 80 caracteres para el pitch.');
        return;
      }
    } else if (step === 2) {
      if (brings.length === 0 && !customBrings.trim()) {
        setErrorMsg(strings.errBringsRequired);
        return;
      }
    } else if (step === 3) {
      if (seeking.length === 0) {
        setErrorMsg(strings.errSeekingRequired);
        return;
      }
    }
    playUiChirp();
    setStep(prev => Math.min(6, prev + 1));
  };

  const handlePrev = () => {
    setErrorMsg(null);
    playUiChirp();
    setStep(prev => Math.max(1, prev - 1));
  };

  // Save profile and publish
  const handlePublish = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const now = new Date().toISOString();
      const profileToSave: MatchProfile = {
        pitch: pitch.trim(),
        brings,
        seeking,
        pillar,
        openTo,
        visible: true,
        createdAt: initialProfile?.createdAt || now,
        updatedAt: now,
        receivedIntentCount: initialProfile?.receivedIntentCount || 0,
        customBringsText: customBrings.trim() || undefined
      };

      const { isFirstPublish } = await saveUserMatchProfile(userUid, profileToSave);

      // Trigger celebration sound & confetti
      playScanSuccessSound();
      triggerMatchConfetti();

      onCompleted(profileToSave, isFirstPublish);
    } catch (err: any) {
      console.error('Error publishing match profile:', err);
      setErrorMsg(strings.errGeneric);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dummy candidate for Step 6 Review preview
  const previewCandidate: MatchCandidate = {
    uid: userUid,
    displayName: userName,
    roleTitle: userRole,
    organization: userOrg,
    avatarUrl: userAvatar,
    xp: userXp,
    profile: {
      pitch: pitch || strings.stepPitchPlaceholder,
      brings: brings.length > 0 ? brings : ['technical'],
      customBringsText: customBrings.trim() || undefined,
      seeking: seeking.length > 0 ? seeking : ['collaborator'],
      pillar,
      openTo,
      visible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      receivedIntentCount: 0
    },
    score: 98,
    matchReason: 'Así lucirá tu tarjeta en el mazo'
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-[#0f0f0f] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00DDFF] animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold font-sans tracking-wide">
              {strings.wizardTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {strings.wizardSubtitle}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
          <span className="text-[#00DDFF] font-bold">{step}</span>
          <span>/</span>
          <span>6</span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="mb-5 p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Pitch */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-200">
            {strings.stepPitchLabel}
          </label>
          <div className="relative">
            <textarea
              value={pitch}
              onChange={e => {
                if (e.target.value.length <= 80) {
                  setPitch(e.target.value);
                  setErrorMsg(null);
                }
              }}
              placeholder={strings.stepPitchPlaceholder}
              rows={3}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-[#00DDFF] focus:outline-none placeholder:text-slate-500 font-sans resize-none"
            />
            <div className="flex justify-between items-center text-[11px] font-mono mt-1.5 text-slate-400">
              <span>Sé directo y conciso. Máximo 1–2 líneas.</span>
              <span className={pitch.length > 70 ? 'text-amber-400 font-bold' : ''}>
                {pitch.length}/80
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: What I bring */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200">
              {strings.stepBringsLabel}
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              Elige de 1 a 5 fortalezas que aportas a un equipo o proyecto ({brings.length}/5 seleccionadas).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BRINGS_OPTIONS.map(chip => {
              const active = brings.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleBring(chip)}
                  className={`p-2.5 rounded-xl border text-xs font-mono text-left transition-all flex items-center justify-between cursor-pointer ${
                    active
                      ? 'bg-slate-800 border-[#00DDFF] text-[#00DDFF] shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{getBringLabel(chip)}</span>
                  {active && <Check className="w-3.5 h-3.5 text-[#00DDFF] flex-shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Custom Bring Text */}
          <div className="pt-2">
            <label className="block text-xs font-mono text-slate-400 mb-1">
              + Otra habilidad específica (opcional, máx 60 caracteres):
            </label>
            <input
              type="text"
              value={customBrings}
              maxLength={60}
              onChange={e => setCustomBrings(e.target.value)}
              placeholder="Ej: Shader programming, Unreal Engine 5..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00DDFF] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* STEP 3: Seeking */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200">
              {strings.stepSeekingLabel}
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              Elige entre 1 y 3 roles o perfiles que impulsan tu momento actual ({seeking.length}/3 seleccionados).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {SEEKING_OPTIONS.map(chip => {
              const active = seeking.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleSeeking(chip)}
                  className={`p-3 rounded-xl border text-xs font-mono font-semibold text-left transition-all flex items-center justify-between cursor-pointer ${
                    active
                      ? 'bg-[#00DDFF]/15 border-[#00DDFF] text-[#00DDFF] shadow-md shadow-cyan-950/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{getSeekingLabel(chip)}</span>
                  {active && <Check className="w-4 h-4 text-[#00DDFF] flex-shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: Pillar Selection */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200">
              {strings.stepPillarLabel}
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              Cada pilar define tu color de resonancia y enfoque dentro de Spatialgineers.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PILLARS_LIST.map(p => {
              const meta = PILLAR_META[p];
              const active = pillar === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    playUiChirp();
                    setPillar(p);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                    active
                      ? 'border-white/80 shadow-lg'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}
                  style={{
                    backgroundColor: active ? `${meta.primary}20` : undefined,
                    borderColor: active ? meta.primary : undefined
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: meta.primary }} 
                    />
                    <span 
                      className="text-xs font-mono font-bold"
                      style={{ color: meta.primary }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {strings[`pillar${p.charAt(0).toUpperCase() + p.slice(1)}` as keyof typeof strings] || p}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5: Open-To Tags */}
      {step === 5 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200">
              {strings.stepOpenToLabel}
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              Etiquetas de vibra y tipo de relación profesional abiertas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {OPEN_TO_OPTIONS.map(tag => {
              const active = openTo.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleOpenTo(tag)}
                  className={`px-3 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-amber-950/40 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>#{getOpenToLabel(tag)}</span>
                  {active && <Check className="w-3 h-3 text-amber-300" />}
                </button>
              );
            })}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#00DDFF] flex-shrink-0" />
            <span>Al publicar, recibirás +150 XP de bonificación para tu Summit Passport.</span>
          </div>
        </div>
      )}

      {/* STEP 6: Review & Publish Card */}
      {step === 6 && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <h3 className="text-sm font-bold text-white font-sans">
              {strings.reviewTitle}
            </h3>
            <p className="text-xs text-slate-400">
              Revisa cómo te verán otros fundadores antes de saltar al mazo.
            </p>
          </div>

          <div className="flex justify-center my-2">
            <MatchCard
              candidate={previewCandidate}
              lang={lang}
              onPass={() => {}}
              onConnect={() => {}}
            />
          </div>
        </div>
      )}

      {/* Footer Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-6 gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Atrás</span>
          </button>
        ) : onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 text-xs font-mono transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        ) : (
          <div />
        )}

        {step < 6 ? (
          <button
            type="button"
            onClick={handleNext}
            className="py-2.5 px-5 rounded-xl bg-[#00DDFF] hover:bg-[#00d0e0] text-black text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shadow-cyan-900/40 transition-all cursor-pointer"
          >
            <span>Siguiente</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePublish}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#00DDFF] via-[#FDCC0D] to-[#10b981] hover:opacity-95 text-black text-xs font-mono font-extrabold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 fill-black text-black" />
            <span>{isSubmitting ? 'Publicando...' : strings.reviewPublish}</span>
          </button>
        )}
      </div>
    </div>
  );
};
