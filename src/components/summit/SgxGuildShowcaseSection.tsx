import React, { useState } from 'react';
import { Award, UserCheck, Target } from 'lucide-react';
import { useTenantTheme } from '../../context/TenantThemeContext';

export const OFFICIAL_INITIATES = [
  {
    id: 'init_1',
    name: 'Fabián Nieves',
    handle: '@fabian_nieves',
    role: 'Spatial Architect',
    team: 'SGX.Sparkers',
    pillar: 'SGX.SPARK',
    specialty: 'WebGL Pavilions & Arquitectura Espacial 3D',
  },
  {
    id: 'init_2',
    name: 'Sebasthian Andre Rosado',
    handle: '@sebasthian_rosado',
    role: 'Transmedia Lead',
    team: 'SGX.Stagers',
    pillar: 'SGX.STAGE',
    specialty: 'Dirección Transmedia & Entornos Virtuales',
  },
  {
    id: 'init_3',
    name: 'Gabriela Cintrón',
    handle: '@gabriela_cintron',
    role: 'Shader Artisan',
    team: 'SGX.Storytellers',
    pillar: 'SGX.STORY',
    specialty: 'GLSL Shader Art & Iluminación Procedural',
  },
  {
    id: 'init_4',
    name: 'Elvin G. Andrades',
    handle: '@elvin_andrades',
    role: 'Stage MoCap Engineer',
    team: 'SGX.Sparkers',
    pillar: 'SGX.STAGE',
    specialty: 'Captura de Movimiento & Rigging Reactivo',
  },
  {
    id: 'init_5',
    name: 'Christian Jimenez Machuca',
    handle: '@christian_jimenez',
    role: 'Systems Logic Engineer',
    team: 'SGX.Sparkers',
    pillar: 'SGX.SYSTEM',
    specialty: 'Gamificación, WebSockets & Real-Time Sync',
  },
  {
    id: 'init_6',
    name: 'Mellangie González',
    handle: '@mellangie_gonzalez',
    role: 'Worldbuilder & Environment Artist',
    team: 'SGX.Stagers',
    pillar: 'SGX.SHOWCASE',
    specialty: 'Modelado Espacial & Narrativa Ambiental',
  },
  {
    id: 'init_7',
    name: 'Luis E. A. Fontánez Casanova',
    handle: '@luis_fontanez',
    role: 'Mechanics & Gamification Dev',
    team: 'SGX.Stagers',
    pillar: 'SGX.SPARK',
    specialty: 'Mecánicas de Interacción & Recompensas',
  },
  {
    id: 'init_8',
    name: 'Luis A. Oneill',
    handle: '@luis_oneill',
    role: 'Full-Stack AI & WebXR Pipeline',
    team: 'SGX.Storytellers',
    pillar: 'SGX.SYNTHESIZE',
    specialty: 'Pipelines WebXR Autónomos con IA',
  },
];

export const GUILD_MINDSET_QUOTES = [
  "De espectadores pasivos a ingenieros creativos del futuro espacial.",
  "La promesa no es un empleo fácil, la promesa es una educación que te separará del resto.",
  "El talento que no se muestra, no existe. Construimos en público.",
  "No medimos de dónde vienes, medimos a qué velocidad evolucionas.",
];

export const SgxGuildShowcaseSection: React.FC = () => {
  const [activeQuoteIdx, setActiveQuoteIdx] = useState(0);
  const { tenant, styles } = useTenantTheme();

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
            El SGX Guild es público y gratis para estudiantes universitarios (18 años o más). Los SGX Ranked Trials comenzaron el 4 de octubre de 2026. En el Summit, los 8 Initiates activos presentan su portafolio el Día 1 (8 min c/u) y los top 6 presentan en la SGX Guild Ranked Trials Pitch Session del Día 3 (5 min c/u).
          </p>
        </div>

        {/* 8 Official Initiates Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: tenant.branding.borderColor }}>
            <h3 className="text-lg font-extrabold text-white uppercase tracking-wider font-['Orbitron',sans-serif] flex items-center gap-2">
              <UserCheck className="w-5 h-5" style={{ color: tenant.branding.primaryColor }} />
              Initiates Oficiales del SGX Guild
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold" style={{ color: tenant.branding.neonHighlightColor }}>
                8 Initiates activos
              </span>
              {/* Initiates make their own card from their SGX Pass (same name, photo and code). */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('sgx:open_holo_card', {
                  detail: { self: true, role: 'INITIATE', title: 'INICIADO OFICIAL · SGX GUILD', org: 'SGX Guild Program 2026', tier: 'INITIATE' }
                }))}
                className="sgx-btn sgx-btn--sm"
              >
                Soy Initiate · mi Holo Card
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {OFFICIAL_INITIATES.map((init) => (
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
                  <p className="text-[11px] text-slate-300">{init.specialty}</p>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Equipo: <strong className="text-white">{init.team}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('sgx:open_holo_card', {
                        detail: {
                          role: 'INITIATE',
                          name: init.name,
                          handle: init.handle,
                          title: init.role,
                          org: 'SGX Guild Program 2026',
                          bio: init.specialty,
                          studio: init.team,
                          tier: 'INITIATE'
                        }
                      }));
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
              La Métrica Growth Factor de SGX Guild
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            A diferencia de los programas educativos tradicionales, el desarrollo en los SGX Ranked Trials no depende de exámenes escritos, sino de la evaluación objetiva mediante tres vectores fundamentales:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div 
              className="p-3 bg-[#232323]/80 border border-slate-700 space-y-1 transition-all hover:border-cyan-400"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <span className="font-bold block" style={{ color: tenant.branding.primaryColor }}>1. Comunicación & Autonomía</span>
              <p className="text-slate-400 text-[11px]">
                Respeto profesional, capacidad de iteración sin fricción y trabajo autónomo en equipo.
              </p>
            </div>
            <div 
              className="p-3 bg-[#232323]/80 border border-slate-700 space-y-1 transition-all hover:border-amber-400"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <span className="font-bold block" style={{ color: tenant.branding.secondaryColor }}>2. Rigor de Ingeniería</span>
              <p className="text-slate-400 text-[11px]">
                Calidad de código Shader/WebGL, optimización de frames por segundo y destreza técnica.
              </p>
            </div>
            <div 
              className="p-3 bg-[#232323]/80 border border-slate-700 space-y-1 transition-all hover:border-cyan-400"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <span className="font-bold block" style={{ color: tenant.branding.accentColor }}>3. Visión & Consistencia</span>
              <p className="text-slate-400 text-[11px]">
                Coherencia temática del entregable espacial y presentación interactiva impecable.
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
          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">MANIFESTO DEL GUILD</span>
          <p className="text-base sm:text-lg italic font-mono text-white max-w-2xl mx-auto">
            "{GUILD_MINDSET_QUOTES[activeQuoteIdx]}"
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
