# Reactor: misiones, XP, sellos

```ts
type MissionTrigger = { visit: string[] } | { quest: string } | { flag: IdentityFlag } | { sponsor: string };
interface ReactorMission { id; pillar: PillarKey; xp: number; trigger: MissionTrigger; es/en: { title; hint }; go?: { section?; page?; event?; detail? }; secret?: boolean; day3?: boolean }
```
- **visit:** se cumple al entrar a una sección (la app emite la clave al navegar).
- **quest:** un juego o tarea termina y emite `sgx:quest_complete {questId}`.
- **flag:** acción de identidad (`forged`, `avatar`, `contact`, `checkin`, `redeem`, `holo`, …).
- **sponsor:** retos de marca (paquetes altos) dentro de un pilar.
- `completeWhere(pred)` marca y suma XP una sola vez; **pilar completo → sello `pillar:<KEY>`** en el pase (y trofeo en el cuarto).
- Misiones secretas muestran "???" hasta cumplirse. Cada misión tiene `go` → botón "Ir" que lleva al lugar.
- **Tienda del Reactor:** se gasta XP (`xpSpent`) por premios; el canje da un voucher que el staff verifica.
- **Leaderboard:** `pilot_leaderboard` por XP total; rango por nivel (`calculateRankAndLevel`).
- Popup del Reactor accesible desde cualquier página (lista por pilar con progreso y "Ir").
