# La Forja y el pase

## Pasos (`SgxForge.tsx`)
0. **Entrada:** "Entrar con Google" (recomendado) o "Seguir sin cuenta" (anónimo). Con Google, si ya hay pase para ese correo, se **restaura** sin forjar (`findMyRegistration`).
1. **Identifícate:** nombre, correo, organización y rol (opcionales), consentimiento de imagen.
2. **Cómo vives el evento:** DIGITAL (confirmado al instante) o presencial (solicitud, queda PENDING hasta invitación; fecha límite propia).
3. **Pilar:** la afinidad colorea pase, Highbot y cuarto.
4. **Tu Highbot:** constructor compacto (presets + colores); se edita después.
5. **Listo:** "Pase forjado" con "Abrir mi Estudio", canal, "Seguir explorando".

Al forjar: `newPassCode()`, `serialFromCode()`, `callsignFromName()`, se guarda local, `registerPass` + `claimEmail`, flag `forged` (misión), evento `sgx:pass_forged`.

## Reglas de negocio
- **Un correo, un pase.** `checkEmailClaim` antes de enviar; si existe otro dueño: "Ese correo ya tiene un SGX Pass" (ofrece recuperarlo).
- **Editar no re-forja:** "Editar mi pase" abre un solo formulario, conserva el código y el estado que puso el equipo.
- **Recuperar:** con Google y el mismo correo el pase vuelve solo, con pilar y Highbot.
- **Cambiar de cuenta Google:** la cuenta nueva no hereda el pase de otro; se guarda el anterior aparte (`accountSlots.ts`).

## Mi SGX Pass (el expediente)
Arriba un resumen (rol, solicitudes, Día 3, conexiones, XP); luego Holo Card, **Tu rol** (speaker/sponsor/prensa/Guild con "Hasta el <fecha>" o "Cerró el <fecha>"; aprobado/en revisión), Día 3 (QR grande, check-in, sellos, códigos de canje) y la cuenta de Google.

## Roles
- El usuario **pide** (formularios propios: portal de speakers, sponsors, prensa, Guild). Queda "En revisión" (pendiente local + doc de solicitud).
- El admin **aprueba** escribiendo `credential_grants/{uid}.<role>` → la Holo Card cambia a ese rol (SPEAKER, SPONSOR, PRENSA, INITIATE).
- Las fechas límite viven en un solo archivo (`summitDeadlines.ts`) y la UI cierra sola los formularios.

## Día presencial
- El QR del pase es la entrada. Check-in con un **código del día** que genera el admin (QR impreso en la puerta) → `recordCheckin` → sello `chroma:checkin`, misión, municipio en el radar.
- Correos con enlaces `?estudio=pass|day3` abren el pase en esa parte.
