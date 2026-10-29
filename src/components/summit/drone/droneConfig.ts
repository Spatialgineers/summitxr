import { Gamepad2, Zap, Trophy } from 'lucide-react';
import type { GuideStep } from '../../common/QuickGuideModal';
import { PILLAR_ACCENT } from '../../../identity/sgxIdentity';
import type { PillarKey } from '../../../lib/sgxPillars';

/* Drone game data: the three San Juan zones, the six powers, the pillar route
   and the guide copy. Kept apart from the component so the game file stays
   about game logic and layout. */

export type ZoneKey = 'CHROMA' | 'VIEJO_SAN_JUAN' | 'ISLA_VERDE';
export const ZONE_ORDER: ZoneKey[] = ['CHROMA', 'VIEJO_SAN_JUAN', 'ISLA_VERDE'];

export interface ZoneConfig {
  key: ZoneKey;
  name: string;
  line: { es: string; en: string };
  fogColor: number;
  skyColor: number;
  /** CSS accent for the zone card and toasts. */
  accent: string;
}

export const ZONES: Record<ZoneKey, ZoneConfig> = {
  CHROMA: {
    key: 'CHROMA',
    name: 'Chroma Space Studios',
    line: { es: 'Torres y puentes de luz alrededor de la sede del Día 3.', en: 'Towers and light bridges around the Day 3 venue.' },
    fogColor: 0x070b16,
    skyColor: 0x05070e,
    accent: '#00DDFF',
  },
  VIEJO_SAN_JUAN: {
    key: 'VIEJO_SAN_JUAN',
    name: 'Viejo San Juan',
    line: { es: 'Bloques de muralla y garitas sobre la bahía.', en: 'City wall blocks and sentry boxes over the bay.' },
    fogColor: 0x0a1420,
    skyColor: 0x060c14,
    accent: '#FFBB00',
  },
  ISLA_VERDE: {
    key: 'ISLA_VERDE',
    name: 'Distrito T-Mobile · Isla Verde',
    line: { es: 'Arcos LED y barreras de luz camino a la playa.', en: 'LED arches and light barriers on the way to the beach.' },
    fogColor: 0x0b0a14,
    skyColor: 0x06050c,
    accent: '#FDCC0D',
  },
};

/* Ruta de los 6 pilares: rings carry the pillar colors in this order. */
export const ROUTE_PILLARS: PillarKey[] = ['STORY', 'SHOWCASE', 'SPARK', 'STAGE', 'SYSTEM', 'SYNTHESIZE'];
export const ROUTE_COLORS: string[] = ROUTE_PILLARS.map((k) => PILLAR_ACCENT[k]);
export const ROUTE_NAMES = ['Story', 'Showcase', 'Spark', 'Stage', 'System', 'Synthesize'];
export const RINGS_PER_ZONE = 18; // three full routes per zone
export const ROUTE_BONUS = 1500;
export const ROUTE_QUEST_ID = 'drone_six_pillars';

export const POINTS = { ring: 250, crate: 400, mine: 150, empBase: 200, empPerMine: 150, gate: 1000 } as const;

export type PowerKey = 'roll' | 'turbo' | 'shield' | 'emp' | 'slowmo' | 'laser';

export interface PowerDef {
  key: PowerKey;
  /** Keyboard key shown on the button. */
  keyCap: { es: string; en: string };
  label: { es: string; en: string };
  /** Cooldown in ms. */
  cooldown: number;
}

export const POWERS: Record<PowerKey, PowerDef> = {
  roll: { key: 'roll', keyCap: { es: 'Q', en: 'Q' }, label: { es: 'Giro', en: 'Roll' }, cooldown: 3500 },
  turbo: { key: 'turbo', keyCap: { es: 'ESP', en: 'SPC' }, label: { es: 'Turbo', en: 'Turbo' }, cooldown: 8000 },
  shield: { key: 'shield', keyCap: { es: 'E', en: 'E' }, label: { es: 'Escudo', en: 'Shield' }, cooldown: 12000 },
  emp: { key: 'emp', keyCap: { es: 'X', en: 'X' }, label: { es: 'Pulso', en: 'Pulse' }, cooldown: 14000 },
  slowmo: { key: 'slowmo', keyCap: { es: 'C', en: 'C' }, label: { es: 'Lento', en: 'Slow-mo' }, cooldown: 15000 },
  laser: { key: 'laser', keyCap: { es: 'F', en: 'F' }, label: { es: 'Láser', en: 'Laser' }, cooldown: 320 },
};
export const POWER_ORDER: PowerKey[] = ['roll', 'turbo', 'shield', 'emp', 'slowmo', 'laser'];

/** Same formula PilotProfileContext.recordDroneFlight uses for the run XP. */
export function runXp(score: number, crates: number, rings: number): number {
  return Math.floor(score / 5) + crates * 50 + rings * 25;
}

