// Text of the illustrated guide (Spanish, for people, not developers).
// Brand: visitors are "Creadores", their place is "Tu Estudio", sponsors buy "Paquete 1–5".
// Dates are read from src/lib/summitDeadlines.ts so the guide never disagrees with the app.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'lib', 'summitDeadlines.ts'), 'utf8');
const day = (key) => {
  const m = src.match(new RegExp(`${key}: \\{[\\s\\S]*?label: \\{ es: '([^']+)'`));
  return m ? m[1] : '';
};

const DATES = [
  [day('speakerProfiles'), 'Último día para enviar perfiles de **speakers y artistas** (el portal se cierra solo).'],
  [day('sponsorApplications'), 'Último día para **solicitar un paquete de auspicio**.'],
  [day('sponsorPayment'), 'Fecha límite del **pago total** y de los **materiales de marca** de sponsors.'],
  [`Antes del ${day('pressAccreditation')}`, '**Acreditación de prensa** (10 cupos). La Sala de prensa se cierra sola; el kit sigue disponible.'],
  [day('day3Requests'), 'Último día para **solicitar el Día 3** presencial.'],
  [day('day3Invitations'), 'El equipo envía las **invitaciones al Día 3**, a más tardar.'],
  [`Antes del ${day('speakerTechCheck')}`, '**Prueba técnica** de los speakers con el equipo.'],
  ['11 y 12 de diciembre de 2026', '**Días 1 y 2**: digitales y gratis por YouTube Live, en español.'],
  ['13 de diciembre de 2026', '**Día 3**: SGX Showcase presencial en Chroma Space Studios, San Juan. Se entra con el QR del SGX Pass.'],
];

const P = { STORY: '#32527B', SHOWCASE: '#00DDFF', SPARK: '#B87000', STAGE: '#FDCC0D', SYSTEM: '#888888', SYNTHESIZE: '#FFFFFF' };
const PI = { STORY: '#7FA3D4', SPARK: '#E0A040' };
const pillar = (k, name, txt) => `<div style="--pc:${P[k]};--pi:${PI[k] || P[k]}"><b>${name}</b><span>${txt}</span></div>`;

