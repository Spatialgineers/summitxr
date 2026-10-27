import React, { useEffect, useState } from 'react';
import { Award, UserCheck, Target } from 'lucide-react';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { loadAllInitiates, type SgxInitiate } from '../../lib/summitData';
import { initiateCredential } from '../../identity/credentials';

/** The Guild roster lives in the CMS (admin → Inscritos → Initiates); this is the seed. */
export { INITIAL_INITIATES as OFFICIAL_INITIATES } from '../../lib/summitData';

export const GUILD_MINDSET_QUOTES = [
  "De espectadores pasivos a ingenieros creativos del futuro espacial.",
  "La promesa no es un empleo fácil, la promesa es una educación que te separará del resto.",
  "El talento que no se muestra, no existe. Construimos en público.",
  "No medimos de dónde vienes, medimos a qué velocidad evolucionas.",
];

export const GUILD_MINDSET_QUOTES_EN = [
  "From passive spectators to creative engineers of the spatial future.",
  "The promise isn't an easy job; the promise is an education that sets you apart.",
  "Talent that isn't shown doesn't exist. We build in public.",
  "We don't measure where you come from; we measure how fast you evolve.",
];

export const SgxGuildShowcaseSection: React.FC = () => {
  const { language } = useLanguage();
  const [activeQuoteIdx, setActiveQuoteIdx] = useState(0);
  const { tenant, styles } = useTenantTheme();
  const [initiates, setInitiates] = useState<SgxInitiate[]>(() => loadAllInitiates());
  useEffect(() => {
    const reload = () => setInitiates(loadAllInitiates());
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, []);

  return (
    <section className="border-y py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-400" style={styles.ambientBgStyle}>
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Title with Official Guild Logo */}
        <div className="text-center space-y-4 max-w-3xl mx-auto flex flex-col items-center">
          <div className="p-3 bg-[#121212] border-2 border-[#32527B] shadow-2xl inline-block"
               style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}>
            <img 
              src="https://cdn.spatialgineers.com/Branding/Guild/Guild%20color.png" 
              alt="SGX Guild Official Emblem" 
              className="h-16 sm:h-20 w-auto object-contain filter drop-shadow-[0_0_16px_rgba(50,82,123,0.8)]"
            />
          </div>

          <div 
            className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono font-bold" 
            style={{ 
              clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
              ...styles.neonBadgeStyle 
            }}
          >
            <Award className="w-4 h-4" />
            <span>SGX GUILD SHOWCASE 2026</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wider font-['Orbitron',sans-serif] uppercase">
            SGX Guild: <span style={styles.gradientTextStyle}>Initiates 2026</span>
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed font-sans">
            {language === 'es' ? 'El SGX Guild es público y gratis para estudiantes universitarios (18 años o más). Los SGX Ranked Trials comenzaron el 4 de octubre de 2026. En el Summit, los 8 Initiates activos presentan su portafolio el Día 1 (8 min c/u) y los top 6 presentan en la SGX Guild Ranked Trials Pitch Session del Día 3 (5 min c/u).' : 'The SGX Guild is public and free for university students (18 and older). The SGX Ranked Trials began on October 4, 2026. At the Summit, the 8 active Initiates present their portfolios on Day 1 (8 min each) and the top 6 present at the Day 3 SGX Guild Ranked Trials Pitch Session (5 min each).'}
          </p>
        </div>

        {/* 8 Official Initiates Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: tenant.branding.borderColor }}>
            <h3 className="text-lg font-extrabold text-white uppercase tracking-wider font-['Orbitron',sans-serif] flex items-center gap-2">
              <UserCheck className="w-5 h-5" style={{ color: tenant.branding.primaryColor }} />
              {language === 'es' ? 'Initiates Oficiales del SGX Guild' : 'Official SGX Guild Initiates'}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold" style={{ color: tenant.branding.neonHighlightColor }}>
                {language === 'es' ? `${initiates.length} Initiates activos` : `${initiates.length} active Initiates`}
              </span>
              {/* An initiate's card unlocks on their own pass (Google sign-in with the email the team registered). */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('sgx:open_holo_card', { detail: { role: 'initiate' } }))}
                className="sgx-btn sgx-btn--sm"
              >
                {language === 'es' ? 'Soy Initiate · mi Holo Card' : 'I\'m an Initiate · my Holo Card'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {initiates.map((init) => (
              <div
                key={init.id}
                className="p-4 transition-all font-mono space-y-2 group sgx-crystal-card hover:scale-[1.01]"
                style={{
                  clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                      style={{
                        clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)',
                        backgroundColor: `rgba(var(--sgx-primary-rgb), 0.2)`,
                        color: tenant.branding.primaryColor,
                        border: `1px solid ${tenant.branding.primaryColor}`,
                      }}
                    >
                      {init.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{init.name}</h4>
                      <span className="text-[10px] text-slate-400">{init.handle}</span>
                    </div>
                  </div>
                  <span 
                    className="text-[10px] px-2 py-0.5 font-bold" 
                    style={{
                      clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)',
                      ...styles.neonBadgeStyle
                    }}
                  >
                    {init.pillar}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <p className="text-xs font-bold" style={{ color: tenant.branding.primaryColor }}>{init.role}</p>
                  <p className="text-[11px] text-slate-300">{loc(init, 'specialty', language)}</p>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  {/* Initiates run individually in this phase (no teams). */}
                  <span>{language === 'es' ? 'Pilar: ' : 'Pillar: '}<strong className="text-white">{init.pillar}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      const card = initiateCredential(init.id);
                      if (card) window.dispatchEvent(new CustomEvent('sgx:view_holo_card', { detail: card }));
                    }}
                    className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500 hover:text-black border border-cyan-400 text-cyan-300 font-bold transition-all rounded cursor-pointer flex items-center gap-1"
                  >
                    <span>Holo Card</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evaluation Metric: Growth Factor Overview */}
        <div 
          className="p-6 space-y-4 font-mono tenant-card" 
          style={{
            clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            ...styles.cardStyle
          }}
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: tenant.branding.primaryColor }} />
            <h3 className="text-base font-bold text-white uppercase font-['Orbitron',sans-serif]">
              {language === 'es' ? 'La Métrica Growth Factor de SGX Guild' : 'The SGX Guild Growth Factor Metric'}
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {language === 'es' ? 'A diferencia de los programas educativos tradicionales, el desarrollo en los SGX Ranked Trials no depende de exámenes escritos, sino de la evaluación objetiva mediante tres vectores fundamentales:' : 'Unlike traditional education programs, progress in the SGX Ranked Trials doesn\'t depend on written exams but on objective evaluation along three core vectors:'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div 
              className="p-3 bg-[#232323]/80 border border-slate-700 space-y-1 transition-all hover:border-cyan-400"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <span className="font-bold block" style={{ color: tenant.branding.primaryColor }}>{language === 'es' ? '1. Comunicación & Autonomía' : '1. Communication & Autonomy'}</span>
              <p className="text-slate-400 text-[11px]">
                {language === 'es' ? 'Respeto profesional, capacidad de iteración sin fricción y trabajo autónomo en equipo.' : 'Professional respect, frictionless iteration and autonomous teamwork.'}
              </p>
            </div>
            <div 
              className="p-3 bg-[#232323]/80 border border-slate-700 space-y-1 transition-all hover:border-amber-400"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <span className="font-bold block" style={{ color: tenant.branding.secondaryColor }}>{language === 'es' ? '2. Rigor de Ingeniería' : '2. Engineering Rigor'}</span>
              <p className="text-slate-400 text-[11px]">
                {language === 'es' ? 'Calidad de código Shader/WebGL, optimización de frames por segundo y destreza técnica.' : 'Shader/WebGL code quality, frames-per-second optimization and technical skill.'}
              </p>
            </div>
            <div 
              className="p-3 bg-[#232323]/80 border border-slate-700 space-y-1 transition-all hover:border-cyan-400"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <span className="font-bold block" style={{ color: tenant.branding.accentColor }}>{language === 'es' ? '3. Visión & Consistencia' : '3. Vision & Consistency'}</span>
              <p className="text-slate-400 text-[11px]">
                {language === 'es' ? 'Coherencia temática del entregable espacial y presentación interactiva impecable.' : 'Thematic coherence of the spatial deliverable and a flawless interactive presentation.'}
              </p>
            </div>
          </div>
        </div>

        {/* Mindset Quotes Carousel */}
        <div 
          className="p-6 border text-center space-y-3" 
          style={{
            clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            ...styles.glowBorderStyle
          }}
        >
          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">{language === 'es' ? 'MANIFESTO DEL GUILD' : 'GUILD MANIFESTO'}</span>
          <p className="text-base sm:text-lg italic font-mono text-white max-w-2xl mx-auto">
            "{(language === 'es' ? GUILD_MINDSET_QUOTES : GUILD_MINDSET_QUOTES_EN)[activeQuoteIdx]}"
          </p>
          <div className="flex justify-center gap-2 pt-2">
            {GUILD_MINDSET_QUOTES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveQuoteIdx(i)}
                className={`w-3 h-3 transition-all ${
                  activeQuoteIdx === i ? 'scale-125' : 'opacity-40'
                }`}
                style={{ 
                  clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)',
                  backgroundColor: activeQuoteIdx === i ? tenant.branding.primaryColor : '#575757' 
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