export function droneGuideSteps(es: boolean): GuideStep[] {
  if (es) {
    return [
      {
        badge: '1/3 · Controles',
        title: 'Muévete y esquiva',
        subtitle: 'Edificios, puentes, murallas y barreras te restan batería',
        description:
          'El dron avanza solo: tú lo mueves arriba, abajo y a los lados. Si chocas sin escudo rebotas y pierdes batería. Cuando la batería llega a 0, la partida termina.',
        icon: Gamepad2,
        keyControls: [
          { key: 'W S · ↑ ↓', action: 'Subir / bajar' },
          { key: 'A D · ← →', action: 'Izquierda / derecha' },
          { key: 'Q', action: 'Giro evasivo 360°: te protege mientras gira', xpBadge: '+40 XP' },
          { key: 'V', action: 'Cambiar cámara (3ª o 1ª persona)' },
          { key: 'P · Esc', action: 'Pausa' },
        ],
        tips: [
          'En el celular: arrastra el control de la izquierda para moverte y usa los botones de la derecha.',
          'Pasa por el centro de los anillos: rozar el borde te hace rebotar.',
        ],
      },
      {
        badge: '2/3 · Poderes',
        title: 'Seis poderes con recarga',
        subtitle: 'La barra bajo cada botón muestra cuánto falta para usarlo otra vez',
        description: 'Combínalos para pasar las partes más densas de cada zona. Los poderes con XP la suman a tu Estudio al usarlos.',
        icon: Zap,
        keyControls: [
          { key: 'Espacio', action: 'Turbo: 2.4× velocidad por 3.5 s', xpBadge: '+30 XP' },
          { key: 'E', action: 'Escudo: 6 s sin daño', xpBadge: '+35 XP' },
          { key: 'X', action: 'Pulso: elimina las minas cercanas', xpBadge: '+60 XP' },
          { key: 'C', action: 'Cámara lenta: 5 s para apuntar', xpBadge: '+45 XP' },
          { key: 'F · clic', action: 'Láser: destruye minas (+150 pts)' },
        ],
        tips: ['Activa el escudo antes de una fila de edificios.', 'Usa la cámara lenta para alinear el dron con el centro de un anillo.'],
      },
      {
        badge: '3/3 · Zonas y ruta',
        title: 'Tres zonas de San Juan y la Ruta de los 6 pilares',
        subtitle: 'Chroma Space Studios, Viejo San Juan y Distrito T-Mobile · Isla Verde',
        description:
          'Al final de cada zona cruza la puerta amarilla para pasar a la siguiente (+1,000 pts). Los anillos llevan los colores de los 6 pilares SGX: pásalos seguidos en orden (Story, Showcase, Spark, Stage, System, Synthesize) para completar la ruta y ganar +1,500 pts.',
        icon: Trophy,
        tips: [
          'Las cajas de los partners del Summit recargan 25% de batería y dan +400 pts.',
          'Tu mejor puntaje entra al ranking del dron (top 10).',
        ],
      },
    ];
  }
  return [
    {
      badge: '1/3 · Controls',
      title: 'Move and dodge',
      subtitle: 'Buildings, bridges, walls and barriers drain your battery',
      description:
        'The drone moves forward on its own: you steer it up, down and sideways. Crash without a shield and you bounce back and lose battery. When the battery hits 0, the run ends.',
      icon: Gamepad2,
      keyControls: [
        { key: 'W S · ↑ ↓', action: 'Up / down' },
        { key: 'A D · ← →', action: 'Left / right' },
        { key: 'Q', action: '360° evasive roll: protects you while it spins', xpBadge: '+40 XP' },
        { key: 'V', action: 'Switch camera (chase or first person)' },
        { key: 'P · Esc', action: 'Pause' },
      ],
      tips: [
        'On a phone: drag the pad on the left to move and use the buttons on the right.',
        'Go through the center of the rings: grazing the edge bounces you back.',
      ],
    },
    {
      badge: '2/3 · Powers',
      title: 'Six powers with cooldowns',
      subtitle: 'The bar under each button shows when you can use it again',
      description: 'Combine them to get through the densest parts of each zone. Powers with XP add it to your Studio when you use them.',
      icon: Zap,
      keyControls: [
        { key: 'Space', action: 'Turbo: 2.4× speed for 3.5 s', xpBadge: '+30 XP' },
        { key: 'E', action: 'Shield: 6 s without damage', xpBadge: '+35 XP' },
        { key: 'X', action: 'Pulse: clears nearby mines', xpBadge: '+60 XP' },
        { key: 'C', action: 'Slow-mo: 5 s to line up', xpBadge: '+45 XP' },
        { key: 'F · click', action: 'Laser: destroys mines (+150 pts)' },
      ],
      tips: ['Turn on the shield before a row of buildings.', 'Use slow-mo to line the drone up with the center of a ring.'],
    },
    {
      badge: '3/3 · Zones and route',
      title: 'Three San Juan zones and the 6 Pillars Route',
      subtitle: 'Chroma Space Studios, Old San Juan and Distrito T-Mobile · Isla Verde',
      description:
        'At the end of each zone, go through the yellow gate to reach the next one (+1,000 pts). The rings carry the colors of the 6 SGX pillars: clear them in a row, in order (Story, Showcase, Spark, Stage, System, Synthesize), to complete the route and earn +1,500 pts.',
      icon: Trophy,
      tips: [
        'Crates from the Summit partners recharge 25% battery and give +400 pts.',
        'Your best score goes into the drone ranking (top 10).',
      ],
    },
  ];
}

export function zoneName(key: ZoneKey, es: boolean): string {
  return key === 'VIEJO_SAN_JUAN' && !es ? 'Old San Juan' : ZONES[key].name;
}
