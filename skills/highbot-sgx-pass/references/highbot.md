# El Highbot (avatar)

Robot con cabeza de mapache (Highcoon en forma de robot: siempre orejas, bigotes, antifaz y nariz). Es la imagen de la persona en toda la app: retrato de la Holo Card, cabeza flotante del compañero, ranking, Rolodex y cuarto 3D. **Nunca se piden fotos.**

## Configuración v2 (`pilotAvatar.ts`), JSON pequeño que viaja en el pase
```ts
interface PilotConfig {
  v: 2;
  eyelid: Eyelid;                 // forma de párpado (fija, sin parpadeo)
  chest: Plate; back: Plate;      // placa chica (engranaje del pecho) y grande (espalda): logo/pilar
  colors: { shell; trim; joints; eyes; ... };   // hex
  pattern: string;                // motivo grabado ('' = liso), de PILOT_TEXTURES
  ink: 'tone'|'trim'|'glow';      // cómo se dibuja el motivo
  tile: 0|1|2|3;                  // tamaño del motivo
  parts: { ears; band; discs; chestDecor; ... };  // piezas opcionales
  headgear: number;               // índice: audífonos, headset con mic, antena, antena rayo, halo…
  visor: number;                  // VR clásico, VR slim, gafas AR, visor MR, visor gaming, goggles…
  chestStyle: 'gear'|'pillar';    // logo en el engranaje chico o pilar 3D grande al centro
  relic: 'none'|'back'|'orbit'|'antenna';  // emblema extra (nunca en las manos)
}
```
- `configFromSeed(seed, accent)` genera uno determinista desde un seed (para quien no lo edita). `normalizePilot()` migra versiones viejas.
- Presets por pilar (Narrador · Story, Curador · Showcase, Gamer · Spark, Performer · Stage, Ingeniero · System, Conector · Synthesize, Creador Dorado).

## 2D (`SgxPilotGlyph.tsx`)
SVG con **sombreado toon** (contorno negro + sombras planas) generado desde la config; liviano, sirve para listas, chat y tarjeta. Retratos PNG con `highbotPortrait.ts`.

## 3D (`highbot3d.ts`)
- Un GLB base (`/characters/highbot/highbot.glb`, Draco) separado en partes azul/amarillo; los colores, accesorios (`highbotGear.ts`) y placas se aplican en tiempo real.
- API: `buildHighbot3D(config, { envMap }) → { group, update(t), wave(), setMood('idle'|'thinking'|'talking'|'pointing'), setWalk(amount, phase), dispose() }`.
- Animación sin rig externo: articulaciones nombradas (`shoulder left/right`, `hip joint left/right`, `neck`, `body`) con pose relativa al reposo. **Caminata real:** piernas y brazos opuestos, balanceo; la fase avanza con la **distancia recorrida** (zancada = 4·largo de pierna·sin(ángulo)) para que los pies no patinen; al detenerse vuelve a reposo.
- Luz de estudio común (`highbotStudio.ts`: RoomEnvironment + PMREM) para que todos los Highbots se vean igual.

## Editor (`PilotBuilder.tsx`)
Pestañas: bots (presets) · piezas · cara · placas · colores · textura. Vista 2D/3D, "Aleatorio", "Variar". Compacto dentro de la Forja; completo en Avatar Studio. Guardar actualiza el pase, la Holo Card y el cuarto.
