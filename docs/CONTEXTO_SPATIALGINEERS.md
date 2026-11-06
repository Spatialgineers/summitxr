# Contexto Spatialgineers · estado al 6 de noviembre de 2026

Este brief es para cualquier agente o asistente (Claude, ChatGPT, Gemini, Muse, Symphony) que retome trabajo de Spatialgineers. Se lee de una vez. Si algo aquí choca con una decisión nueva de Danelson o Ricardo, gana la decisión nueva.

## 1. Spatialgineers LLC
- Estudio de ingeniería creativa y computación espacial en Puerto Rico. Es LLC desde marzo de 2026; antes fue DBA, desde 2023.
- **Fundadores, socios al 50/50.** Siempre se nombra a los dos:
  - Danelson Maldonado González, "The Highgineer": CEO y Director Creativo.
  - Ricardo A. Hernández Díaz, "Lightning Fingers": CPO y Director Técnico.
- **Tagline:** "Ingeniando imaginación, construyendo realidades."
- **SGX Framework:** 6 pilares.
  - SGX.Story
  - SGX.Showcase
  - SGX.Spark
  - SGX.Stage
  - SGX.System
  - SGX.Synthesize
- **Servicios:** Tiers 1–6, según el MSA v2026.10. El Tier 2 es Rent-to-Own. Cada proyecto pasa por SOW → Reportes de Fase → Sign-Off.
- **Ramas:** Spatialgineers XR, Spatialgineers Visualizers y Spatialgineers Media.
- **Verticales:** trabajo XR para clientes, SGX Guild (talento), Highcoon (IP propia) y el Spatialgineers Summit (evento anual).
- **Colores:** amarillo `#FDCC0D`, azul metálico `#32527B`, gris `#888888`. En piezas oscuras, navy `#05080F` con cian `#00DDFF`.
- **Contacto:** info@spatialgineers.com · @spatialgineers.

## 2. Reglas de marca (para todo agente)
- El evento es **"Spatialgineers Summit"**. Nunca "SGX Summit".
- Los visitantes son **"Creadores"** y su espacio es **"Tu Estudio"**.
- El auspicio se organiza en **"Paquete 1–5"**. Nunca "Tier" ni "nivel".
- **Nada de lenguaje de pilotos, aviación o espacio:** ni "piloto", "despegar", "galaxia", "cósmico", "nave", 🚀 ni "cuántico". "Computación espacial" sí se permite.
- Nunca se menciona "The High Creators Group" ni a Marcos Berríos.
- Spatial (spatial.io) cerró: se menciona en pasado y no se enlaza.
- Los speakers no envían fotos: su imagen es su Highbot.
- No se publican:
  - los speakers sin confirmar;
  - nada marcado "POR CONFIRMAR" en el Ground Truth (incluido su Anejo A);
  - los presupuestos ni las metas internas.

## 3. Spatialgineers Summit 2026 (el foco ahora)
- **Fechas:** 11–13 de diciembre de 2026.
  - Días 1 y 2: gratis por YouTube Live, junto a Los Mismos TV.
  - Día 3: presencial en Chroma Space Studios, San Juan, por invitación.
- **Fechas límite.** La fuente es `src/lib/summitDeadlines.ts` en la app, y la app manda:

  | Qué | Fecha límite |
  |---|---|
  | Perfiles de speakers | 21 nov |
  | Solicitudes de sponsors | 28 nov |
  | Pago y materiales de sponsors | 30 nov |
  | Prensa (10 cupos) | antes del 1 dic |
  | Solicitudes para el Día 3 | 1 dic |
  | Invitaciones al Día 3 | a más tardar el 5 dic |
  | Prueba técnica de speakers | antes del 8 dic |

- **Webapp:** summit.spatialgineers.com. Es una webapp 3D, sin descargas e instalable como PWA. La hicimos con React, Three.js, Firebase y un servidor Express, y se publica desde Google AI Studio. El repo es GitHub `spatialgineers/summitxr`, rama `main`.
  - **Para el público:**
    - SGX Pass / Holo Card con QR para el Día 3, y Highbot, el avatar que se arma cada Creador;
    - Reactor de misiones con XP y Tienda;
    - agenda con alertas, transmisión, votación en vivo y Arena de juegos;
    - recorrido 360°, modelos 3D y networking con QR;
    - el Highbot con IA (Claude): responde sobre el Summit en personaje y requiere pase y cuenta Google;
    - portales por rol en `/bienvenida/<visitante|speaker|sponsor|prensa|equipo>`, cada uno con su video de YouTube.
  - **Admin (Centro de mando):**
    - inscritos y Día 3, clientes potenciales, contenido sin código, votaciones y anuncios;
    - control y tope de gasto del Highbot;
    - Radar de Instagram;
    - **Publicador de redes** para Instagram y Facebook (nuevo, ver la sección 4).
  - **Documentación:**
    - `docs/GUIA_WEBAPP.md` (guía maestra ruta por ruta) y su PDF en `docs/guia/`;
    - `CLAUDE.md`, con las reglas de trabajo para agentes de código.
