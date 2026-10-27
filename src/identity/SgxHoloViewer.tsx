import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { PILLAR_ACCENT } from './sgxIdentity';
import { SgxPilotGlyph } from './SgxPilotGlyph';
import { ROLE_COPY, type HoloCredential } from './credentials';
import { CARD_H, CARD_W, drawCardFront, loadImage, svgElementToImage } from './holoCardCanvas';

/* Someone else's official Holo Card (a published speaker, a Guild
   initiate): read-only, from the team's data. */

interface Props {
  cred: HoloCredential;
  onClose: () => void;
}

export const SgxHoloViewer: React.FC<Props> = ({ cred, onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const accent = cred.pillar ? PILLAR_ACCENT[cred.pillar] : ROLE_COPY[cred.role].color;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glyphRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [photo, bolt, ...icons] = await Promise.all([
        loadImage(cred.photo),
        loadImage('/brand/sgx-bolt.svg'),
        ...SGX_PILLARS.map((p) => loadImage(p.iconUrl)),
      ]);
      const portrait = photo || await svgElementToImage(glyphRef.current?.querySelector('svg') || null, 600);
      if (!alive || !canvasRef.current) return;
      const pillarIcons: Partial<Record<PillarKey, HTMLImageElement>> = {};
      SGX_PILLARS.forEach((p, i) => { if (icons[i]) pillarIcons[p.key] = icons[i]!; });
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, CARD_W, CARD_H);
      drawCardFront(ctx, {
        cred, es, accent, portrait, bolt, pillarIcons,
        tierLabel: ROLE_COPY[cred.role].label[es ? 0 : 1].toUpperCase(),
        stamps: cred.pillar ? { [cred.pillar]: true } : {},
      });
      setReady(true);
    })();
    return () => { alive = false; };
  }, [cred, es, accent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const download = () => {
    try {
      const a = document.createElement('a');
      a.href = canvasRef.current!.toDataURL('image/png');
      a.download = `sgx-holo-card-${cred.role}-${cred.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      a.click();
      playUiChirp(880);
    } catch { /* remote photo without CORS: the card stays viewable */ }
  };

  return (
    <div className="sgx-hangar sgx-incoming" role="dialog" aria-modal="true" aria-label={`Holo Card · ${cred.name}`} onClick={onClose}>
      <div className="sgx-holoview sgx-panel" onClick={(e) => e.stopPropagation()}>
        <div ref={glyphRef} className="sgx-hstudio__glyph" aria-hidden="true">
          <SgxPilotGlyph seed={cred.name} accent={accent} size={300} />
        </div>
        <p className="sgx-forge__kicker">{ROLE_COPY[cred.role].band[es ? 0 : 1]}</p>
        <canvas ref={canvasRef} width={CARD_W} height={CARD_H} className={ready ? 'is-ready' : ''} role="img" aria-label={`Holo Card · ${cred.name}`} />
        <div className="sgx-forge__actions">
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={onClose}>{es ? 'Cerrar' : 'Close'}</button>
          <button type="button" className="sgx-btn" onClick={download}>{es ? 'Descargar' : 'Download'}</button>
        </div>
      </div>
    </div>
  );
};

export default SgxHoloViewer;