const pages = [
  /* ---------- 3. Qué es ---------- */
  {
    toc: 'Qué es la app', kicker: 'Introducción', title: 'Qué es la app',
    lead: 'La webapp oficial del **Spatialgineers Summit 2026** convierte a cada visitante en **Creador**: alguien que participa, no que solo mira. Es una experiencia 3D gamificada que corre en el navegador del teléfono o la computadora, sin descargas, y se puede instalar como app.',
    bullets: [
      '**Tres días, 11–13 dic 2026.** Días 1 y 2 digitales y gratis por YouTube Live; Día 3 presencial en Chroma Space Studios, San Juan, por invitación.',
      '**Un solo pase.** El SGX Pass es tu registro, tu Holo Card, tu tarjeta de contacto y tu entrada del Día 3.',
      '**Tu Highbot.** Un personaje robot que diseñas tú y te acompaña en el pase, en el núcleo 3D y en el chat.',
      '**Juega y gana XP.** Misiones por pilar, juegos, votaciones en vivo y premios en la Tienda.',
      '**Para todos los roles.** Creadores, speakers, sponsors, prensa y equipo tienen su propio camino.',
      '**Bilingüe.** Todo en español y en inglés, con un toque.',
    ],
    html: `<div class="feat" style="margin-top:3mm">
      <div><b>Creadores</b><span>Forjan su pase, arman su Highbot, votan en vivo, hacen networking y entran al Día 3 con su QR.</span></div>
      <div><b>Speakers y artistas</b><span>Envían su perfil; al aprobarse, su pase se vuelve Holo Card de speaker.</span></div>
      <div><b>Sponsors</b><span>Ven los Paquetes 1–5, solicitan el suyo y aparecen dentro de la experiencia.</span></div>
      <div><b>Prensa</b><span>Se acredita, descarga el kit y recibe la Holo Card PRENSA con su invitación al Día 3.</span></div>
      <div><b>Equipo</b><span>Opera todo el evento desde el Centro de mando, sin tocar código.</span></div>
      <div><b>Fundadores</b><span>Spatialgineers LLC: Danelson Maldonado González y Ricardo A. Hernández Díaz.</span></div>
    </div>`,
    tip: 'Basta con compartir un enlace: summit.spatialgineers.com abre en cualquier teléfono, sin tiendas de apps ni contraseñas.',
  },

  /* ---------- SGX Pass y Forja ---------- */
  { kind: 'divider', toc: 'SGX Pass y Forja', num: '01', title: 'SGX Pass y Forja', lead: 'El pase es la llave de todo. Se forja en un minuto.', accent: '#FDCC0D' },
  {
    kicker: 'SGX Pass · La Forja', title: 'Forja tu pase en un minuto',
    lead: 'La **Forja** se abre desde el botón "Forjar pase" del inicio, del menú o de la barra inferior. Nunca bloquea: puedes explorar primero y forjar cuando quieras.',
    phones: [
      { img: 'v02-forja-intro', cap: 'Para qué sirve el pase. "Continuar con Google" lo guarda en tu cuenta.' },
      { img: 'v03-forja-datos', cap: 'Tus datos y cómo vives el Summit: Digital global o Día 3 presencial.' },
      { img: 'v04-forja-pilar', cap: 'Eliges el pilar que te mueve: define el color de tu pase.' },
    ],
    bullets2: [
      '**Con Google**, el pase te sigue a cualquier dispositivo y se recupera solo.',
      '**Un pase por correo**: si ese correo ya tiene pase, la Forja te ayuda a traerlo.',
      'El **consentimiento de imagen** se acepta aquí, una sola vez.',
    ],
  },
  {
    kicker: 'SGX Pass · La Forja', title: 'Tu Highbot y tu pase listo',
    lead: 'El último paso es tu **Highbot**. Luego la Forja imprime tu pase holográfico y te lleva a **Tu Estudio**.',
    phones: [
      { img: 'v05-forja-highbot', cap: 'Arma tu Highbot: presets por pilar, "Sorpresa" y "Variar".' },
      { img: 'v06-forja-lista', cap: '"Pase forjado": abre tu Estudio o sigue explorando.' },
    ],
    bullets2: [
      'Forjar cumple tu primera misión: **+120 XP**.',
      'Recibes un correo: **"Tu SGX Pass está forjado"**.',
      'Si pediste el Día 3, el equipo te avisa por correo cuando te invite.',
    ],
    tip: 'Un registro que se siente como crear un personaje: más personas lo completan y llegan con ganas de jugar.',
  },

  /* ---------- Núcleo 3D ---------- */
  { kind: 'divider', toc: 'Núcleo 3D', num: '02', title: 'Núcleo 3D', lead: 'La portada es una escena 3D en tiempo real: el SGX Framework se toca y se recorre.', accent: '#00DDFF' },
  {
    kicker: 'Inicio', title: 'El núcleo en tu teléfono',
    lead: 'Al centro, el ícono SGX; alrededor, los **seis pilares** en anillo, las estaciones de sponsors y tu Highbot girando. Arriba, la cuenta regresiva y los botones para forjar o explorar.',
    phones: [
      { img: 'v01-nucleo-hero', cap: 'Primera visita: el título, la fecha y la cuenta regresiva.' },
      { img: 'v07-nucleo-pase', cap: 'Con pase: "Ver mi pase" y tu chip arriba a la derecha.' },
    ],
    bullets2: [
      'Toca una **estación de sponsor** para ver la marca (+25 XP).',
      'Busca los **orbes SGX** escondidos y el logo del Guild (XP extra).',
      'Ajustes: girar o pausar, zoom, modo inmersión total y **modo ligero** para teléfonos modestos.',
    ],
  },
  {
    kicker: 'Inicio · escritorio', title: 'El núcleo en pantalla grande',
    desks: [
      { img: 'd01-nucleo-desktop', cap: 'Vista de escritorio: núcleo, pilares, relojes del Summit y barra de navegación.' },
      { img: 'd02-nucleo-pilar-desktop', cap: 'Al elegir un pilar, su panel se abre al lado con lo que cubre y sus módulos.' },
    ],
    tip: 'La marca se vive en vez de leerse. La calidad se ajusta sola para que corra fluido en cualquier equipo.',
  },

  /* ---------- Menú y 6 pilares ---------- */
  { kind: 'divider', toc: 'Menú y los 6 pilares', num: '03', title: 'Menú y los 6 pilares', lead: 'Todo el Summit se organiza con el SGX Framework: seis pilares, cada uno con sus módulos.', accent: '#32527B' },
  {
    kicker: 'Navegación', title: 'El menú y los pilares',
    lead: 'El **Menú** (barra inferior en el teléfono, arriba en escritorio) muestra los seis pilares con todos sus módulos. Cada pilar tiene su página, con su programa, casos reales y su equipo del Guild.',
    html: `<div class="pillars">
      ${pillar('STORY', '01 · SGX.Story', 'Historias que mueven ideas: manifiesto, radar social y Avatar Studio.')}
      ${pillar('SHOWCASE', '02 · SGX.Showcase', 'Visuales que comunican innovación: recorrido 360°, partners, modelos 3D.')}
      ${pillar('SPARK', '03 · SGX.Spark', 'Experiencias que activan la conexión: juegos y Tienda del Reactor.')}
      ${pillar('STAGE', '04 · SGX.Stage', 'Creatividad en tiempo real: agenda, salas, speakers y prensa.')}
      ${pillar('SYSTEM', '05 · SGX.System', 'Tecnología que soluciona: radar, Tu Estudio, escáner y terminal.')}
      ${pillar('SYNTHESIZE', '06 · SGX.Synthesize', 'Innovación que une disciplinas: SGX.Match, foros y SGX Guild.')}
    </div>`,
    phones: [
      { img: 'v09-menu', cap: 'El menú con los seis pilares.' },
      { img: 'm01-pilar-story', cap: 'Página de pilar: selector, frase y módulos con vista previa.' },
    ],
    dense: true,
  },
  {
    toc: 'SGX.Story', tocSub: true, kicker: 'Pilar 01', title: 'SGX.Story', accent: '#7FA3D4',
    lead: 'Historias que mueven ideas. Aquí empieza el viaje del Creador.',
    phones: [
      { img: 'm02-pilares', cap: '01.1 Manifiesto: el SGX Framework y la historia de cada pilar.' },
      { img: 'm03-social', cap: '01.2 Radar social: las historias de la comunidad con #SpatialgineersSummit.' },
      { img: 'm04-avatar', cap: '01.3 Avatar Studio: arma tu Highbot pieza por pieza.' },
    ],
    tip: 'Leer el manifiesto (+60 XP) y diseñar tu Highbot (+80 XP) cuentan para sellar el pilar.',
  },
  {
    toc: 'SGX.Showcase', tocSub: true, kicker: 'Pilar 02', title: 'SGX.Showcase', accent: '#00DDFF',
    lead: 'Visuales que comunican innovación: conoce el venue del Día 3 y las marcas que hacen posible el Summit.',
    phones: [
      { img: 'm05b-mapa-360', cap: '02.1 Recorrido 360° de Chroma Space Studios (+30 XP por punto).' },
      { img: 'm06-sponsors', cap: '02.2 Partners & Brand Showcases: cada logo abre su ficha.' },
      { img: 'm07-modelos', cap: '02.3 Modelos 3D: gira y acerca el ícono, los pilares y el Highbot.' },
    ],
    bullets2: ['**02.4 Patrocina el Summit**: la solicitud de paquete (ver la sección Sponsors).'],
  },
  {
    toc: 'SGX.Spark', tocSub: true, kicker: 'Pilar 03', title: 'SGX.Spark', accent: '#E0A040',
    lead: 'Experiencias que activan la conexión. Cuatro juegos propios y una tienda de premios.',
    phones: [
      { img: 'm09-juegos', cap: '03.1 Juegos y laboratorios: Dron SGX, Torre de Pilares, Pulso SGX y Rayo en tus manos.' },
      { img: 'm10-tienda', cap: '03.2 Tienda del Reactor: canjea tu XP por premios.' },
    ],
    bullets2: [
      '**Dron SGX**: vuela sobre San Juan; la "Ruta del día" es igual para todos.',
      '**Torre de Pilares**: apila losas y combina los seis pilares.',
      '**Pulso SGX**: ritmo sobre la canción del Summit, con ranking top 10.',
      '**Rayo en tus manos**: pellizca frente a la cámara para disparar rayos SGX.',
    ],
  },
  {
    toc: 'SGX.Stage', tocSub: true, kicker: 'Pilar 04', title: 'SGX.Stage', accent: '#FDCC0D',
    lead: 'Creatividad en tiempo real: el programa, las salas de transmisión y quién sube al escenario.',
    phones: [
      { img: 'm11-agenda', cap: '04.1 Run of Show: el programa minuto a minuto de los 3 días.' },
      { img: 'm12-broadcast', cap: '04.2 Salas de transmisión: se encienden cuando empieza la señal.' },
      { img: 'm13-speakers', cap: '04.3 Speakers & artistas: solo los confirmados por escrito.' },
    ],
    bullets2: ['**04.4 Portal de speakers** y **04.5 Sala de prensa** tienen su propia sección más adelante.'],
  },
  {
    toc: 'SGX.System', tocSub: true, kicker: 'Pilar 05', title: 'SGX.System', accent: '#B8B8B8',
    lead: 'Tecnología que soluciona: datos en vivo, tu pase y herramientas para conectar.',
    phones: [
      { img: 'm16-visitas', cap: '05.1 Radar de visitas: desde dónde nos visitan, en vivo (solo la región, nunca la IP).' },
      { img: 'm17b-mi-qr', cap: '05.3 Escáner de pases: escanea o muestra tu QR para intercambiar contactos.' },
      { img: 'm18-terminal', cap: '05.4 Terminal de mando: navega escribiendo (y busca los códigos secretos).' },
    ],
    bullets2: ['**05.2 SGX Pass / Tu Estudio** se explica en su propia sección.'],
  },
  {
    toc: 'SGX.Synthesize', tocSub: true, kicker: 'Pilar 06', title: 'SGX.Synthesize', accent: '#FFFFFF',
    lead: 'Innovación que une disciplinas: conexiones con propósito.',
    phones: [
      { img: 'm19-match', cap: '06.1 SGX.Match: perfil en 2 minutos; el match nace cuando los dos conectan.' },
      { img: 'm20-networking', cap: '06.2 Foros & chat: salas por tema y preguntas para speakers.' },
      { img: 'm21-guild', cap: '06.3 SGX Guild Initiates: los Initiates y sus portafolios.' },
    ],
    tip: 'El networking deja de depender de la suerte: el Creador llega al Día 3 sabiendo con quién quiere hablar.',
  },

  /* ---------- Tu Estudio ---------- */
  { kind: 'divider', toc: 'Tu Estudio, Holo Card y Highbot', num: '04', title: 'Tu Estudio', lead: 'Tu lugar personal: tu pase, tu Highbot, tu progreso y tus contactos.', accent: '#FDCC0D' },
  {
    kicker: 'Tu Estudio', title: 'Tu pase es tu Holo Card',
    lead: 'En **Tu Estudio** (botón "Pase" o tu chip) ves tu XP total, el XP para gastar y tu rango. La **Holo Card** es tu pase: al frente tu Highbot y tus datos; al reverso, tu QR.',
    phones: [
      { img: 'e00-estudio-top', cap: 'Tu Estudio es el cuarto 3D de tu Highbot: cada estación abre una parte de tu pase.' },
      { img: 'e01-estudio-pase', cap: 'Mi SGX Pass (pedestal): resumen, Holo Card, tu rol con sus fechas, Día 3 y cuenta.' },
      { img: 'e02-estudio-highbot', cap: 'La cápsula: el chat con tu Highbot.' },
    ],
    bullets2: [
      'La tarjeta cambia sola al rol aprobado: **Speaker, Sponsor, Initiate o Prensa**.',
      'Descargar o compartir tu Holo Card suma **+60 XP**.',
    ],
  },
  {
    kicker: 'Tu Estudio', title: 'Red, Rolodex y Día 3',
    phones: [
      { img: 'e04-estudio-red', cap: 'Pared de Holo Cards → Red: tus contactos como una constelación por pilar.' },
      { img: 'e05-estudio-rolodex', cap: 'Pared de Holo Cards → Rolodex: los pases escaneados; exporta vCard.' },
      { img: 'e06-estudio-dia3', cap: 'Mi SGX Pass → Día 3: tu QR de entrada y el check-in en Chroma.' },
    ],
    bullets2: [
      'Un escaneo guarda a **las dos personas**, en el Rolodex de ambas (+50 XP por contacto).',
      'El pase y su QR **abren sin señal**: perfecto para la puerta de Chroma.',
      'El check-in del Día 3 deja el sello **"PRESENTE EN CHROMA"** (+250 XP).',
    ],
  },

  /* ---------- Reactor, XP y Tienda ---------- */
  { kind: 'divider', toc: 'Reactor, XP y Tienda', num: '05', title: 'Reactor, XP y Tienda', lead: 'Cada acción cuenta. Completa misiones, sella pilares y canjea premios.', accent: '#00DDFF' },
  {
    kicker: 'Gamificación', title: 'Misiones, sellos y premios',
    lead: 'El **Reactor de misiones** agrupa las misiones por pilar; cada una trae un botón que te lleva a donde se hace. Completa las de un pilar y queda **sellado** en tu pase.',
    phones: [
      { img: 'r01-reactor', cap: 'El Reactor: misiones por pilar, XP de cada una y su atajo.' },
      { img: 'e07-estudio-telemetria', cap: 'La computadora → Bitácora: tu XP y el ranking de Creadores.' },
      { img: 'm10-tienda', cap: 'Tienda del Reactor: gastar XP no baja tu rango.' },
    ],
    bullets2: [
      'Rangos: Visitante, Explorador XR, Creador, Creador Pro, Director Creativo y Visionario.',
      '**Justo para todos**: cada acción paga una sola vez.',
      'Extras: celdas de energía escondidas, **Overdrive** y misiones secretas.',
      'Los partners de Paquete 3 a 5 tienen su propio **reto de marca** con sello.',
    ],
  },

  /* ---------- Highbot companion ---------- */
  { kind: 'divider', toc: 'Highbot, tu compañero', num: '06', title: 'Highbot, tu compañero', lead: 'Pregúntale lo que quieras del Summit, o pídele que te lleve a cualquier página.', accent: '#FDCC0D' },
  {
    kicker: 'Asistente', title: 'Tu Highbot responde',
    lead: 'La cabecita del Highbot vive en la esquina inferior derecha de casi todas las páginas. Con tu pase y tu cuenta de Google, conversas con él: responde sobre fechas, agenda, Día 3, misiones y cómo usar la app, y te lleva a la página que necesitas.',
    phones: [
      { img: 'h01-highbot-abierto', cap: 'Preguntas sugeridas para empezar.' },
      { img: 'h02-highbot-chat', cap: 'Respuestas cortas, con las fechas oficiales del Summit.' },
    ],
    bullets2: [
      'Sin conexión, responde con su guía local.',
      'Solo conversa y navega: nunca hace cambios por ti.',
      'El equipo lo puede pausar y le pone un tope diario desde el Centro de mando.',
    ],
  },

  /* ---------- Agenda ---------- */
  { kind: 'divider', toc: 'Agenda', num: '07', title: 'Agenda', lead: 'El Run of Show oficial de los tres días, y tu agenda personal con alertas.', accent: '#FDCC0D' },
  {
    kicker: 'Agenda', title: 'Run of Show y Mi Agenda',
    lead: 'Dos vistas: **Línea de tiempo** (el programa minuto a minuto, por día) y **Mi Agenda** (las sesiones que guardas). Filtra por pilar o formato.',
    phones: [
      { img: 'm11-agenda', cap: 'Línea de tiempo por día con el detalle de cada sesión.' },
      { img: 'm11b-mi-agenda', cap: 'Mi Agenda y "Alertar": aviso 15 minutos antes.' },
    ],
    desks: [],
    bullets2: [
      '**Alertar** baja un evento de calendario o abre Google Calendar.',
      'Exporta toda tu agenda de una vez.',
      'El equipo actualiza la agenda en vivo, sin publicar una versión nueva de la app.',
    ],
  },
  {
    kicker: 'Agenda · escritorio', title: 'La agenda en pantalla grande',
    desks: [{ img: 'd03-agenda-desktop', cap: 'Run of Show en escritorio.' }],
    tip: 'Nadie se pierde su sesión: el aviso llega a su propio calendario.',
  },

  /* ---------- En vivo ---------- */
  { kind: 'divider', toc: 'En vivo: /play y /stage', num: '08', title: 'En vivo', lead: 'La audiencia vota desde su teléfono y cambia lo que pasa en el escenario.', accent: '#00DDFF' },
  {
    kicker: 'SGX Live', title: 'Arena de votación y escenario',
    lead: 'Durante la transmisión, **/play** es la arena de votación estilo trivia: preguntas de conocimiento (con bono de velocidad y rachas) y de opinión, donde la audiencia elige qué pasa. **/stage** es la pantalla del escenario.',
    phones: [{ img: 'l01-play', cap: '/play: vota, reacciona y suma +25 XP por pregunta.' }],
    desks: [{ img: 'l02-stage-desktop', cap: '/stage: la pregunta, los porcentajes en vivo, la ganadora y el QR para votar.' }],
    dense: true,
  },

  /* ---------- Bienvenida ---------- */
  { kind: 'divider', toc: 'Portales de bienvenida', num: '09', title: 'Bienvenida', lead: 'Una página de bienvenida por rol, con su video, sus fechas y sus atajos.', accent: '#FDCC0D' },
  {
    kicker: 'Bienvenida', title: 'Un portal para cada rol',
    lead: '**/bienvenida** reúne el video del recorrido y una tarjeta por rol: visitante, speaker, sponsor y prensa. Cada portal trae su video guía, los pasos y fechas que importan y sus preguntas frecuentes.',
    phones: [
      { img: 'w01-bienvenida', cap: '/bienvenida: el hub con todos los roles.' },
      { img: 'w02-bienvenida-speaker', cap: '/bienvenida/speaker: incluye la Guía del speaker.' },
      { img: 'w03-bienvenida-sponsor', cap: '/bienvenida/sponsor: incluye Términos y logística.' },
    ],
    bullets2: [
      'Los **enlaces personalizados** saludan por nombre y muestran "Tu sesión".',
      'El equipo genera las invitaciones (WhatsApp o correo) desde el Centro de mando.',
    ],
  },

  /* ---------- Prensa ---------- */
  { kind: 'divider', toc: 'Sala de prensa', num: '10', title: 'Sala de prensa', lead: 'Todo lo que un medio necesita, en un solo lugar.', accent: '#00DDFF' },
  {
    kicker: 'Prensa', title: 'Acreditación y kit de prensa',
    lead: 'La **Sala de prensa** es pública: reglas de acreditación, la ficha del Summit, las biografías de los fundadores y el kit de descargas (logos, fotos, capturas, ficha PDF y ZIP).',
    phones: [
      { img: 'm15-prensa', cap: 'Fecha límite, 10 cupos y los 3 días de acceso.' },
      { img: 'w04-bienvenida-prensa', cap: 'El portal de bienvenida de prensa.' },
    ],
    bullets2: [
      'Para acreditarse: forja tu pase y llena el formulario (medio, tipo, días y un clip de muestra).',
      'Recibes un **código de seguimiento** al instante.',
      'Al aprobarse: Holo Card **PRENSA** e invitación al Día 3 por correo.',
    ],
  },

  /* ---------- Sponsors ---------- */
  { kind: 'divider', toc: 'Sponsors y Términos y logística', num: '11', title: 'Sponsors', lead: 'Tu marca dentro de la experiencia, no al margen.', accent: '#FDCC0D' },
  {
    kicker: 'Sponsors', title: 'Paquetes 1–5 y solicitud',
    lead: '**/sponsors** muestra los partners confirmados, dónde aparece tu marca (estación en el núcleo 3D, cinta de partners, cajas del Dron, reto en el Reactor, transmisión y Día 3) y los **Paquetes 1–5**. **/patrocina** es la solicitud.',
    phones: [
      { img: 'm06-sponsors', cap: 'El hero para marcas y el muro de partners.' },
      { img: 'm06c-paquetes', cap: 'Paquetes 1–5: precio, cupos y lo que incluye cada uno.' },
      { img: 'm08-patrocina', cap: 'Elige tu paquete y envía tu solicitud; recibes un código de seguimiento.' },
    ],
  },
  {
    kicker: 'Sponsors', title: 'Términos y logística',
    lead: 'En **/sponsors#terminos** cada marca lee, antes de pagar, lo que necesita: formas de pago, fechas de pago y materiales, IVU, categorías, licencia y reporte de los Paquetes 4 y 5, cancelación, fuerza mayor y el Día 3.',
    phones: [{ img: 'm06b-terminos', cap: 'Términos y logística, con fechas que salen de la misma fuente que el resto de la app.' }],
    bullets2: [
      'Pago total y materiales a más tardar el **30 de noviembre**.',
      'El formulario se cierra solo después del **28 de noviembre**.',
      'Al aprobarse: el showcase de la marca se publica y llega su Holo Card de sponsor.',
    ],
    tip: 'Menos idas y vueltas por correo: el sponsor llega a la llamada con todo leído.',
  },

  /* ---------- Speakers ---------- */
  { kind: 'divider', toc: 'Portal de speakers y Guía del speaker', num: '12', title: 'Portal de speakers', lead: 'Del perfil a la tarima, con una guía clara en cada paso.', accent: '#FDCC0D' },
  {
    kicker: 'Speakers', title: 'Portal y Guía del speaker',
    lead: 'En **/portal-speakers** el speaker o artista llena su ficha: nombre, título, organización, pilar, tema y enlaces. Su imagen es siempre su Highbot. El envío deja su rol "En revisión" hasta que el equipo lo publica.',
    phones: [
      { img: 'm14-portal-speakers', cap: 'El formulario del portal.' },
      { img: 'm14b-guia-speaker', cap: 'La Guía del speaker: qué enviar, la sesión y la prueba técnica.' },
    ],
    bullets2: [
      'Sesión del Día 2: **45 minutos por pilar**, 100% remota.',
      'Prueba técnica antes del **8 de diciembre**; conectarse 30 minutos antes.',
      'Al publicarse: sale en /speakers y su pase se vuelve **Holo Card de speaker**.',
    ],
  },

  /* ---------- Admin ---------- */
  { kind: 'divider', toc: 'Centro de mando (admin)', num: '13', title: 'Centro de mando', lead: 'El equipo opera el Summit completo sin tocar código.', accent: '#00DDFF' },
  {
    kicker: 'Admin', title: 'Cinco áreas, un solo panel',
    lead: 'Se entra con **Google** a **/admin**. Menú a la izquierda con búsqueda (Ctrl/Cmd+K). Cada sección indica si su último cambio quedó **Publicado** para todos.',
    desks: [{ img: 'a00-centro-de-mando', cap: 'El Centro de mando.' }],
    html: `<div class="areas">
      <div><b>En vivo</b>Consola del director, anuncios, encuestas y errores en vivo.</div>
      <div><b>Contenido</b>Agenda, speakers, sponsors, paquetes, Guild, mapa, apps, redes, pilares, Highbot y bienvenida.</div>
      <div><b>Personas</b>Inscritos y Día 3, prensa, clientes potenciales, audiencia y Match.</div>
      <div><b>Juego</b>Tienda del Reactor, misiones y preguntas en vivo.</div>
      <div><b>Sistema</b>Analítica, marca, efectos, funciones, admins y respaldo.</div>
    </div>`,
    tip: 'Todo el contenido se exporta e importa por CSV, con vista previa antes de aplicar.',
  },
];