- **Pendiente en la app:**
  - arreglos de la app instalada: safe area, la puerta de pase en Avatar Studio, el refresco triple y el splash lento;
  - regenerar el PDF de la guía con capturas nuevas;
  - instalar el mailer de Apps Script (`docs/EMAIL_SETUP.md`);
  - un punto de la prueba del admin ("inscritos listados en el panel") que ya fallaba antes.
- **Pendiente de configurar (Danelson):**
  - el token de Meta con permisos de publicación, más `FB_PAGE_ID`;
  - publicar las reglas de Firestore en la consola;
  - comprobar que el Publicador marque Instagram ✅, Facebook ✅ y Base de datos ✅.

## 4. Campaña de redes (#RoadToSummit)
- **Plan diario:** del 11 de noviembre al 13 de diciembre, en `docs/campaign/CAMPANA_REDES.md` y `docs/campaign/calendario_redes.csv`. Los videos de YouTube están en `docs/campaign/YOUTUBE_KIT.md`.
- **Todo post termina con:** `#SpatialgineersSummit #RoadToSummit #Spatialgineers`.
- **Cómo se publica:**
  - **Instagram y Facebook:** con el Publicador de la app. Claude prepara la semana como un JSON y Danelson la aprueba con un clic.
    - Mientras se configura, la semana 1 (11–17 nov) se programa a mano en Meta Business Suite.
    - Symphony no pudo publicar en Instagram ni Facebook: su conexión no permite publicar ahí.
  - **TikTok:** por Symphony. Hay que tocar cada tarjeta para aprobarla y no existe aprobación en lote. Los créditos se reinician el 18 de cada mes.
  - **Voz en off:** ElevenLabs, con la voz "Danny" en español.
- **Hecho:**
  - la semana 1 completa: 5 reels y 2 carruseles;
  - el reel de prueba "Powered by Claude, Gemini, ElevenLabs and high vibes", publicado en TikTok el 6 de noviembre.
- **Siguiente:** el JSON de la semana 2 (18–24 nov) para el Publicador.

## 5. Highcoon
- IP propia de Danelson: Highcoon, el científico mapache de *Highcoon Against STIGMA* y el Highverse.
- **En materiales del Summit o de Spatialgineers:** solo se usa su intro y sus enlaces (@Highcoonvibes en Instagram, X y TikTok, y Highcade). Nada sobre virere ni terpenos.
- **En la app:** aparece en las páginas de pilares como proyecto propio. La cabeza de todo Highbot es la de Highcoon.

## 6. Otros frentes
- **SGX Guild:** pipeline de talento gamificado con 8 rangos y Trials. Ser miembro es un privilegio, y por ahora no se está reclutando.
- **Portafolio de referencia:**
  - Infinite Borikua (Metaverse Fashion Week 2025);
  - Un Viaje a Aguadilla (FITUR 2026);
  - Somos Mayagüez / Justas LAI 2026;
  - Grimorio (Atlantic University);
  - Highcade;
  - la app de Grupo Guayacán;
  - el Spatialgineers Summit 2025.
- **Fuentes de verdad en Drive:** Ground Truth Summit 2026, el Dossier de auspicio, el MSA, la plantilla de SOW y el SPEF.

## 7. Cómo coordinar entre agentes
- **Claude Code:** dueño del código, los videos y el contenido de campaña. Sube a GitHub, a `main`.
- **Gemini:** asiste dentro de Google AI Studio, que es donde se publica la app. Los cambios hechos en AI Studio no llegan solos a GitHub: hay que pasarlos al repo a mano.
- **Symphony:** solo TikTok, más tareas de negocio de Wix.
- **ChatGPT y Muse:** ideación y redacción. Todo texto final se revisa contra las reglas de la sección 2 antes de publicarse.
- Ninguna pieza se publica sin la aprobación de Danelson.
