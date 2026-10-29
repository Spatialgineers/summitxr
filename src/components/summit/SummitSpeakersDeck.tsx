import React, { useState, useMemo } from 'react';
import {
  Users, Search, Award, FilePlus2, Twitter, Linkedin, Instagram, Github, Globe, Calendar, ChevronRight, IdCard,
} from 'lucide-react';
import { SummitSpeaker, SummitSession } from '../../types/summit';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { SGX_PILLARS, findPillar, pillarInk, type PillarKey } from '../../lib/sgxPillars';
import { SgxDialog } from '../common/SgxDialog';
import './sgx-kit.css';
import './SummitSpeakersDeck.css';

interface SummitSpeakersDeckProps {
  speakers: SummitSpeaker[];
  sessions: SummitSession[];
  /** Not used: the deck opens its own speaker dialog. Kept so callers still compile. */
  onSelectSpeaker?: (speaker: SummitSpeaker) => void;
  onOpenSessionModal?: (session: SummitSession) => void;
  onOpenSpeakerPortal?: () => void;
}

type CategoryFilter = 'ALL' | 'CONFIRMED' | 'APPLICANTS';

// Only Danelson and Ricardo are confirmed; every other card is an application.
const CONFIRMED_IDS = new Set(['spk_danelson', 'spk_ricardo']);

/** A real photo, or null when the record only carries a brand/pillar mark. */
const speakerPhoto = (url?: string): string | null =>
  url && !/unsplash\.com|\/Branding\//.test(url) ? url : null;

const pillarMark = (key?: PillarKey) => `/holo/${key ? key.toLowerCase() : 'summitIcon'}.png`;

