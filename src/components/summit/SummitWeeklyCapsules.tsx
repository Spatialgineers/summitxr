import React, { useRef, useState } from 'react';
import { Lock, Unlock, ArrowRight, Clock } from 'lucide-react';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { playUiChirp, playScanSuccessSound } from '../../lib/cyberAudioEngine';
import { SECTION_TO_SLUG, SummitSectionKey, scrollToSectionContainer } from '../../lib/summitUrlSync';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import './sgxModals.css';

import { CAPSULES, useLiveList, type WeeklyCapsule } from '../../lib/content/liveLists';
export type { WeeklyCapsule } from '../../lib/content/liveLists';

/* SUMMIT CAPSULES: one short piece of content per week before the Summit,
   each worth XP once its date arrives. Shown in SummitTimeCapsulesDialog. */

export const isCapsuleDateReached = (unlockDateStr: string): boolean => {
  try {
    const target = new Date(unlockDateStr).getTime();
    return Date.now() >= target;
  } catch {
    return false;
  }
};

export const getTimeUntilUnlock = (unlockDateStr: string) => {
  try {
    const diff = Math.max(0, new Date(unlockDateStr).getTime() - Date.now());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours, isReached: diff === 0 };
  } catch {
    return { days: 0, hours: 0, isReached: false };
  }
};


interface SummitWeeklyCapsulesProps {
  onNavigateToSection?: (sectionKey: string) => void;
}

