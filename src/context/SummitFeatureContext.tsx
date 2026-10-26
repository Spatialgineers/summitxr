import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export type FeatureStatus = 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';

export interface FeatureToggleItem {
  id: string;
  name: string;
  category: 'SECTIONS' | 'HUB_MODULES' | 'MODALS' | 'EXPERIENCES';
  pillar?: string;
  description: string;
  status: FeatureStatus;
  requiresContent: boolean;
  contentAuditNotes: string;
  lastUpdated?: string;
}

export const SECTION_KEY_TO_FEATURE_ID: Record<string, string> = {
  OVERVIEW: 'section_overview',
  PILLARS_MANIFESTO: 'section_pillars_manifesto',
  AGENDA: 'section_agenda',
  BROADCAST_ROOMS: 'section_broadcast_rooms',
  SPEAKERS: 'section_speakers',
  EMBEDS_GAMES: 'section_embeds_games',
  GUILD: 'section_guild',
  MAP_360: 'section_map_360',
  ENTREPRENEUR_MATCH: 'section_entrepreneur_match',
  SPONSORS_HUB: 'section_sponsors_hub',
  SOCIAL_STREAM: 'section_social_stream',
  NETWORKING: 'section_networking',
};

export const HUB_MODULE_TO_SECTION_FEATURE_ID: Record<string, string> = {
  mod_manifesto: 'section_pillars_manifesto',
  mod_agenda: 'section_agenda',
  mod_broadcast: 'section_broadcast_rooms',
  mod_speakers: 'section_speakers',
  mod_drone_sim: 'section_embeds_games',
  mod_guild_trials: 'section_guild',
  mod_map_360: 'section_map_360',
  mod_sgx_match: 'section_entrepreneur_match',
  mod_sponsors_hub: 'section_sponsors_hub',
  mod_social_stream: 'section_social_stream',
  mod_networking_chat: 'section_networking',
  mod_rewards_store: 'modal_rewards_store',
  mod_passport: 'modal_passport',
  mod_speaker_portal: 'modal_speaker_portal',
  mod_guided_tour: 'modal_onboarding_tour',
  mod_full_tour: 'modal_onboarding_tour',
  mod_tickets_pdf: 'modal_tickets',
  mod_vip_ticket: 'modal_tickets',
  mod_sponsor_inquiry: 'modal_sponsor_inquiry',
  mod_sponsor_apply: 'modal_sponsor_inquiry',
  mod_telemetry_play: 'mod_play_vote',
  mod_leaderboard_stats: 'mod_pilot_profile',
};

