import { Gamepad2, Zap, Trophy } from 'lucide-react';
import type { GuideStep } from '../../common/QuickGuideModal';
import { PILLAR_ACCENT } from '../../../identity/sgxIdentity';
import type { PillarKey } from '../../../lib/sgxPillars';

/* Drone game data: the three San Juan zones and their look, the tuning, the
   four powers, the pillar route and the guide copy. Kept apart from the
   component so the game file stays about game logic and layout. */

export type ZoneKey = 'CHROMA' | 'VIEJO_SAN_JUAN' | 'ISLA_VERDE';
export const ZONE_ORDER: ZoneKey[] = ['CHROMA', 'VIEJO_SAN_JUAN', 'ISLA_VERDE'];

export interface ZoneConfig {
  key: ZoneKey;
  name: string;
  line: { es: string; en: string };
  /** CSS accent for the zone card and toasts. */
  accent: string;
  /** Sky: zenith and horizon glow; fog takes the horizon color. */
  skyTop: number;
  skyHorizon: number;
  fog: number;
  /** SGX tile (public/pilot/tex) on facades and on the ground. */
  facadeTex: string;
  groundTex: string;
  groundTint: number;
  /** Neon edge colors the facades cycle through. */
  edges: number[];
}

export const ZONES: Record<ZoneKey, ZoneConfig> = {
  CHROMA: {
    key: 'CHROMA',
    name: 'Chroma Space Studios',
    line: { es: 'Torres y puentes de luz alrededor de la sede del Día 3.', en: 'Towers and light bridges around the Day 3 venue.' },
    accent: '#00DDFF',
    skyTop: 0x02040a,
    skyHorizon: 0x0b2a3d,
    fog: 0x081a26,
    facadeTex: 'panel-hud',
    groundTex: 'reticula-holodeck',
    groundTint: 0x2a8fb0,
    edges: [0x00ddff, 0x00ddff, 0xfdcc0d],
  },
  VIEJO_SAN_JUAN: {
    key: 'VIEJO_SAN_JUAN',
    name: 'Viejo San Juan',
    line: { es: 'Murallas y garitas sobre la bahía al atardecer.', en: 'City walls and sentry boxes over the bay at dusk.' },
    accent: '#FFBB00',
    skyTop: 0x060814,
    skyHorizon: 0x4a2208,
    fog: 0x24140c,
    facadeTex: 'engranajes-sgx',
    groundTex: 'escudo-de-energia',
    groundTint: 0x1d5f8a,
    edges: [0xffbb00, 0xfdcc0d, 0x00ddff],
  },
  ISLA_VERDE: {
    key: 'ISLA_VERDE',
    name: 'Distrito T-Mobile · Isla Verde',
    line: { es: 'Túnel de arcos LED y barreras de luz camino a la playa.', en: 'A tunnel of LED arches and light barriers to the beach.' },
    accent: '#FDCC0D',
    skyTop: 0x04030a,
    skyHorizon: 0x2c0f33,
    fog: 0x150a1c,
    facadeTex: 'red-de-energia-sgx',
    groundTex: 'circuito-futurista',
    groundTint: 0xb87000,
    edges: [0xfdcc0d, 0x00ddff, 0xff7ad9],
  },
};

/* Ruta de los 6 pilares: rings carry the pillar colors in this order. */
export const ROUTE_PILLARS: PillarKey[] = ['STORY', 'SHOWCASE', 'SPARK', 'STAGE', 'SYSTEM', 'SYNTHESIZE'];
export const ROUTE_COLORS: string[] = ROUTE_PILLARS.map((k) => PILLAR_ACCENT[k]);
export const ROUTE_NAMES = ['Story', 'Showcase', 'Spark', 'Stage', 'System', 'Synthesize'];
export const ROUTE_ICONS = ['/holo/story.png', '/holo/showcase.png', '/holo/spark.png', '/holo/stage.png', '/holo/system.png', '/holo/synthesize.png'];
export const ROUTE_BONUS = 1000;
/** The Reactor pays the secret SGX.Spark mission "Ruta de los 6 pilares" on this event. */
export const ROUTE_EVENT = 'sgx:drone_route';