export const SummitSpeakersDeck: React.FC<SummitSpeakersDeckProps> = ({
  speakers,
  sessions,
  onOpenSessionModal,
  onOpenSpeakerPortal,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');
  const [activePillar, setActivePillar] = useState<PillarKey | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspected, setInspected] = useState<SummitSpeaker | null>(null);

  const openPortal = () => {
    if (onOpenSpeakerPortal) onOpenSpeakerPortal();
    else window.dispatchEvent(new CustomEvent('sgx:open_speaker_portal'));
  };

  const classified = useMemo(() => speakers.map((spk) => {
    const pillar = findPillar(spk.pillarId);
    return {
      ...spk,
      pillar,
      accent: pillar ? pillarInk(pillar.key) : '#FDCC0D',
      photo: speakerPhoto(spk.avatarUrl),
      category: (CONFIRMED_IDS.has(spk.id) ? 'CONFIRMED' : 'APPLICANTS') as CategoryFilter,
    };
  }), [speakers]);

  const filtered = useMemo(() => classified.filter((spk) => {
    if (activeCategory !== 'ALL' && spk.category !== activeCategory) return false;
    if (activePillar !== 'ALL' && spk.pillar?.key !== activePillar) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [spk.name, spk.handle, loc(spk, 'role', language), spk.organization, loc(spk, 'bio', language), spk.pillar?.name]
      .some((v) => v?.toLowerCase().includes(q));
  }), [classified, activeCategory, activePillar, searchQuery, language]);

  const categories: { id: CategoryFilter; label: string; count: number; icon: typeof Users }[] = [
    { id: 'ALL', label: es ? 'Todos' : 'All', count: classified.length, icon: Users },
    { id: 'CONFIRMED', label: es ? 'Confirmados' : 'Confirmed', count: classified.filter((s) => s.category === 'CONFIRMED').length, icon: Award },
    { id: 'APPLICANTS', label: es ? 'Postulaciones (sin confirmar)' : 'Applications (unconfirmed)', count: classified.filter((s) => s.category === 'APPLICANTS').length, icon: FilePlus2 },
  ];

  const sessionsOf = (speakerId: string) => sessions.filter((s) => s.speakerIds?.includes(speakerId));
  const blocks = (n: number) => es ? `${n} ${n === 1 ? 'bloque' : 'bloques'}` : `${n} ${n === 1 ? 'block' : 'blocks'}`;

  const inspectedInfo = inspected ? classified.find((s) => s.id === inspected.id) : undefined;

  return (
    <div className="sgx-spk">
      <header className="sgx-card sgx-spk__head">
        <div className="sgx-spk__intro">
          <p className="sgx-kicker">{es ? 'Speakers y artistas' : 'Speakers and artists'}</p>
          <h2 className="sgx-h">{es ? 'Quiénes suben al escenario' : 'Who takes the stage'}</h2>
          <p className="sgx-copy">
            {es
              ? 'Los hosts confirmados son Danelson Maldonado González y Ricardo A. Hernández Díaz. Las personas invitadas del Día 2 y los artistas se anuncian solo cuando estén confirmados por escrito.'
              : 'The confirmed hosts are Danelson Maldonado González and Ricardo A. Hernández Díaz. Day 2 guests and artists are announced only once confirmed in writing.'}
          </p>
        </div>
        <div className="sgx-spk__tools">
          <label className="sgx-search">
            <Search aria-hidden />
            <span className="sr-only">{es ? 'Buscar' : 'Search'}</span>
            <input
              type="search"
              className="sgx-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={es ? 'Buscar por nombre o pilar' : 'Search by name or pillar'}
            />
          </label>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={openPortal}>
            <FilePlus2 aria-hidden />{es ? 'Soy speaker: enviar mi perfil' : "I'm a speaker: send my profile"}
          </button>
        </div>

        <div className="sgx-spk__filters">
          <div className="sgx-chip-row" role="group" aria-label={es ? 'Estado' : 'Status'}>
            {categories.filter((c) => c.id === 'ALL' || c.count > 0).map((c) => {
              const Icon = c.icon;
              return (
                <button key={c.id} type="button" className="sgx-chip" style={{ ['--chip' as string]: 'var(--SGX_Yellow)' }} aria-pressed={activeCategory === c.id} onClick={() => setActiveCategory(c.id)}>
                  <Icon aria-hidden />{c.label}<span className="sgx-chip__n">{c.count}</span>
                </button>
              );
            })}
          </div>
          <div className="sgx-chip-row" role="group" aria-label={es ? 'Pilar' : 'Pillar'}>
            <button type="button" className="sgx-chip sgx-chip--ghost" aria-pressed={activePillar === 'ALL'} onClick={() => setActivePillar('ALL')}>
              {es ? 'Todos los pilares' : 'All pillars'}
            </button>
            {SGX_PILLARS.map((p) => (
              <button key={p.key} type="button" className="sgx-chip" style={{ ['--chip' as string]: pillarInk(p.key) }} aria-pressed={activePillar === p.key} onClick={() => setActivePillar(p.key)}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <ul className="sgx-spk__grid">
        {filtered.map((spk) => {
          const confirmed = spk.category === 'CONFIRMED';
          const n = sessionsOf(spk.id).length;
          return (
            <li key={spk.id}>
              <button type="button" className="sgx-card sgx-card--stripe sgx-spk__card" style={{ ['--card-accent' as string]: spk.accent }} onClick={() => setInspected(spk)}>
                <span className="sgx-spk__top">
                  <span className={`sgx-avatar sgx-spk__photo ${spk.photo ? '' : 'sgx-avatar--contain'}`} style={{ ['--avatar-accent' as string]: spk.accent }}>
                    <img src={spk.photo || pillarMark(spk.pillar?.key)} alt="" />
                  </span>
                  <span className="sgx-spk__who">
                    <strong>{spk.name}</strong>
                    <small>{loc(spk, 'role', language)}</small>
                  </span>
                </span>
                <span className="sgx-chip-row">
                  {spk.pillar && <span className="sgx-chip" style={{ ['--chip' as string]: spk.accent }}>{spk.pillar.name}</span>}
                  {confirmed
                    ? <span className="sgx-chip sgx-chip--solid" style={{ ['--chip' as string]: 'var(--SGX_Yellow)' }}>{es ? 'Confirmado' : 'Confirmed'}</span>
                    : <span className="sgx-chip sgx-chip--ghost">{es ? 'Postulación sin confirmar' : 'Unconfirmed application'}</span>}
                  {spk.isKeynote && <span className="sgx-chip" style={{ ['--chip' as string]: 'var(--SGX_Yellow)' }}>Keynote</span>}
                </span>
                <span className="sgx-spk__bio">{loc(spk, 'bio', language) || (es ? 'Postulación sin confirmar.' : 'Unconfirmed application.')}</span>
                <span className="sgx-spk__meta">
                  <span>{spk.organization}</span>
                  {n > 0 && <span><Calendar aria-hidden />{blocks(n)}</span>}
                </span>
              </button>
            </li>
          );
        })}

        <li>
          <button type="button" className="sgx-card sgx-spk__card sgx-spk__call" onClick={openPortal}>
            <span className="sgx-chip-row">
              <span className="sgx-chip">{es ? 'Convocatoria abierta' : 'Open call'}</span>
            </span>
            <strong className="sgx-h">{es ? 'Crea tu perfil de speaker' : 'Create your speaker profile'}</strong>
            <span className="sgx-spk__bio">
              {es
                ? 'Por ahora los únicos ponentes confirmados son Danelson y Ricardo. Los demás ponentes deben registrar su perfil de creador para unirse a la agenda oficial.'
                : 'For now the only confirmed speakers are Danelson and Ricardo. Other speakers must register their creator profile to join the official agenda.'}
            </span>
            <span className="sgx-spk__go">{es ? 'Registrar mi perfil' : 'Register my profile'}<ChevronRight aria-hidden /></span>
          </button>
        </li>
      </ul>

      {filtered.length === 0 && (
        <p className="sgx-fine">{es ? 'Nada coincide con esos filtros.' : 'Nothing matches those filters.'}</p>
      )}

      {inspected && inspectedInfo && (
        <SgxDialog
          onClose={() => setInspected(null)}
          size="md"
          accent={inspectedInfo.accent}
          className="sgx-spk-dlg sgx-dialog--fit"
          title={inspected.name}
          kicker={[loc(inspected, 'role', language), inspected.organization].filter(Boolean).join(' · ')}
          icon={
            <span className={`sgx-avatar ${inspectedInfo.photo ? '' : 'sgx-avatar--contain'}`} style={{ ['--avatar-accent' as string]: inspectedInfo.accent }}>
              <img src={inspectedInfo.photo || pillarMark(inspectedInfo.pillar?.key)} alt="" />
            </span>
          }
          footer={
            <button
              type="button"
              className="sgx-btn sgx-btn--sm"
              onClick={() => {
                setInspected(null);
                window.dispatchEvent(new CustomEvent('sgx:view_holo_card', {
                  detail: {
                    role: 'speaker',
                    status: 'official',
                    name: inspected.name,
                    title: loc(inspected, 'role', language),
                    org: inspected.organization,
                    topic: inspected.day ? (es ? `Día ${inspected.day}` : `Day ${inspected.day}`) : undefined,
                    pillar: inspectedInfo.pillar?.key ?? null,
                    photo: inspectedInfo.photo,
                    handle: inspected.handle,
                  },
                }));
              }}
            >
              <IdCard aria-hidden />{es ? 'Ver su Holo Card' : 'View their Holo Card'}
            </button>
          }
        >
          <div className="sgx-spk-dlg__body">
            <div className="sgx-chip-row">
              {inspectedInfo.pillar && <span className="sgx-chip" style={{ ['--chip' as string]: inspectedInfo.accent }}>{inspectedInfo.pillar.name}</span>}
              {inspectedInfo.category === 'CONFIRMED'
                ? <span className="sgx-chip sgx-chip--solid" style={{ ['--chip' as string]: 'var(--SGX_Yellow)' }}>{es ? 'Confirmado' : 'Confirmed'}</span>
                : <span className="sgx-chip sgx-chip--ghost">{es ? 'Postulación sin confirmar' : 'Unconfirmed application'}</span>}
              {inspected.handle && <span className="sgx-chip sgx-chip--ghost">{inspected.handle}</span>}
            </div>

            <section>
              <p className="sgx-kicker">{es ? 'Biografía' : 'Bio'}</p>
              <p className="sgx-copy">{loc(inspected, 'bio', language)}</p>
            </section>

            {inspected.socialLinks && Object.values(inspected.socialLinks).some(Boolean) && (
              <div className="sgx-spk-dlg__links">
                {inspected.socialLinks.twitter && <a className="sgx-iconbtn" href={inspected.socialLinks.twitter} target="_blank" rel="noreferrer" aria-label="X / Twitter"><Twitter aria-hidden /></a>}
                {inspected.socialLinks.linkedin && <a className="sgx-iconbtn" href={inspected.socialLinks.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin aria-hidden /></a>}
                {inspected.socialLinks.instagram && <a className="sgx-iconbtn" href={inspected.socialLinks.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram aria-hidden /></a>}
                {inspected.socialLinks.github && <a className="sgx-iconbtn" href={inspected.socialLinks.github} target="_blank" rel="noreferrer" aria-label="GitHub"><Github aria-hidden /></a>}
                {inspected.socialLinks.portfolio && <a className="sgx-iconbtn" href={inspected.socialLinks.portfolio} target="_blank" rel="noreferrer" aria-label={es ? 'Portafolio' : 'Portfolio'}><Globe aria-hidden /></a>}
              </div>
            )}

            <section>
              <p className="sgx-kicker">{es ? 'En el programa' : 'In the program'}</p>
              {sessionsOf(inspected.id).length === 0 ? (
                <p className="sgx-fine">{es ? 'Aún no tiene bloques asignados.' : 'No blocks assigned yet.'}</p>
              ) : (
                <ul className="sgx-spk-dlg__sessions">
                  {sessionsOf(inspected.id).map((session) => (
                    <li key={session.id}>
                      <button type="button" className="sgx-card sgx-card--sm" onClick={() => { setInspected(null); onOpenSessionModal?.(session); }} disabled={!onOpenSessionModal}>
                        <span>
                          <strong>{loc(session, 'title', language)}</strong>
                          <small>{es ? 'Día ' : 'Day '}{session.day} · {session.startTime} – {session.endTime}</small>
                        </span>
                        {onOpenSessionModal && <ChevronRight aria-hidden />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </SgxDialog>
      )}
    </div>
  );
};
