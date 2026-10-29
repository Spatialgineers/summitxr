// SGX Entrepreneur Match - Profile Setup Wizard

import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Info } from 'lucide-react';
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
import { useLanguage } from '../../context/LanguageContext';
import '../../components/summit/sgx-kit.css';
import './match.css';

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
  userXp = 0,
  userOrg,
  userRole,
  lang = 'es',
  onCompleted,
  onCancel
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
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
        setErrorMsg((es ? 'Máximo 5 habilidades a la vez.' : 'Up to 5 skills at a time.'));
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
        setErrorMsg((es ? 'Selecciona entre 1 y 3 necesidades clave.' : 'Pick between 1 and 3 key needs.'));
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
        setErrorMsg((es ? 'Máximo 80 caracteres para el pitch.' : 'Up to 80 characters for the pitch.'));
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
    score: undefined,
    matchReason: (es ? 'Así lucirá tu tarjeta en el mazo' : 'This is how your card will look in the deck')
  };

  const option = (active: boolean, label: string, onClick: () => void, accent?: string) => (
    <button type="button" className={`sgx-match__opt ${active ? 'is-on' : ''}`} aria-pressed={active} onClick={onClick} style={accent ? { ['--opt' as string]: accent } : undefined}>
      <span>{label}</span>
      {active && <Check aria-hidden />}
    </button>
  );

  return (
    <div className="sgx-card sgx-match__wizard">
      <header className="sgx-match__wizard-head">
        <div>
          <h2 className="sgx-h">{strings.wizardTitle}</h2>
          <p className="sgx-copy">{strings.wizardSubtitle}</p>
        </div>
        <ol className="sgx-match__steps" aria-label={es ? `Paso ${step} de 6` : `Step ${step} of 6`}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <li key={n} className={n === step ? 'is-on' : n < step ? 'is-done' : ''} aria-current={n === step ? 'step' : undefined}>{n}</li>
          ))}
        </ol>
      </header>

      {errorMsg && (
        <p className="sgx-match__error" role="alert"><Info aria-hidden />{errorMsg}</p>
      )}

      {step === 1 && (
        <div className="sgx-match__step">
          <label htmlFor="sgx-match-pitch" className="sgx-match__q">{strings.stepPitchLabel}</label>
          <textarea
            id="sgx-match-pitch"
            className="sgx-input"
            value={pitch}
            onChange={e => {
              if (e.target.value.length <= 80) {
                setPitch(e.target.value);
                setErrorMsg(null);
              }
            }}
            placeholder={strings.stepPitchPlaceholder}
            rows={3}
          />
          <div className="sgx-match__hint">
            <span>{es ? 'Directo y corto: una o dos líneas.' : 'Direct and short: one or two lines.'}</span>
            <span className={pitch.length > 70 ? 'is-warn' : ''}>{pitch.length}/80</span>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="sgx-match__step">
          <p className="sgx-match__q">{strings.stepBringsLabel}</p>
          <p className="sgx-fine">{es ? `Elige de 1 a 5 fortalezas (${brings.length}/5).` : `Pick 1 to 5 strengths (${brings.length}/5).`}</p>
          <div className="sgx-match__opts sgx-match__opts--3">
            {BRINGS_OPTIONS.map(chip => option(brings.includes(chip), getBringLabel(chip), () => toggleBring(chip)))}
          </div>
          <label htmlFor="sgx-match-custom" className="sgx-fine">{es ? 'Otra habilidad (opcional, máximo 60 caracteres)' : 'Another skill (optional, max 60 characters)'}</label>
          <input
            id="sgx-match-custom"
            type="text"
            className="sgx-input"
            value={customBrings}
            maxLength={60}
            onChange={e => setCustomBrings(e.target.value)}
            placeholder={es ? 'Ej: shaders, Unreal Engine 5…' : 'E.g. shaders, Unreal Engine 5…'}
          />
        </div>
      )}

      {step === 3 && (
        <div className="sgx-match__step">
          <p className="sgx-match__q">{strings.stepSeekingLabel}</p>
          <p className="sgx-fine">{es ? `Elige de 1 a 3 (${seeking.length}/3).` : `Pick 1 to 3 (${seeking.length}/3).`}</p>
          <div className="sgx-match__opts">
            {SEEKING_OPTIONS.map(chip => option(seeking.includes(chip), getSeekingLabel(chip), () => toggleSeeking(chip)))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="sgx-match__step">
          <p className="sgx-match__q">{strings.stepPillarLabel}</p>
          <p className="sgx-fine">{es ? 'Tu pilar da el color de tu tarjeta.' : 'Your pillar sets the color of your card.'}</p>
          <div className="sgx-match__opts sgx-match__opts--3">
            {PILLARS_LIST.map(p => option(pillar === p, PILLAR_META[p].label, () => { playUiChirp(); setPillar(p); }, PILLAR_META[p].primary))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="sgx-match__step">
          <p className="sgx-match__q">{strings.stepOpenToLabel}</p>
          <p className="sgx-fine">{es ? 'El tipo de relación profesional que buscas.' : 'The kind of professional relationship you are after.'}</p>
          <div className="sgx-match__opts sgx-match__opts--3">
            {OPEN_TO_OPTIONS.map(tag => option(openTo.includes(tag), `#${getOpenToLabel(tag)}`, () => toggleOpenTo(tag), '#FDCC0D'))}
          </div>
          <p className="sgx-match__note-view"><Info aria-hidden /><span>{es ? 'Al publicar por primera vez sumas +150 XP a tu SGX Pass.' : 'Publishing for the first time adds +150 XP to your SGX Pass.'}</span></p>
        </div>
      )}

      {step === 6 && (
        <div className="sgx-match__step">
          <p className="sgx-match__q">{strings.reviewTitle}</p>
          <p className="sgx-fine">{es ? 'Así te verán otros creadores en el mazo.' : 'This is how other creators will see you in the deck.'}</p>
          <MatchCard candidate={previewCandidate} lang={lang} onPass={() => {}} onConnect={() => {}} preview />
        </div>
      )}

      <footer className="sgx-match__wizard-foot">
        {step > 1 ? (
          <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={handlePrev}><ArrowLeft aria-hidden />{es ? 'Atrás' : 'Back'}</button>
        ) : onCancel ? (
          <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={onCancel}>{es ? 'Cancelar' : 'Cancel'}</button>
        ) : <span />}
        {step < 6 ? (
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={handleNext}>{es ? 'Siguiente' : 'Next'}<ArrowRight aria-hidden /></button>
        ) : (
          <button type="button" className="sgx-btn sgx-btn--sm is-active" onClick={handlePublish} disabled={isSubmitting}>
            {isSubmitting ? (es ? 'Publicando…' : 'Publishing…') : strings.reviewPublish}
          </button>
        )}
      </footer>
    </div>
  );
};