// Admin sections: two per page.
const ADMIN = [
  ['En vivo', [
    ['a01-consola-del-director', 'Consola del director: lanza y cierra preguntas, presets visuales y ve la audiencia conectada.'],
    ['a02-anuncios', 'Anuncios: un aviso para todos los visitantes, con prioridad y botón opcional.'],
    ['a03-encuestas-del-keynote', 'Encuestas del keynote: crea encuestas y ve los votos.'],
    ['a04-errores-en-vivo', 'Errores en vivo: lo que falla en los teléfonos, agrupado y al momento.'],
  ]],
  ['Contenido', [
    ['a05-agenda-run-of-show', 'Agenda / Run of Show: sesiones por día, pilar, formato y speakers.'],
    ['a06-speakers', 'Speakers: fichas publicadas.'],
    ['a07-sponsors', 'Sponsors: CRM de solicitudes; aprobar publica el showcase.'],
    ['a08-paquetes-de-auspicio', 'Paquetes de auspicio: precio, cupos y contenido de los Paquetes 1–5.'],
    ['a09-guild-initiates', 'Guild Initiates: lista, correos privados y solicitudes.'],
    ['a10-mapa-360', 'Mapa 360: puntos y hotspots del recorrido de Chroma.'],
    ['a11-apps-embebidas', 'Apps embebidas: juegos y apps del hub.'],
    ['a12-redes-sociales', 'Redes sociales: importa y modera publicaciones.'],
    ['a13-pilares-casos-y-proyectos', 'Pilares: casos y proyectos de cada página de pilar.'],
    ['a14-highbot-control-y-preguntas', 'Highbot: encender o pausar, tope diario y banco de respuestas.'],
    ['a15-portal-de-bienvenida', 'Portal de bienvenida: videos por rol y generador de invitaciones.'],
  ]],
  ['Personas', [
    ['a16-inscritos-y-dia-3', 'Inscritos y Día 3: pases, invitaciones (envían correo) y solicitudes de speakers.'],
    ['a16b-checkin-dia3', 'Código de check-in del Día 3: generar, guardar y descargar el QR de la puerta.'],
    ['a17-prensa', 'Prensa: acreditaciones con aprobados X/10.'],
    ['a18-clientes-potenciales', 'Clientes potenciales: todos los marcados con ⭐, con estado y nota.'],
    ['a19-audiencia-y-leads', 'Audiencia y leads del motor en vivo.'],
    ['a20-entrepreneur-match', 'Entrepreneur Match: perfiles, visibilidad y reportes.'],
  ]],
  ['Juego', [
    ['a21-tienda-del-reactor', 'Tienda del Reactor: premios, inventario y canjes.'],
    ['a22-misiones', 'Misiones: texto y XP de cada misión del Reactor.'],
    ['a23-preguntas-en-vivo', 'Preguntas en vivo: el banco de preguntas y escenarios del escenario.'],
  ]],
  ['Sistema', [
    ['a24-analitica', 'Analítica: visitas, pases, votos y retención.'],
    ['a25-marca-y-tenants', 'Marca y tenants: tema, colores y salas de transmisión.'],
    ['a26-efectos-visuales', 'Efectos visuales: laboratorio de presets del escenario.'],
    ['a27-funciones-y-qa', 'Funciones y QA: activar, pausar o apagar cada módulo.'],
    ['a28-admins', 'Admins: quién entra y con qué rol.'],
    ['a29-respaldo-y-restauracion', 'Respaldo y restauración: descarga todo en CSV.'],
  ]],
];
for (const [area, list] of ADMIN) {
  for (let i = 0; i < list.length; i += 2) {
    const pair = list.slice(i, i + 2);
    pages.push({
      toc: i === 0 ? `Admin · ${area}` : undefined, tocSub: true,
      kicker: `Centro de mando · ${area}`, title: i === 0 ? area : `${area} (cont.)`,
      desks: pair.map(([img, cap]) => ({ img, cap })),
    });
  }
}