export const POINTS = { ring: 100, perfect: 50, crate: 300, mine: 150, pulseBase: 100, pulsePerMine: 150, gate: 500 } as const;

/** Speeds in m/s, battery in % and %/s. A run lasts about 60–90 s. */
export const TUNING = {
  zoneLength: 820,
  ringGap: 40,
  baseSpeed: 44,
  speedRamp: 0.42,
  maxSpeed: 86,
  turboMul: 1.65,
  lateral: 27,
  vertical: 21,
  laneX: 30,
  minY: 3,
  maxY: 40,
  drainBase: 1.15,
  drainRamp: 0.032,
  ringCharge: 2.5,
  crateCharge: 20,
  hitLoss: 15,
  mineLoss: 20,
  maxCombo: 5,
  ringRadius: 5.6,
  catchRadius: 5,
  perfectRadius: 1.8,
} as const;

export type PowerKey = 'turbo' | 'shield' | 'emp' | 'laser';

export interface PowerDef {
  key: PowerKey;
  /** Keyboard key shown on the button. */
  keyCap: { es: string; en: string };
  label: { es: string; en: string };
  /** Cooldown and active time in ms. */
  cooldown: number;
  duration: number;
}

export const POWERS: Record<PowerKey, PowerDef> = {
  turbo: { key: 'turbo', keyCap: { es: 'ESP', en: 'SPC' }, label: { es: 'Turbo', en: 'Turbo' }, cooldown: 7000, duration: 3000 },
  shield: { key: 'shield', keyCap: { es: 'E', en: 'E' }, label: { es: 'Escudo', en: 'Shield' }, cooldown: 11000, duration: 5000 },
  emp: { key: 'emp', keyCap: { es: 'X', en: 'X' }, label: { es: 'Pulso', en: 'Pulse' }, cooldown: 12000, duration: 0 },
  laser: { key: 'laser', keyCap: { es: 'F', en: 'F' }, label: { es: 'Láser', en: 'Laser' }, cooldown: 300, duration: 0 },
};
export const POWER_ORDER: PowerKey[] = ['turbo', 'shield', 'emp', 'laser'];

/** Same formula PilotProfileContext.recordDroneFlight uses for the run XP. */
export function runXp(score: number, crates: number, rings: number): number {
  return Math.floor(score / 5) + crates * 50 + rings * 25;
}

export const TUTORIAL_KEY = 'sgx_drone_tutorial_v1';
export const DAILY_KEY = 'sgx_drone_daily_v1';

