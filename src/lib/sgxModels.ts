import type { PillarKey } from './sgxPillars';

/* The SGX 3D brand models on the CDN: the logos and the six pillar sculptures
   (Draco-compressed .glb). One list for the 3D model viewer and the Highbot's
   pillar emblems. */

const CDN = 'https://cdn.spatialgineers.com/3D%20Branding';

export const PILLAR_GLB: Record<PillarKey, string> = {
  STORY: `${CDN}/Pilares/Opt/Story%20opt.glb`,
  SHOWCASE: `${CDN}/Pilares/Opt/Showcase%20opt.glb`,
  SPARK: `${CDN}/Pilares/Opt/Spark%20Opt.glb`,
  STAGE: `${CDN}/Pilares/Opt/Stage%20opt.glb`,
  SYSTEM: `${CDN}/Pilares/Opt/System%20opt.glb`,
  SYNTHESIZE: `${CDN}/Pilares/Opt/Synthesize%20opt.glb`,
};

/** The Spatialgineers icon: the gear and the bolt. */
export const SGX_ICON_GLB = `${CDN}/SGX%20Icon.glb`;
/** The SGX Guild emblem. */
export const SGX_GUILD_GLB = `${CDN}/Sgxgs%201.glb`;

/** Draco decoders for the compressed models. */
export const DRACO_DECODERS = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