pages.push({
  toc: 'Lo que hace esta app de otro nivel', kicker: 'Por qué importa', title: 'Lo que hace esta app de otro nivel',
  html: `<div class="feat">
    <div><b>Núcleo 3D en tiempo real</b><span>La portada es la marca: el SGX Framework se toca y se recorre, y se adapta a teléfonos modestos.</span></div>
    <div><b>Holo Card = SGX Pass</b><span>Una sola credencial: entrada, tarjeta de contacto y pieza para redes, que cambia sola al rol aprobado.</span></div>
    <div><b>Highbot propio</b><span>Cada Creador diseña su personaje, que aparece en su pase, en el núcleo y en el chat.</span></div>
    <div><b>Asistente con IA</b><span>Ayuda real dentro de la app, con costo controlado y sin hacer nada más que conversar y guiar.</span></div>
    <div><b>Escenario dirigido por la audiencia</b><span>Votos que cambian el visual en vivo; probado con 2,000 teléfonos simulados.</span></div>
    <div><b>Economía gamificada</b><span>Misiones por pilar, sellos, Overdrive y premios: una razón para volver los tres días.</span></div>
    <div><b>Networking por QR</b><span>Un escaneo guarda a las dos personas: el Día 3 se vuelve un juego de conexiones.</span></div>
    <div><b>Funciona sin señal</b><span>Se abre desde un enlace y el QR del pase abre aunque no haya conexión en la puerta.</span></div>
    <div><b>Portales por rol</b><span>Cada speaker, sponsor y medio recibe su propia guía e invitación personalizada.</span></div>
    <div><b>Kit de prensa desde los datos</b><span>Ficha, logos, fotos y capturas siempre alineados con la app.</span></div>
    <div><b>Fechas en una sola fuente</b><span>Formularios que se cierran solos; ninguna página da una fecha distinta.</span></div>
    <div><b>Centro de mando sin código</b><span>CSV con vista previa, interruptores, errores en vivo y check-in con QR.</span></div>
    <div><b>Accesible</b><span>Auditada con WCAG 2.1 AA: foco visible, contraste y navegación por teclado.</span></div>
    <div><b>Bilingüe de punta a punta</b><span>Español e inglés en toda la app, sin una segunda versión.</span></div>
  </div>`,
});
pages.push({ kind: 'dates', toc: 'Fechas clave', kicker: 'Calendario', title: 'Fechas clave' });
pages.push({ kind: 'contact', toc: 'Contacto' });

module.exports = { pages, DATES };