export const DEFAULT_FEATURE_CONFIG: Record<string, FeatureToggleItem> = {
  // ========================
  // 1. MAIN SECTIONS (TABS & DROPDOWN)
  // ========================
  section_overview: {
    id: 'section_overview',
    name: 'Portal Principal & Núcleo 3D (Overview)',
    category: 'SECTIONS',
    pillar: 'SGX.SYNTHESIZE',
    description: 'Página principal con el Núcleo Orbital 3D de los 6 Pilares, contador regresivo y resumen de 3 días.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Núcleo 3D interactivo y estructura de 3 días activa.',
  },
  section_pillars_manifesto: {
    id: 'section_pillars_manifesto',
    name: 'Manifiesto Oficial & Los 6 Pilares SGX',
    category: 'SECTIONS',
    pillar: 'SGX.STORY',
    description: 'Filosofía tecnocreativa de Spatialgineers, casos reales y galería retrospectiva.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Completado con datos oficiales de los 6 pilares y galería CDN.',
  },
  section_agenda: {
    id: 'section_agenda',
    name: 'Run of Show & Agenda de 3 Días',
    category: 'SECTIONS',
    pillar: 'SGX.STAGE',
    description: 'Línea de tiempo interactiva minuto a minuto (Día 1, Día 2, Día 3) y creador de agenda personalizada.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Cronograma de 3 días sincronizado con el Run of Show oficial.',
  },
  section_broadcast_rooms: {
    id: 'section_broadcast_rooms',
    name: 'Salones Broadcast 4K & Streaming',
    category: 'SECTIONS',
    pillar: 'SGX.STAGE',
    description: 'Salas de transmisión simultánea en vivo junto a Los Mismos TV y YouTube Live.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Salas de transmisión configurables por tenant.',
  },
  section_speakers: {
    id: 'section_speakers',
    name: 'Directorio 3D de Speakers, Artistas & Initiates',
    category: 'SECTIONS',
    pillar: 'SGX.STAGE',
    description: 'Deck de tarjetas 3D holográficas con filtros por pilar, industria y cohorte.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: '8 SGX Guild Initiates oficiales confirmados y fundadores / co-productores activos.',
  },
  section_embeds_games: {
    id: 'section_embeds_games',
    name: 'Simulador de Dron 3D & Hub de Experiencias',
    category: 'SECTIONS',
    pillar: 'SGX.SPARK',
    description: 'Visor de juegos a pantalla completa arriba y catálogo de experiencias embebidas en grilla abajo.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Motor de colisiones 3D Box3 y catálogo de experiencias activo.',
  },
  section_guild: {
    id: 'section_guild',
    name: 'SGX Guild & 8 Ranked Trials Initiates',
    category: 'SECTIONS',
    pillar: 'SGX.SYSTEM',
    description: 'Presentación de portafolios interactivos de los 8 Initiates y métrica Growth Factor.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Cohorte oficial de 8 iniciados con descripciones técnicas y pilares asignados.',
  },
  section_map_360: {
    id: 'section_map_360',
    name: 'Tour Virtual 360° Chroma Space Studios',
    category: 'SECTIONS',
    pillar: 'SGX.SHOWCASE',
    description: 'Navegación espacial virtual interactiva de los 6 nodos de Chroma Space Studios en San Juan.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: '6 nodos principales configurados con descripciones de actividades.',
  },
  section_entrepreneur_match: {
    id: 'section_entrepreneur_match',
    name: 'SGX.Match — Speed Pitching & Matchmaking B2B',
    category: 'SECTIONS',
    pillar: 'SGX.SHOWCASE',
    description: 'Emparejamiento inteligente entre fundadores, inversionistas, estudios XR y marcas.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Perfiles de matchmaking y sistema de conexión en tiempo real.',
  },
  section_sponsors_hub: {
    id: 'section_sponsors_hub',
    name: 'Dossier de Auspicios & Marcas Aliadas (5 Tiers)',
    category: 'SECTIONS',
    pillar: 'SGX.SHOWCASE',
    description: 'Matriz comparativa de 5 niveles de patrocinio, Brand Showcases y formulario de alianzas.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Estructura de 5 tiers y socios estratégicos oficiales.',
  },
  section_social_stream: {
    id: 'section_social_stream',
    name: 'Live Social Stream & Radar #SGX2026',
    category: 'SECTIONS',
    pillar: 'SGX.SHOWCASE',
    description: 'Muro interactivo en tiempo real de publicaciones en Instagram, X y Threads.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Radar social conectado a Firestore y curación de posts.',
  },
  section_networking: {
    id: 'section_networking',
    name: 'Foros del Summit & Chat de Networking',
    category: 'SECTIONS',
    pillar: 'SGX.SYNTHESIZE',
    description: 'Canales de chat en tiempo real por día y pilar con insignias de piloto.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Canales sincronizados con Firestore en tiempo real.',
  },

  // ========================
  // 2. 3D CORE SUB-MODULES & SANDBOXES
  // ========================
  mod_relic_studio: {
    id: 'mod_relic_studio',
    name: 'Inspector Holográfico de Reliquias .GLB',
    category: 'HUB_MODULES',
    pillar: 'SGX.STORY',
    description: 'Laboratorio 3D para inspeccionar modelos GLB con luz neutra original, wireframe y oro solar.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Modelos GLB oficiales con preservación de materiales originales.',
  },
  mod_avatar: {
    id: 'mod_avatar',
    name: 'Avatar Studio 3D (Generador de Piloto)',
    category: 'HUB_MODULES',
    pillar: 'SGX.STORY',
    description: 'Creador de avatares e insignias holográficas para asistentes.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Exportación PNG y sincronización con perfil de piloto.',
  },
  mod_pilot_profile: {
    id: 'mod_pilot_profile',
    name: 'Bitácora de Piloto, Nivel XP & Leaderboard',
    category: 'HUB_MODULES',
    pillar: 'SGX.STORY',
    description: 'Modal global de perfil de piloto, desglose de XP del fin de semana y tabla de líderes.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Conectado a Firestore pilot_profiles y pilot_leaderboard.',
  },
  mod_visualizer_stage: {
    id: 'mod_visualizer_stage',
    name: 'Escenario 3D Reactivo CYOA (/stage)',
    category: 'HUB_MODULES',
    pillar: 'SGX.STAGE',
    description: 'Motor visual Three.js de pantalla completa sincronizado con decisiones de la audiencia.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Presets 3D oficiales listos para proyección.',
  },
  mod_stage_synth: {
    id: 'mod_stage_synth',
    name: 'Mesa de Frecuencias & Sintetizador 432Hz',
    category: 'HUB_MODULES',
    pillar: 'SGX.STAGE',
    description: 'Sintetizador espacial Web Audio en directo dentro del Núcleo 3D.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Motor de audio procedural activo.',
  },
  mod_play_vote: {
    id: 'mod_play_vote',
    name: 'Consola Interactiva de Audiencia (/play)',
    category: 'HUB_MODULES',
    pillar: 'SGX.SPARK',
    description: 'Terminal móvil y web para votar en vivo durante las sesiones CYOA y trivias.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Sincronización en vivo con el escenario principal.',
  },
  mod_telemetry_sandbox: {
    id: 'mod_telemetry_sandbox',
    name: 'Analíticas & Telemetría en Tiempo Real (SGX.SYSTEM)',
    category: 'HUB_MODULES',
    pillar: 'SGX.SYSTEM',
    description: 'Dashboard en vivo de métricas del Summit, embudo de conversión, telemetría de red y exportación CSV.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Conectado en tiempo real a Firestore, sesión activa y perfil de piloto.',
  },
  mod_qr_scanner: {
    id: 'mod_qr_scanner',
    name: 'Escáner QR WebXR de Credenciales (Rolodex)',
    category: 'HUB_MODULES',
    pillar: 'SGX.SHOWCASE',
    description: 'Escáner de códigos QR para conectar con otros asistentes en Chroma Space Studios.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Rolodex digital de contactos presenciales.',
  },

  // ========================
  // 3. MODALS & GLOBAL ACTIONS
  // ========================
  modal_tickets: {
    id: 'modal_tickets',
    name: 'Modal de Registro & Taquilla PDF',
    category: 'MODALS',
    pillar: 'SGX.SYNTHESIZE',
    description: 'Formulario de registro de asistentes y descarga inmediata de boleto en PDF.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Generador PDF de taquilla oficial y registro en Firestore.',
  },
  modal_sponsor_inquiry: {
    id: 'modal_sponsor_inquiry',
    name: 'Modal de Solicitud de Patrocinio',
    category: 'MODALS',
    pillar: 'SGX.SHOWCASE',
    description: 'Formulario corporativo para marcas interesadas en auspiciar el Summit.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Integrado con el CRM de patrocinadores en el panel Admin.',
  },
  modal_speaker_portal: {
    id: 'modal_speaker_portal',
    name: 'Portal de Autogestión de Speakers & Artistas',
    category: 'MODALS',
    pillar: 'SGX.STAGE',
    description: 'Consola para que ponentes y artistas registren o actualicen su biografía y sesión.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Sincronización directa con el directorio de speakers.',
  },
  modal_rewards_store: {
    id: 'modal_rewards_store',
    name: 'Tienda de Recompensas & Canje XP',
    category: 'MODALS',
    pillar: 'SGX.SPARK',
    description: 'Catálogo de beneficios, merchandising y pases VIP canjeables con puntos XP.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Conectado al saldo XP en tiempo real del piloto.',
  },
  modal_passport: {
    id: 'modal_passport',
    name: 'Pasaporte Digital del Summit (Misiones)',
    category: 'MODALS',
    pillar: 'SGX.STORY',
    description: 'Progreso de misiones en los 6 pilares, sellos digitales y código QR del asistente.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Sistema de sellos por pilar activo.',
  },
  modal_onboarding_tour: {
    id: 'modal_onboarding_tour',
    name: 'Tour Guiado Interactivo de Bienvenida',
    category: 'MODALS',
    pillar: 'SGX.SPARK',
    description: 'Recorrido paso a paso con foco luminoso por las funciones del Summit.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Tour interactivo de 5 estaciones.',
  },
  modal_brand_showcase: {
    id: 'modal_brand_showcase',
    name: 'Landing Modal de Marcas Patrocinadoras',
    category: 'MODALS',
    pillar: 'SGX.SHOWCASE',
    description: 'Vista detallada de socios estratégicos con ofertas y códigos promocionales.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Showcases activos para Chroma Space Studios y Los Mismos TV.',
  },

  // ========================
  // 4. FLOATING WIDGETS & EXPERIENCES
  // ========================
  exp_pulse_reactions: {
    id: 'exp_pulse_reactions',
    name: 'Widget Flotante de Reacciones en Vivo (Keynote Pulse)',
    category: 'EXPERIENCES',
    pillar: 'SGX.STAGE',
    description: 'Botón flotante inferior para enviar reacciones holográficas durante el Keynote.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Partículas holográficas y contador en tiempo real.',
  },
  exp_push_alerts: {
    id: 'exp_push_alerts',
    name: 'Alertas Push en Vivo & Notificaciones de Sesión',
    category: 'EXPERIENCES',
    pillar: 'SGX.SYSTEM',
    description: 'Notificaciones emergentes cuando inicia una sesión o el director emite un aviso.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Toasts dinámicos con chime sonoro.',
  },
  exp_sponsor_ticker: {
    id: 'exp_sponsor_ticker',
    name: 'Cinta Global de Patrocinadores (Top Ticker & Banners)',
    category: 'EXPERIENCES',
    pillar: 'SGX.SHOWCASE',
    description: 'Carrusel superior de marcas aliadas y banners rotativos de patrocinio.',
    status: 'ACTIVE',
    requiresContent: false,
    contentAuditNotes: 'Rotación automática de socios aprobados.',
  },
};

