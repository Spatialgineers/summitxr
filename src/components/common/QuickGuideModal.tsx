import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useLanguage } from '../../context/LanguageContext';
import { SgxDialog } from './SgxDialog';
import './QuickGuideModal.css';

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
  /** Frame accent (pillar color). Defaults to SGX cyan. */
  accent?: string;
}

/* Step-by-step guide in the shared SGX dialog shell (portal to body, so it is
   never clipped by the panel that opens it). */
export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({
  isOpen,
  onClose,
  guideTitle,
  guideCategory,
  steps,
  onPrimaryAction,
  primaryActionLabel,
  accent,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [index, setIndex] = useState(0);

  useEffect(() => { if (isOpen) setIndex(0); }, [isOpen]);

  if (!isOpen || steps.length === 0) return null;

  const step = steps[index] || steps[0];
  const StepIcon = step.icon;
  const isLast = index === steps.length - 1;

  const next = () => {
    playUiChirp(620);
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    onClose();
    onPrimaryAction?.();
  };
  const prev = () => {
    playUiChirp(440);
    setIndex((i) => Math.max(0, i - 1));
  };

  return (
    <SgxDialog
      open
      onClose={onClose}
      size="md"
      accent={accent}
      title={guideTitle}
      kicker={`${guideCategory} · ${es ? 'Paso' : 'Step'} ${index + 1} ${es ? 'de' : 'of'} ${steps.length}`}
      icon={StepIcon ? <span className="sgx-guide__icon" aria-hidden><StepIcon /></span> : undefined}
      toolbar={
        <div className="sgx-guide__steps" role="tablist" aria-label={es ? 'Pasos' : 'Steps'}>
          {steps.map((s, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1}. ${s.title}`}
              className={i === index ? 'is-on' : i < index ? 'is-done' : ''}
              onClick={() => { playUiChirp(520); setIndex(i); }}
            />
          ))}
        </div>
      }
      footer={
        <>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={prev} disabled={index === 0}>
            <ChevronLeft className="w-4 h-4" aria-hidden />
            {es ? 'Anterior' : 'Previous'}
          </button>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={next}>
            {isLast ? (primaryActionLabel ?? (es ? 'Entendido' : 'Got it')) : (es ? 'Siguiente' : 'Next')}
            {!isLast && <ChevronRight className="w-4 h-4" aria-hidden />}
          </button>
        </>
      }
    >
      <div className="sgx-guide">
        <p className="sgx-guide__badge">{step.badge}</p>
        <h3 className="sgx-guide__title">{step.title}</h3>
        <p className="sgx-guide__sub">{step.subtitle}</p>
        <p className="sgx-guide__desc">{step.description}</p>

        {step.keyControls && step.keyControls.length > 0 && (
          <section>
            <h4 className="sgx-guide__h4">{es ? 'Controles' : 'Controls'}</h4>
            <ul className="sgx-guide__keys">
              {step.keyControls.map((c, i) => (
                <li key={i}>
                  <kbd>{c.key}</kbd>
                  <span>{c.action}</span>
                  {c.xpBadge && <b>{c.xpBadge}</b>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {step.tips && step.tips.length > 0 && (
          <section className="sgx-guide__tips">
            <h4 className="sgx-guide__h4">{es ? 'Consejos' : 'Tips'}</h4>
            <ul>
              {step.tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </section>
        )}
      </div>
    </SgxDialog>
  );
};
