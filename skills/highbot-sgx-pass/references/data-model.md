# Modelo de datos (contratos que se conservan al portar)

```ts
type PillarKey = 'STORY'|'SHOWCASE'|'SPARK'|'STAGE'|'SYSTEM'|'SYNTHESIZE'; // reemplazable por las categorías del nuevo proyecto
type PassTier = 'DIGITAL' | 'SHOWCASE';            // digital / presencial

interface SgxPass {
  code: string;            // 'SGX26-XXXX-XXXX' (prefijo configurable), alfabeto sin ambiguos, crypto.getRandomValues
  serial: string;          // 4 dígitos derivados del code (hash), grande en la tarjeta
  tier: PassTier;
  status: 'CONFIRMED'|'PENDING';  // DIGITAL confirma al forjar; presencial queda PENDING hasta invitación
  fullName: string; email: string /* siempre lowercase */;
  roleTitle?: string; organization?: string;
  forgedAt: number; imageConsent?: boolean; consentAt?: number;
}
interface PassContact { code; name; callsign; pillar: PillarKey|null; role?; organization?; linkedin?; via: 'scanned'|'received'; at: number }
interface Redemption { rewardId; title; cost; voucher; at }
interface SgxIdentity {
  v: 1;
  pass: SgxPass|null;
  callsign: string;                 // derivado del nombre: 'ANDREA-42'
  affinity: PillarKey|null;
  avatar: { seed: string; png?: string; pilot?: PilotConfig };   // ver highbot.md
  missions: Record<string, number>; // missionId → completedAt
  stamps: Record<string, number>;   // 'pillar:SPARK', 'sponsor:<id>', 'chroma:checkin'
  contacts: PassContact[];
  xpSpent: number; redemptions: Redemption[];
  holo?: { image?: string; role: string; at: number }; // última Holo Card exportada (JPEG)
}
```

- Almacenamiento: `localStorage['sgx_identity_v1']`; cada cambio emite `window` event `sgx:identity_changed` (otras pestañas usan `storage`).
- XP ganado = suma del XP de misiones completadas (+ actividad del perfil); XP disponible = ganado − `xpSpent`.

## QR del pase

```ts
interface PassQrPayload { c: code; n: name; s: callsign; p: PillarKey|null; r?: role; o?: org; u?: firebaseUid }
// URL: `${origin}/?pase=${base64url(JSON.stringify(payload))}` → cualquier cámara abre la app en "añadir contacto"
```
`parsePassQr` acepta la URL o `sgx:pass:<token>`, recorta cada campo (c≤40, n≤80, s≤20, r/o≤80) y valida `u` con `/^[A-Za-z0-9_-]{1,128}$/`. Nunca confíes en el payload: es solo una tarjeta de contacto.

## Colecciones de Firestore usadas

| Colección | Doc | Escribe | Contenido |
|---|---|---|---|
| `ticket_inquiries/{code}` | registro del pase | dueño (al forjar) / admin (estado) | nombre, correo, tier, status (`INVITED` para presencial), avatar |
| `pass_emails/{sha256(email)}` | reclamo 1 correo = 1 pase | dueño | `{code, userId, at}` |
| `credential_grants/{uid}` | roles oficiales | solo admin | `{speaker?, sponsor?, initiate?, press?}` con datos de la tarjeta |
| `initiate_requests/{uid}` | solicitud Guild | dueño | pilar, portafolio, nota |
| `pass_exchanges/{uid}/...` | intercambios recibidos | quien escanea | tarjeta del otro (Rolodex mutuo) |
| `chroma_checkins/{uid}` | check-in presencial | dueño con código del día | región, código, hora |
| `pilot_profiles/{uid}`, `pilot_leaderboard/{id}` | perfil y ranking | dueño | XP, callsign, avatar |
| `site_config/companion` | interruptor y tope de la IA | admin | `{enabled, dailyUsd}` |
