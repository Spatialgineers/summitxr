import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePilotProfile } from '../context/PilotProfileContext';
import { useAuth } from '../context/AuthContext';
import { SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { PILLAR_ACCENT } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { usePassQr } from './SgxPassCard';
import { SgxPilotGlyph } from './SgxPilotGlyph';
import { ROLE_COPY, useHoloCredentials, type CredentialRole, type HoloCredential } from './credentials';
import { CARD_H, CARD_W, drawCardBack, drawCardFront, loadImage, renderFormat, svgElementToImage, type CardArt, type HoloFormat } from './holoCardCanvas';

/* HOLO CARD STUDIO. Your Holo Card is your SGX Pass: same name, pilot, QR
   and stamps. The data comes from your registration (Forge, speaker portal,
   sponsor form, Guild roster); here you only pick the format and adjust the
   small things: portrait, framing, foil and backdrop. */

type Portrait = 'pilot' | 'photo' | 'role';
interface Style { portrait: Portrait; zoom: number; x: number; y: number; foil: number; backdrop: 0 | 1 | 2 }
const STYLE_KEY = 'sgx_holo_style_v1';
const DEFAULT_STYLE: Style = { portrait: 'pilot', zoom: 1, x: 0, y: 0, foil: 0.7, backdrop: 0 };

function loadStyle(): Style {
  try { return { ...DEFAULT_STYLE, ...(JSON.parse(localStorage.getItem(STYLE_KEY) || '{}') || {}) }; } catch { return DEFAULT_STYLE; }
}

const fire = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

interface Props {
  initialRole?: CredentialRole;
  onClose?: () => void;
}

export const SgxHoloStudio: React.FC<Props> = ({ initialRole, onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { profile, recordActivity } = usePilotProfile();
  const { user } = useAuth();
  const { identity, isForged, missions, xpBalance } = useSgxIdentity();
  const { credentials } = useHoloCredentials();
  const qr = usePassQr();

  const [role, setRole] = useState<CredentialRole>(initialRole || 'visitor');
  const [format, setFormat] = useState<HoloFormat>('badge');
  const [back, setBack] = useState(false);
  const [style, setStyleState] = useState<Style>(() => loadStyle());
  const [banner, setBanner] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 4, y: -8 });
  const setStyle = (patch: Partial<Style>) => setStyleState((s) => {
    const next = { ...s, ...patch };
    try { localStorage.setItem(STYLE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  const cred: HoloCredential | undefined = credentials.find((c) => c.role === role) || credentials[0];
  useEffect(() => {
    if (cred && cred.role !== role) setRole(cred.role);
  }, [cred, role]);

  const accent = cred?.pillar ? PILLAR_ACCENT[cred.pillar] : (identity.affinity ? PILLAR_ACCENT[identity.affinity] : '#FDCC0D');

  /* ---- images ---- */
  const glyphRef = useRef<HTMLDivElement | null>(null);
  const [pilotImg, setPilotImg] = useState<HTMLImageElement | null>(null);
  const [photoImg, setPhotoImg] = useState<HTMLImageElement | null>(null);
  const [roleImg, setRoleImg] = useState<HTMLImageElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const [bolt, setBolt] = useState<HTMLImageElement | null>(null);
  const [icons, setIcons] = useState<Partial<Record<PillarKey, HTMLImageElement>>>({});
  const pilotKey = JSON.stringify((identity.avatar as any).pilot || identity.avatar.seed) + accent;

  useEffect(() => {
    let alive = true;
    // the glyph renders in a hidden node; give it a frame, then rasterize it
    const t = window.setTimeout(() => {
      svgElementToImage(glyphRef.current?.querySelector('svg') || null, 600).then((img) => { if (alive) setPilotImg(img); });
    }, 30);
    return () => { alive = false; window.clearTimeout(t); };
  }, [pilotKey]);
  useEffect(() => { let a = true; loadImage(identity.avatar.png).then((i) => a && setPhotoImg(i)); return () => { a = false; }; }, [identity.avatar.png]);
  useEffect(() => { let a = true; loadImage(cred?.photo).then((i) => a && setRoleImg(i)); return () => { a = false; }; }, [cred?.photo]);
  useEffect(() => { let a = true; loadImage(qr).then((i) => a && setQrImg(i)); return () => { a = false; }; }, [qr]);
  useEffect(() => {
    let a = true;
    loadImage('/brand/sgx-bolt.svg').then((i) => a && setBolt(i));
    Promise.all(SGX_PILLARS.map((p) => loadImage(p.iconUrl).then((img) => [p.key, img] as const))).then((pairs) => {
      if (!a) return;
      const m: Partial<Record<PillarKey, HTMLImageElement>> = {};
      pairs.forEach(([k, img]) => { if (img) m[k] = img; });
      setIcons(m);
    });
    return () => { a = false; };
  }, []);

  const portraitChoice: Portrait = style.portrait === 'photo' && !photoImg ? 'pilot'
    : style.portrait === 'role' && !roleImg ? 'pilot' : style.portrait;
  const portrait = portraitChoice === 'photo' ? photoImg : portraitChoice === 'role' ? roleImg : pilotImg;

  /* ---- art ---- */
  const pass = identity.pass;
  const art: CardArt | null = useMemo(() => {
    if (!cred) return null;
    const stamps: Partial<Record<PillarKey, boolean>> = {};
    SGX_PILLARS.forEach((p) => { stamps[p.key] = !!identity.stamps[`pillar:${p.key}`]; });
    return {
      cred, es, accent,
      serial: pass?.serial,
      code: pass?.code,
      tierLabel: cred.role === 'visitor'
        ? (pass?.tier === 'SHOWCASE' ? (es ? 'DÍA 3 · CHROMA' : 'DAY 3 · CHROMA') : (es ? 'DIGITAL GLOBAL' : 'GLOBAL DIGITAL'))
        : ROLE_COPY[cred.role].label[es ? 0 : 1].toUpperCase(),
      rank: `${profile.rankTitle} · LV ${profile.level}`,
      stamps,
      chroma: !!identity.stamps['chroma:checkin'],
      portrait,
      frame: portraitChoice === 'pilot' ? undefined : { zoom: style.zoom, x: style.x, y: style.y },
      qr: pass ? qrImg : null,
      bolt,
      pillarIcons: icons,
      foil: style.foil,
      foilAngle: 35 + tilt.y * 3,
    };
  }, [cred, es, accent, pass, identity.stamps, profile.rankTitle, profile.level, portrait, portraitChoice, style, qrImg, bolt, icons, tilt.y]);

  const backArt = useMemo(() => ({
    es, accent, serial: pass?.serial, bolt, foil: style.foil,
    stats: [
      { label: 'XP', value: profile.totalXp.toLocaleString('es-PR') },
      { label: es ? 'Para gastar' : 'Spendable', value: xpBalance.toLocaleString('es-PR') },
      { label: 'Reactor', value: `${Object.keys(identity.missions).length}/${missions.length}` },
      { label: 'Rolodex', value: String(identity.contacts.length) },
      { label: es ? 'Sellos' : 'Stamps', value: `${Object.keys(identity.stamps).filter((k) => k.startsWith('pillar:')).length}/6` },
      { label: 'Sponsors', value: String(Object.keys(identity.stamps).filter((k) => k.startsWith('sponsor:')).length) },
    ],
    fine: es
      ? 'Días 1 y 2: YouTube Live. Día 3: Chroma Space Studios, San Juan, por invitación y cupo limitado. Este mismo QR es tu entrada, tu tarjeta de contacto y tu ficha de premios.'
      : 'Days 1 and 2: YouTube Live. Day 3: Chroma Space Studios, San Juan, by invitation and limited capacity. This same QR is your entrance, your contact card and your prize token.',
    issued: pass ? `${es ? 'Forjado' : 'Forged'} · ${new Date(pass.forgedAt).toLocaleDateString(es ? 'es-PR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}` : '',
  }), [es, accent, pass, bolt, style.foil, profile.totalXp, xpBalance, identity.missions, identity.contacts.length, identity.stamps, missions.length]);

  const headline = cred ? (cred.role === 'visitor'
    ? (es ? 'YA TENGO MI SGX PASS' : 'I GOT MY SGX PASS')
    : ROLE_COPY[cred.role].band[es ? 0 : 1]) : '';

  const draw = useCallback((fmt: HoloFormat, scale = 1): HTMLCanvasElement | null => {
    if (!art) return null;
    const face = (ctx: CanvasRenderingContext2D) => (back && fmt === 'badge' ? drawCardBack(ctx, backArt) : drawCardFront(ctx, art));
    return renderFormat(face, fmt, { es, accent, headline, backdrop: style.backdrop, scale });
  }, [art, back, backArt, es, accent, headline, style.backdrop]);

  /* ---- live preview ---- */
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const out = draw(format, format === 'badge' ? 1 : 0.5);
    const c = previewRef.current;
    if (!out || !c) return;
    c.width = out.width; c.height = out.height;
    c.getContext('2d')!.drawImage(out, 0, 0);
  }, [draw, format]);

  const onTilt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (format !== 'badge') return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 14, y: px * 20 });
  };

  /* ---- export ---- */
  const review = cred?.status === 'review';
  const fileName = `sgx-holo-card-${cred?.role}-${format}${back ? '-reverso' : ''}.png`;

  const exported = () => {
    const front = art ? renderFormat((ctx) => drawCardFront(ctx, art), 'badge', { es, accent, headline, backdrop: style.backdrop, scale: 0.6 }) : null;
    let image: string | undefined;
    try { image = front?.toDataURL('image/jpeg', 0.82); } catch { image = undefined; }
    if (!localStorage.getItem('sgx_holo_card_generated')) {
      recordActivity('holo_card_export', es ? 'Holo Card exportada' : 'Holo Card exported', `${cred?.role} · ${format}`, 150);
    }
    try { localStorage.setItem('sgx_holo_card_generated', 'true'); } catch { /* ignore */ }
    fire('sgx:holo_card_exported', { role: cred?.role === 'visitor' ? 'visitante' : cred?.role, image });
  };

  const download = () => {
    if (review) return;
    const c = draw(format, format === 'badge' ? 2 : 1);
    if (!c) return;
    try {
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = fileName;
      a.click();
      playUiChirp(880);
      exported();
      setBanner(es ? 'Descargada. Ya está también en tu Hangar.' : 'Downloaded. It is in your Hangar too.');
    } catch {
      setBanner(es ? 'No se pudo exportar una de las imágenes. Prueba con otra foto.' : 'One of the images could not be exported. Try another photo.');
    }
  };

  const share = async () => {
    if (review) return;
    const c = draw(format, format === 'badge' ? 2 : 1);
    if (!c) return;
    const text = cred?.role === 'visitor'
      ? (es ? 'Ya tengo mi SGX Pass para el Spatialgineers Summit 2026 (11–13 dic). Saca el tuyo en summit.spatialgineers.com #SpatialgineersSummit' : 'I got my SGX Pass for the Spatialgineers Summit 2026 (Dec 11–13). Get yours at summit.spatialgineers.com #SpatialgineersSummit')
      : `${headline} · Spatialgineers Summit 2026 · summit.spatialgineers.com #SpatialgineersSummit`;
    try {
      const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/png'));
      const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;
      if (file && (navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], text });
        exported();
        return;
      }
      await navigator.clipboard?.writeText(text);
      setBanner(es ? 'Texto copiado. Descarga la imagen y súbela con ese texto.' : 'Text copied. Download the image and post it with that text.');
    } catch { /* share cancelled */ }
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      // Downscale so it fits the pass storage, then it is your pass photo too.
      loadImage(src).then((img) => {
        if (!img) return;
        const k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        const png = c.toDataURL('image/jpeg', 0.86);
        fire('sgx:avatar_saved', { png });
        setStyle({ portrait: 'photo', zoom: 1, x: 0, y: 0 });
      });
    };
    reader.readAsDataURL(file);
  };

  const editData = () => {
    onClose?.();
    window.setTimeout(() => {
      if (cred?.role === 'speaker') fire('sgx:open_speaker_portal');
      else if (cred?.role === 'sponsor') fire('sgx:open_sponsor_modal');
      else fire('sgx:open_forge');
    }, 80);
  };

  /* ---- empty state ---- */
  if (!cred) {
    return (
      <div className="sgx-hstudio sgx-hstudio--empty">
        <div ref={glyphRef} hidden />
        <h3>{es ? 'Tu Holo Card sale de tu SGX Pass' : 'Your Holo Card comes from your SGX Pass'}</h3>
        <p>{es ? 'Forja tu pase y tu Holo Card queda lista con tu nombre, tu piloto y tu QR.' : 'Forge your pass and your Holo Card is ready with your name, pilot and QR.'}</p>
        <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={() => { onClose?.(); window.setTimeout(() => fire('sgx:open_forge'), 80); }}>[ ⚡ {es ? 'Forjar mi SGX Pass' : 'Forge my SGX Pass'} ]</button></span>
      </div>
    );
  }

  const roleName = (r: CredentialRole) => (r === 'visitor' ? (es ? 'SGX Pass' : 'SGX Pass') : ROLE_COPY[r].label[es ? 0 : 1]);

  return (
    <div className="sgx-hstudio">
      <div ref={glyphRef} className="sgx-hstudio__glyph" aria-hidden="true">
        <SgxPilotGlyph seed={identity.avatar.seed} accent={accent} size={300} {...({ config: (identity.avatar as any).pilot } as any)} />
      </div>

      {credentials.length > 1 && (
        <div className="sgx-hstudio__roles" role="tablist" aria-label={es ? 'Tus credenciales' : 'Your credentials'}>
          {credentials.map((c) => (
            <button key={c.role} type="button" role="tab" aria-selected={c.role === cred.role} className={c.role === cred.role ? 'is-on' : ''} onClick={() => { playUiChirp(700); setRole(c.role); setBack(false); }}>
              {roleName(c.role)}
              {c.status === 'review' && <span className="sgx-hstudio__pill">{es ? 'En revisión' : 'In review'}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="sgx-hstudio__grid">
        <div className="sgx-hstudio__stage">
          <div className="sgx-hstudio__formats" role="tablist">
            {(['badge', 'post', 'story'] as HoloFormat[]).map((f) => (
              <button key={f} type="button" role="tab" aria-selected={format === f} className={format === f ? 'is-on' : ''} onClick={() => { playUiChirp(620); setFormat(f); if (f !== 'badge') setBack(false); }}>
                {f === 'badge' ? (es ? 'Tarjeta 3D' : '3D card') : f === 'post' ? 'Post 4:5' : 'Story 9:16'}
              </button>
            ))}
            {format === 'badge' && cred.role === 'visitor' && (
              <button type="button" className="sgx-hstudio__flip" onClick={() => { playUiChirp(480); setBack((b) => !b); }}>⟲ {back ? (es ? 'Frente' : 'Front') : (es ? 'Telemetría' : 'Telemetry')}</button>
            )}
          </div>
          <div
            className={`sgx-hstudio__preview sgx-hstudio__preview--${format}`}
            onPointerMove={onTilt}
            onPointerLeave={() => setTilt({ x: 4, y: -8 })}
          >
            <canvas
              ref={previewRef}
              width={CARD_W}
              height={CARD_H}
              style={format === 'badge' ? { transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` } : undefined}
              aria-label={es ? `Vista previa de tu Holo Card (${roleName(cred.role)})` : `Your Holo Card preview (${roleName(cred.role)})`}
              role="img"
            />
          </div>
          {review && (
            <p className="sgx-hstudio__review">
              {cred.role === 'speaker'
                ? (es ? 'Tu credencial de speaker está en revisión. Cuando el equipo la apruebe, aparece aquí como oficial y la puedes descargar.' : 'Your speaker credential is in review. Once the team approves it, it shows here as official and you can download it.')
                : (es ? 'Tu credencial de sponsor está en revisión. Cuando el equipo apruebe tu alianza, aparece aquí como oficial y la puedes descargar.' : 'Your sponsor credential is in review. Once the team approves your partnership, it shows here as official and you can download it.')}
            </p>
          )}
          <div className="sgx-hstudio__actions">
            <span className="sgx-glow"><button type="button" className="sgx-btn" disabled={review} onClick={download}>{es ? 'Descargar PNG' : 'Download PNG'}</button></span>
            <button type="button" className="sgx-btn sgx-btn--ground" disabled={review} onClick={share}>{es ? 'Compartir' : 'Share'}</button>
          </div>
          {banner && <p className="sgx-hstudio__banner" role="status">{banner}</p>}
        </div>

        <div className="sgx-hstudio__panel">
          <section>
            <h4>{es ? 'Datos' : 'Details'}</h4>
            <dl className="sgx-hstudio__data">
              <div><dt>{es ? 'Nombre' : 'Name'}</dt><dd>{cred.name}</dd></div>
              {cred.role === 'visitor' ? (
                <>
                  <div><dt>Callsign</dt><dd>{cred.handle}</dd></div>
                  {cred.org && <div><dt>{es ? 'Organización' : 'Organization'}</dt><dd>{cred.org}</dd></div>}
                </>
              ) : (
                <>
                  {cred.title && <div><dt>{es ? 'Rol' : 'Role'}</dt><dd>{cred.title}</dd></div>}
                  {cred.org && <div><dt>{es ? 'Organización' : 'Organization'}</dt><dd>{cred.org}</dd></div>}
                  {cred.topic && <div><dt>{es ? 'Detalle' : 'Detail'}</dt><dd>{cred.topic}</dd></div>}
                </>
              )}
            </dl>
            <p className="sgx-hstudio__hint">
              {cred.role === 'initiate'
                ? (es ? 'Estos datos los mantiene el equipo del SGX Guild.' : 'The SGX Guild team keeps these details.')
                : (es ? 'Salen de tu registro. Para cambiarlos, edítalos ahí y tu Holo Card se actualiza sola.' : 'They come from your registration. Edit them there and your Holo Card updates itself.')}
            </p>
            {cred.role !== 'initiate' && (
              <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={editData}>
                {cred.role === 'speaker' ? (es ? 'Abrir portal de speakers' : 'Open speaker portal') : cred.role === 'sponsor' ? (es ? 'Abrir formulario de sponsors' : 'Open sponsor form') : (es ? 'Editar mi pase' : 'Edit my pass')}
              </button>
            )}
          </section>

          <section>
            <h4>{es ? 'Retrato' : 'Portrait'}</h4>
            <div className="sgx-hstudio__seg">
              <button type="button" className={portraitChoice === 'pilot' ? 'is-on' : ''} onClick={() => setStyle({ portrait: 'pilot' })}>{es ? 'Mi piloto' : 'My pilot'}</button>
              {photoImg && <button type="button" className={portraitChoice === 'photo' ? 'is-on' : ''} onClick={() => setStyle({ portrait: 'photo' })}>{es ? 'Mi foto' : 'My photo'}</button>}
              {roleImg && cred.role !== 'visitor' && <button type="button" className={portraitChoice === 'role' ? 'is-on' : ''} onClick={() => setStyle({ portrait: 'role' })}>{es ? 'Foto del registro' : 'Registration photo'}</button>}
              <label className="sgx-hstudio__upload">
                {es ? 'Subir foto' : 'Upload photo'}
                <input type="file" accept="image/*" onChange={onPhoto} />
              </label>
            </div>
            {portraitChoice !== 'pilot' && (
              <div className="sgx-hstudio__sliders">
                <label>{es ? 'Zoom' : 'Zoom'}<input type="range" min={1} max={2.2} step={0.02} value={style.zoom} onChange={(e) => setStyle({ zoom: Number(e.target.value) })} /></label>
                <label>{es ? 'Horizontal' : 'Horizontal'}<input type="range" min={-1} max={1} step={0.02} value={style.x} onChange={(e) => setStyle({ x: Number(e.target.value) })} /></label>
                <label>{es ? 'Vertical' : 'Vertical'}<input type="range" min={-1} max={1} step={0.02} value={style.y} onChange={(e) => setStyle({ y: Number(e.target.value) })} /></label>
              </div>
            )}
            {portraitChoice === 'pilot' && (
              <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => { onClose?.(); window.setTimeout(() => fire('sgx:open_avatar'), 80); }}>{es ? 'Editar mi piloto' : 'Edit my pilot'}</button>
            )}
            <p className="sgx-hstudio__hint">{es ? 'Tu foto se queda en tu dispositivo y también aparece en tu pase.' : 'Your photo stays on your device and also shows on your pass.'}</p>
          </section>

          <section>
            <h4>{es ? 'Acabado' : 'Finish'}</h4>
            <div className="sgx-hstudio__sliders">
              <label>{es ? 'Foil holográfico' : 'Holo foil'}<input type="range" min={0} max={1} step={0.05} value={style.foil} onChange={(e) => setStyle({ foil: Number(e.target.value) })} /></label>
            </div>
            {format !== 'badge' && (
              <div className="sgx-hstudio__seg">
                {[es ? 'Cuadrícula' : 'Grid', es ? 'Estrellas' : 'Stars', es ? 'Líneas' : 'Lines'].map((label, i) => (
                  <button key={label} type="button" className={style.backdrop === i ? 'is-on' : ''} onClick={() => setStyle({ backdrop: i as 0 | 1 | 2 })}>{label}</button>
                ))}
              </div>
            )}
          </section>

          {!credentials.some((c) => c.role === 'initiate') && (!user || user.isAnonymous) && (
            <p className="sgx-hstudio__hint">
              {es ? '¿Eres Initiate del SGX Guild? Inicia sesión con Google (desde tu Hangar) con el email que registró el equipo y tu Holo Card de Initiate aparece aquí.' : 'Are you an SGX Guild Initiate? Sign in with Google (from your Hangar) with the email the team registered and your Initiate Holo Card shows up here.'}
            </p>
          )}
        </div>
      </div>
      {!isForged && cred.role !== 'visitor' && (
        <p className="sgx-hstudio__hint">{es ? 'Forja tu SGX Pass para que esta tarjeta lleve tu QR y tus sellos.' : 'Forge your SGX Pass so this card carries your QR and stamps.'}</p>
      )}
    </div>
  );
};

export default SgxHoloStudio;