interface SummitFeatureContextType {
  features: Record<string, FeatureToggleItem>;
  isFeatureActive: (featureId: string) => boolean;
  isFeatureInMaintenance: (featureId: string) => boolean;
  isFeatureVisible: (featureId: string) => boolean;
  getFeatureStatus: (featureId: string) => FeatureStatus;
  isSectionVisible: (sectionKey: string) => boolean;
  getSectionStatus: (sectionKey: string) => FeatureStatus;
  isHubModuleVisible: (moduleId: string) => boolean;
  getHubModuleStatus: (moduleId: string) => FeatureStatus;
  updateFeatureStatus: (featureId: string, status: FeatureStatus) => void;
  bulkUpdateCategoryStatus: (category: FeatureToggleItem['category'] | 'ALL', status: FeatureStatus) => void;
  updateFeatureAuditNotes: (featureId: string, notes: string, requiresContent: boolean) => void;
  resetToDefaults: () => void;
  isAuditModalOpen: boolean;
  setAuditModalOpen: (open: boolean) => void;
}

const SummitFeatureContext = createContext<SummitFeatureContextType | undefined>(undefined);

const STORAGE_KEY = 'spatialgineers_summit_feature_toggles_v2';

function mergeWithDefaults(savedMap: Record<string, any>): Record<string, FeatureToggleItem> {
  const merged: Record<string, FeatureToggleItem> = { ...DEFAULT_FEATURE_CONFIG };
  for (const key of Object.keys(DEFAULT_FEATURE_CONFIG)) {
    if (savedMap && savedMap[key] && savedMap[key].status) {
      merged[key] = {
        ...DEFAULT_FEATURE_CONFIG[key],
        status: savedMap[key].status,
        contentAuditNotes: savedMap[key].contentAuditNotes ?? DEFAULT_FEATURE_CONFIG[key].contentAuditNotes,
        requiresContent: savedMap[key].requiresContent ?? DEFAULT_FEATURE_CONFIG[key].requiresContent,
        lastUpdated: savedMap[key].lastUpdated,
      };
    }
  }
  return merged;
}