export const SummitWeeklyCapsules: React.FC<SummitWeeklyCapsulesProps> = ({
  onNavigateToSection,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const capsules = useLiveList(CAPSULES);
  const { profile, unlockWeeklyCapsule } = usePilotProfile();
  const [selectedCapsule, setSelectedCapsule] = useState<WeeklyCapsule | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);

  const unlockedList = profile.unlockedCapsules || [];

  // A capsule is ONLY unlocked if the target date has arrived AND it was either default or unlocked by the user
  const isCapsuleUnlocked = (c: WeeklyCapsule) => {
    const dateReached = isCapsuleDateReached(c.unlockDate);
    if (!dateReached) return false;
    return c.isUnlockedDefault || unlockedList.includes(c.id);
  };

  const handleOpenCapsule = (c: WeeklyCapsule) => {
    const dateReached = isCapsuleDateReached(c.unlockDate);
    if (dateReached) {
      playUiChirp(820);
      const wasUnlocked = unlockWeeklyCapsule(c.id, c.xpReward, c.title);
      if (wasUnlocked) {
        playScanSuccessSound();
      }
    } else {
      playUiChirp(460);
    }
    setSelectedCapsule(c);
    // On phones the detail sits below the grid: bring it into view.
    window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  };

  const handleNavigateToSection = (sectionKey: string) => {
    playUiChirp(880);
    setSelectedCapsule(null);

    // 1. Invoke direct parent callback
    if (onNavigateToSection) {
      onNavigateToSection(sectionKey);
    }

    // 2. Dispatch global event for listeners
    window.dispatchEvent(
      new CustomEvent('sgx:switch_summit_section', {
        detail: { section: sectionKey }
      })
    );

    // 3. Scroll smoothly to the target section element
    setTimeout(() => {
      scrollToSectionContainer(sectionKey as SummitSectionKey);
      const slug = SECTION_TO_SLUG[sectionKey as SummitSectionKey] || sectionKey.toLowerCase();
      const candidateIds = [
        `summit-section-${slug}`,
        `section-${slug}`,
        slug,
        'summit-main-tab-content'
      ];
      for (const id of candidateIds) {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
    }, 120);
  };

  const totalUnlocked = capsules.filter(isCapsuleUnlocked).length;
  const unlockDay = (c: WeeklyCapsule) => {
    const range = loc(c, 'dateRange', language);
    return range.split('·')[1]?.trim() || range;
  };

  return (
    <div className="sgx-m sgx-m-stack">
      <div className="sgx-m-row sgx-m-row--between">
        <p className="sgx-m-fine">{es ? 'Una cápsula nueva cada semana, del 25 oct al 29 nov. Ábrela cuando llegue su fecha y suma XP.' : 'A new capsule every week, Oct 25 to Nov 29. Open it when its date arrives and earn XP.'}</p>
        <span className="sgx-m-tag sgx-m-tag--gold">{es ? 'Abiertas' : 'Opened'} {totalUnlocked} / {capsules.length}</span>
      </div>

      <div className="sgx-cap__grid">
        {capsules.map((cap) => {
          const unlocked = isCapsuleUnlocked(cap);
          const reached = isCapsuleDateReached(cap.unlockDate);
          const isActive = selectedCapsule?.id === cap.id;
          const { days, hours } = getTimeUntilUnlock(cap.unlockDate);
          return (
            <button
              key={cap.id}
              type="button"
              data-capsule={cap.id}
              aria-expanded={isActive}
              onClick={() => handleOpenCapsule(cap)}
              className={`sgx-m-card sgx-cap__card ${unlocked ? 'is-open' : 'is-locked'} ${isActive ? 'is-on' : ''}`}
            >
              <span className="sgx-m-row sgx-m-row--between" style={{ width: '100%' }}>
                <span className="sgx-m-fine">{loc(cap, 'dateRange', language)}</span>
              </span>
              <span className="sgx-m-row">
                {unlocked ? (
                  <span className="sgx-m-tag"><Unlock size={11} aria-hidden /> {es ? 'Abierta' : 'Open'}</span>
                ) : reached ? (
                  <span className="sgx-m-tag sgx-m-tag--gold">{es ? 'Lista para abrir' : 'Ready to open'}</span>
                ) : (
                  <span className="sgx-m-tag sgx-m-tag--mute"><Lock size={11} aria-hidden /> {days > 0 ? (es ? `En ${days} d` : `In ${days} d`) : (es ? `En ${hours} h` : `In ${hours} h`)}</span>
                )}
                <span className="sgx-m-tag sgx-m-tag--gold">+{cap.xpReward} XP</span>
              </span>
              <span className="sgx-m-h sgx-m-clamp2" style={{ fontSize: '0.85rem' }}>{loc(cap, 'title', language)}</span>
              <span className="sgx-m-p sgx-m-clamp2" style={{ fontSize: '0.82rem' }}>{loc(cap, 'summary', language)}</span>
              <span className="sgx-m-kicker" style={{ marginTop: 'auto' }}>{unlocked ? (es ? 'Leer' : 'Read') : (es ? 'Ver detalles' : 'Details')} →</span>
            </button>
          );
        })}
      </div>

      {selectedCapsule && (() => {
        const unlocked = isCapsuleUnlocked(selectedCapsule);
        const { days, hours } = getTimeUntilUnlock(selectedCapsule.unlockDate);
        return (
          <section ref={detailRef} className="sgx-m-card sgx-cap__detail" aria-live="polite" aria-label={loc(selectedCapsule, 'title', language)}>
            <div className="sgx-m-row sgx-m-row--between" style={{ alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <p className="sgx-m-kicker">{loc(selectedCapsule, 'dateRange', language)}</p>
                <h3 className="sgx-m-h" style={{ marginTop: 4 }}>{loc(selectedCapsule, 'title', language)}</h3>
              </div>
              {unlocked
                ? <span className="sgx-m-tag sgx-m-tag--solid">+{selectedCapsule.xpReward} XP</span>
                : <span className="sgx-m-tag sgx-m-tag--mute"><Clock size={11} aria-hidden /> {es ? `Faltan ${days} d ${hours} h` : `${days} d ${hours} h left`}</span>}
            </div>
            {unlocked ? (
              <p className="sgx-m-p sgx-cap__text">{loc(selectedCapsule, 'fullTransmission', language)}</p>
            ) : (
              <>
                <p className="sgx-m-p">{loc(selectedCapsule, 'summary', language)}</p>
                <p className="sgx-m-fine">
                  {es
                    ? `Esta cápsula se abre el ${unlockDay(selectedCapsule)}. Ese día podrás leerla completa y sumar +${selectedCapsule.xpReward} XP a tu pase.`
                    : `This capsule opens on ${unlockDay(selectedCapsule)}. That day you can read all of it and add +${selectedCapsule.xpReward} XP to your pass.`}
                </p>
              </>
            )}
            <div className="sgx-m-row">
              <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => handleNavigateToSection(selectedCapsule.relatedSectionKey)}>
                {unlocked ? loc(selectedCapsule, 'relatedActionLabel', language) : (es ? `Ir a: ${loc(selectedCapsule, 'relatedActionLabel', language)}` : `Go to: ${loc(selectedCapsule, 'relatedActionLabel', language)}`)}
                <ArrowRight size={14} aria-hidden />
              </button>
              <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => setSelectedCapsule(null)}>{es ? 'Cerrar cápsula' : 'Close capsule'}</button>
            </div>
          </section>
        );
      })()}
    </div>
  );
};