export function droneGuideSteps(es: boolean): GuideStep[] {
  if (es) {
    return [
      {
        badge: '1/3 · Controles',
        title: 'Muévete y esquiva',
        subtitle: 'Torres, puentes, murallas y barreras te restan batería',
        description:
          'El dron avanza solo y cada vez más rápido: tú lo mueves arriba, abajo y a los lados. La batería baja poco a poco; los anillos y las cajas la recargan. Si llega a 0, la partida termina.',
        icon: Gamepad2,
        keyControls: [
          { key: 'W S · ↑ ↓', action: 'Subir / bajar' },
          { key: 'A D · ← →', action: 'Izquierda / derecha' },
          { key: 'V', action: 'Cambiar cámara (3ª o 1ª persona)' },
          { key: 'P · Esc', action: 'Pausa' },
        ],
        tips: [
          'En el celular: pon el pulgar en cualquier punto de la mitad izquierda y arrastra.',
          'La flecha frente al dron apunta al próximo anillo.',
        ],
      },
      {
        badge: '2/3 · Poderes',
        title: 'Cuatro poderes con recarga',
        subtitle: 'La barra bajo cada botón muestra cuánto falta para usarlo otra vez',
        description: 'El primer uso de cada poder en una partida suma XP a tu Estudio.',
        icon: Zap,
        keyControls: [
          { key: 'Espacio', action: 'Turbo: más velocidad y puntos ×2 por 3 s', xpBadge: '+30 XP' },
          { key: 'E', action: 'Escudo: 5 s sin daño', xpBadge: '+35 XP' },
          { key: 'X', action: 'Pulso: elimina las minas cercanas', xpBadge: '+60 XP' },
          { key: 'F · clic', action: 'Láser: destruye minas (+150 pts)' },
        ],
        tips: ['Activa el escudo antes de una fila de torres.', 'Encadena anillos sin fallar para subir el multiplicador hasta ×5.'],
      },
      {
        badge: '3/3 · Ruta',
        title: 'La Ruta de los 6 pilares',
        subtitle: 'Chroma Space Studios, Viejo San Juan y Distrito T-Mobile · Isla Verde',
        description:
          'Los anillos llevan los colores de los 6 pilares SGX. Pásalos seguidos en orden (Story, Showcase, Spark, Stage, System, Synthesize) para enlazar la ruta: +1,000 pts. Al final de cada zona cruza la puerta para pasar a la siguiente (+500 pts).',
        icon: Trophy,
        tips: [
          'Ruta del día: el mismo recorrido para todos hoy. Compara tu puntaje con tus amigos.',
          'Las cajas de los partners del Summit recargan 20% de batería y dan +300 pts.',
        ],
      },
    ];
  }
  return [
    {
      badge: '1/3 · Controls',
      title: 'Move and dodge',
      subtitle: 'Towers, bridges, walls and barriers drain your battery',
      description:
        'The drone moves forward on its own and keeps speeding up: you steer it up, down and sideways. The battery drains slowly; rings and crates recharge it. When it hits 0, the run ends.',
      icon: Gamepad2,
      keyControls: [
        { key: 'W S · ↑ ↓', action: 'Up / down' },
        { key: 'A D · ← →', action: 'Left / right' },
        { key: 'V', action: 'Switch camera (chase or first person)' },
        { key: 'P · Esc', action: 'Pause' },
      ],
      tips: [
        'On a phone: put your thumb anywhere on the left half and drag.',
        'The arrow in front of the drone points to the next ring.',
      ],
    },
    {
      badge: '2/3 · Powers',
      title: 'Four powers with cooldowns',
      subtitle: 'The bar under each button shows when you can use it again',
      description: 'The first use of each power in a run adds XP to your Studio.',
      icon: Zap,
      keyControls: [
        { key: 'Space', action: 'Turbo: more speed and ×2 points for 3 s', xpBadge: '+30 XP' },
        { key: 'E', action: 'Shield: 5 s without damage', xpBadge: '+35 XP' },
        { key: 'X', action: 'Pulse: clears nearby mines', xpBadge: '+60 XP' },
        { key: 'F · click', action: 'Laser: destroys mines (+150 pts)' },
      ],
      tips: ['Turn on the shield before a row of towers.', 'Chain rings without a miss to raise the multiplier up to ×5.'],
    },
    {
      badge: '3/3 · Route',
      title: 'The 6 Pillars Route',
      subtitle: 'Chroma Space Studios, Old San Juan and Distrito T-Mobile · Isla Verde',
      description:
        'The rings carry the colors of the 6 SGX pillars. Clear them in a row, in order (Story, Showcase, Spark, Stage, System, Synthesize), to link the route: +1,000 pts. At the end of each zone go through the gate to reach the next one (+500 pts).',
      icon: Trophy,
      tips: [
        "Today's route: the same course for everyone today. Compare scores with your friends.",
        'Crates from the Summit partners recharge 20% battery and give +300 pts.',
      ],
    },
  ];
}

export function zoneName(key: ZoneKey, es: boolean): string {
  return key === 'VIEJO_SAN_JUAN' && !es ? 'Old San Juan' : ZONES[key].name;
}
