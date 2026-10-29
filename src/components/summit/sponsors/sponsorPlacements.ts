/* Where a sponsor's brand really shows up, and which tiers get each spot.
   Every entry maps to live code (see the comment on each one); the "tu marca
   aquí" slots in the 3D core and the intro are the open inventory on purpose.
   The thumbnails are screenshots of the app, in /public/sponsors/placements. */

export type TierNumber = 1 | 2 | 3 | 4 | 5;

export interface SponsorPlacement {
  id: string;
  /** Screenshot base name (`<img>-es.webp` / `<img>-en.webp`); none = happens outside the web app. */
  img?: string;
  /** Mark from /public/holo shown when there is no screenshot. */
  mark?: string;
  tiers: TierNumber[];
  feature?: boolean;
  es: { title: string; where: string; body: string };
  en: { title: string; where: string; body: string };
}

const ALL: TierNumber[] = [1, 2, 3, 4, 5];

export const SPONSOR_PLACEMENTS: SponsorPlacement[] = [
  {
    // SgxOrbitalCore3D: SGX_3D_SPONSOR_STATIONS (Tier 3, Tier 4 and Tier 5 stations).
    id: 'core-3d', img: 'core-3d-feature', tiers: [3, 4, 5], feature: true,
    es: { title: 'Estación en el núcleo 3D', where: 'Portada · Núcleo 3D', body: 'Un panel con tu marca orbita el núcleo 3D de la portada. Se toca, la cámara viaja hasta él y abre tu ficha. Los paneles "Tu marca aquí" son los cupos abiertos de Tier 3 y Tier 4.' },
    en: { title: 'Station in the 3D core', where: 'Home · 3D core', body: 'A panel with your brand orbits the 3D core on the home screen. Tap it, the camera flies to it and your profile opens. The "Your brand here" panels are the open Tier 3 and Tier 4 slots.' },
  },
  {
    // HeaderNav: TransientSponsorSlot "header_main"; SummitLandingPage: SummitSponsorTicker (activeInAppTicker).
    id: 'header-rotation', img: 'header-rotation', tiers: ALL,
    es: { title: 'Cabecera y cinta de partners', where: 'Todas las secciones', body: 'Tu logo rota en la cabecera de la webapp y corre en la cinta de patrocinios que encabeza cada sección.' },
    en: { title: 'Header and partner ribbon', where: 'Every section', body: 'Your logo rotates in the web app header and runs in the sponsor ribbon at the top of every section.' },
  },
  {
    // SgxBootSequence + splashSponsors.pickSplashSponsors: Tier 3+ only.
    id: 'splash', img: 'splash', tiers: [3, 4, 5],
    es: { title: 'Intro del Summit', where: 'Al entrar a la webapp', body: 'La pantalla de entrada presenta a los patrocinadores y aliados Tier 3 o superior antes de abrir el núcleo.' },
    en: { title: 'Summit intro', where: 'On entering the web app', body: 'The intro screen presents Tier 3 and higher sponsors and partners before the core opens.' },
  },
  {
    // SummitDroneMiniGame: crate skins from activeInMiniGame sponsors + pre-run sponsor slot.
    id: 'drone-crates', img: 'drone-crates', tiers: [2, 3, 4, 5],
    es: { title: 'Cajas del Dron SGX', where: 'SGX.Spark · Minijuego 3D', body: 'Las cajas de entrega del minijuego llevan tu nombre y tu logo. Cada caja que se recoge suma puntos y muestra tu marca en pantalla.' },
    en: { title: 'SGX Drone crates', where: 'SGX.Spark · 3D mini-game', body: 'The mini-game delivery crates carry your name and logo. Every crate picked up scores points and shows your brand on screen.' },
  },
  {
    // reactor.sponsorMissions: tier_3, tier_4, tier_5 → branded mission + stamp.
    id: 'reactor-mission', img: 'reactor-mission', tiers: [3, 4, 5],
    es: { title: 'Reto de marca en el Reactor', where: 'SGX Pass · Reactor', body: 'Tu marca tiene su propia misión en SGX.Showcase (+90 XP): quien abre tu ficha se lleva tu sello en su SGX Pass.' },
    en: { title: 'Brand challenge in the Reactor', where: 'SGX Pass · Reactor', body: 'Your brand gets its own mission in SGX.Showcase (+90 XP): whoever opens your profile takes your stamp on their SGX Pass.' },
  },
  {
    // SummitBrandShowcaseModal, opened from the header, the ribbon, the intro and this page.
    id: 'brand-showcase', img: 'brand-showcase', tiers: ALL,
    es: { title: 'Tu ficha de marca', where: 'Desde la cabecera, la cinta y esta página', body: 'Una ficha con tu descripción, tus puntos clave, tu enlace y tu oferta para los Creadores.' },
    en: { title: 'Your brand profile', where: 'From the header, the ribbon and this page', body: 'A profile with your description, highlights, link and your offer for Creators.' },
  },
  {
    // credentials: sponsor Holo Card, official once the team approves the partnership.
    id: 'holo-card', img: 'holo-card', tiers: ALL,
    es: { title: 'Holo Card de sponsor', where: 'Holo Card Studio', body: 'Quien envía la solicitud recibe una Holo Card de sponsor. Al aprobarse la alianza queda oficial y se descarga como tarjeta 3D, post o story.' },
    en: { title: 'Sponsor Holo Card', where: 'Holo Card Studio', body: 'Whoever sends the request gets a sponsor Holo Card. Once the partnership is approved it turns official and downloads as a 3D card, post or story.' },
  },
  {
    // Tier data (Dossier v2026.10.1): broadcast overlays (Tier 1+), named segment + intro video (Tier 3+).
    id: 'broadcast', mark: '/holo/stage.png', tiers: ALL,
    es: { title: 'Transmisión en YouTube Live', where: 'Días 1–3 · junto a Los Mismos TV', body: 'Tu logo en los overlays de la transmisión de los tres días. Desde Tier 3, un segmento con tu nombre y un video de presentación de 30 a 60 segundos.' },
    en: { title: 'YouTube Live broadcast', where: 'Days 1–3 · with Los Mismos TV', body: 'Your logo on the broadcast overlays all three days. From Tier 3, a segment carrying your name and a 30- to 60-second intro video.' },
  },
  {
    // Tier data: "Experience by [Marca]" main activation (Tier 4); Tier 5 includes Tier 4 per agreement.
    id: 'day3', mark: '/holo/showcase.png', tiers: [4, 5],
    es: { title: 'Día 3 en Chroma Space Studios', where: 'San Juan · presencial, por invitación', body: 'Una activación principal con tu nombre: "Experience by [Tu marca]", en el SGX Showcase del Día 3.' },
    en: { title: 'Day 3 at Chroma Space Studios', where: 'San Juan · in person, by invitation', body: 'A main activation carrying your name: "Experience by [Your brand]", at the Day 3 SGX Showcase.' },
  },
];

export const placementImage = (p: SponsorPlacement, es: boolean) =>
  p.img ? `/sponsors/placements/${p.img}-${es ? 'es' : 'en'}.webp` : undefined;