export const SummitFeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<Record<string, FeatureToggleItem>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return mergeWithDefaults(JSON.parse(saved));
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_FEATURE_CONFIG;
  });

  const [isAuditModalOpen, setAuditModalOpen] = useState(false);

  // Sync in real time with Firestore `/site_config/feature_toggles` so changes apply globally
  useEffect(() => {
    if (!db) return;
    const configRef = doc(db, 'site_config', 'feature_toggles');
    const unsubscribe = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.toggles && typeof data.toggles === 'object') {
            const next = mergeWithDefaults(data.toggles);
            setFeatures(next);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}
          }
        }
      },
      () => {
        // Silent fallback to localStorage if offline
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen for global custom event to open module visibility manager from anywhere
  useEffect(() => {
    const handleOpenVisibilityModal = () => setAuditModalOpen(true);
    window.addEventListener('sgx:open_module_visibility', handleOpenVisibilityModal);
    return () => window.removeEventListener('sgx:open_module_visibility', handleOpenVisibilityModal);
  }, []);

  const persistFeatures = (nextFeatures: Record<string, FeatureToggleItem>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFeatures));
    } catch {}
    if (db) {
      const compactToggles: Record<string, { status: FeatureStatus; lastUpdated?: string }> = {};
      Object.values(nextFeatures).forEach((item) => {
        compactToggles[item.id] = {
          status: item.status,
          lastUpdated: item.lastUpdated || new Date().toISOString(),
        };
      });
      setDoc(
        doc(db, 'site_config', 'feature_toggles'),
        {
          toggles: compactToggles,
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch(() => {});
    }
  };

  const getFeatureStatus = (featureId: string): FeatureStatus => {
    return features[featureId]?.status || 'ACTIVE';
  };

  const isFeatureActive = (featureId: string): boolean => {
    return getFeatureStatus(featureId) === 'ACTIVE';
  };

  const isFeatureInMaintenance = (featureId: string): boolean => {
    return getFeatureStatus(featureId) === 'MAINTENANCE';
  };

  // Visible means NOT disabled (both ACTIVE and MAINTENANCE are visible in the UI, whereas DISABLED is completely hidden)
  const isFeatureVisible = (featureId: string): boolean => {
    return getFeatureStatus(featureId) !== 'DISABLED';
  };

  const getSectionStatus = (sectionKey: string): FeatureStatus => {
    if (sectionKey === 'OVERVIEW' || sectionKey === 'PILLAR') return 'ACTIVE';
    const featureId = SECTION_KEY_TO_FEATURE_ID[sectionKey] || sectionKey;
    return getFeatureStatus(featureId);
  };

  const isSectionVisible = (sectionKey: string): boolean => {
    if (sectionKey === 'OVERVIEW') return true;
    return getSectionStatus(sectionKey) !== 'DISABLED';
  };

  const getHubModuleStatus = (moduleId: string): FeatureStatus => {
    // Check if the specific hub module has its own toggle first
    if (features[moduleId]) {
      const directStatus = features[moduleId].status;
      if (directStatus !== 'ACTIVE') return directStatus;
    }
    // Check if the module maps to a main section or modal toggle
    const mappedId = HUB_MODULE_TO_SECTION_FEATURE_ID[moduleId];
    if (mappedId && features[mappedId]) {
      return features[mappedId].status;
    }
    return 'ACTIVE';
  };

  const isHubModuleVisible = (moduleId: string): boolean => {
    return getHubModuleStatus(moduleId) !== 'DISABLED';
  };

  const updateFeatureStatus = (featureId: string, status: FeatureStatus) => {
    setFeatures((prev) => {
      const existing = prev[featureId] || DEFAULT_FEATURE_CONFIG[featureId];
      if (!existing) return prev;
      const next = {
        ...prev,
        [featureId]: {
          ...existing,
          status,
          lastUpdated: new Date().toISOString(),
        },
      };
      persistFeatures(next);
      return next;
    });
  };

  const bulkUpdateCategoryStatus = (
    category: FeatureToggleItem['category'] | 'ALL',
    status: FeatureStatus
  ) => {
    setFeatures((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key === 'section_overview' && status === 'DISABLED') return; // Keep main overview portal accessible
        if (category === 'ALL' || next[key].category === category) {
          next[key] = {
            ...next[key],
            status,
            lastUpdated: new Date().toISOString(),
          };
        }
      });
      persistFeatures(next);
      return next;
    });
  };

  const updateFeatureAuditNotes = (
    featureId: string,
    contentAuditNotes: string,
    requiresContent: boolean
  ) => {
    setFeatures((prev) => {
      if (!prev[featureId]) return prev;
      const next = {
        ...prev,
        [featureId]: {
          ...prev[featureId],
          contentAuditNotes,
          requiresContent,
          lastUpdated: new Date().toISOString(),
        },
      };
      persistFeatures(next);
      return next;
    });
  };

  const resetToDefaults = () => {
    setFeatures(DEFAULT_FEATURE_CONFIG);
    persistFeatures(DEFAULT_FEATURE_CONFIG);
  };

  return (
    <SummitFeatureContext.Provider
      value={{
        features,
        isFeatureActive,
        isFeatureInMaintenance,
        isFeatureVisible,
        getFeatureStatus,
        isSectionVisible,
        getSectionStatus,
        isHubModuleVisible,
        getHubModuleStatus,
        updateFeatureStatus,
        bulkUpdateCategoryStatus,
        updateFeatureAuditNotes,
        resetToDefaults,
        isAuditModalOpen,
        setAuditModalOpen,
      }}
    >
      {children}
    </SummitFeatureContext.Provider>
  );
};

export const useSummitFeatures = () => {
  const context = useContext(SummitFeatureContext);
  if (!context) {
    throw new Error('useSummitFeatures must be used within a SummitFeatureProvider');
  }
  return context;
};
