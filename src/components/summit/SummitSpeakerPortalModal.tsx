import React, { useState } from 'react';
import { Check, Copy, Share2, CheckCircle2, AlertTriangle, UserRound, ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { SummitSpeaker, SummitPillarId } from '../../types/summit';
import { registerSpeakerProfile, playNotificationChime } from '../../lib/summitData';
import { SGX_PILLARS, bi, findPillar } from '../../lib/sgxPillars';
import { PILLAR_ACCENT } from '../../identity/sgxIdentity';
import { savePendingCredential } from '../../identity/credentials';
import { PilotBuilder } from '../../identity/PilotBuilder';
import { configFromSeed, pilotImage, pilotSvg, type PilotConfig } from '../../identity/pilotAvatar';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { SgxDialog } from '../common/SgxDialog';
import './sgxModals.css';

/* SPEAKER & ARTIST PORTAL: self-service application. Every person in the
   Summit (visitors, speakers, artists) is shown with an avatar from the SGX
   avatar builder, never an uploaded photo; it travels as `avatarUrl` (a small
   JPEG). A brand or project logo can be shared as a link. */

interface SummitSpeakerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeakerRegistered?: (speaker: SummitSpeaker) => void;
  initialSpeaker?: SummitSpeaker | null;
}

/** Only a rendered avatar is kept (old photos and pillar marks are replaced by one). */
const keepAvatar = (url?: string | null) => (url && url.startsWith('data:image/jpeg') ? url : '');

/** Downscale to a small JPEG so the application stays well under Firestore's doc limit. */
function toSmallJpeg(img: CanvasImageSource, w: number, h: number, max = 480, bg?: string): string {
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const ctx = c.getContext('2d')!;
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.86);
}

export const SummitSpeakerPortalModal: React.FC<SummitSpeakerPortalModalProps> = ({
  isOpen,
  onClose,
  onSpeakerRegistered,
  initialSpeaker,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { user: authUser } = useAuth();

  const [name, setName] = useState<string>(initialSpeaker?.name || authUser?.displayName || '');
  const [handle, setHandle] = useState<string>(initialSpeaker?.handle || '');
  const [role, setRole] = useState<string>(initialSpeaker?.role || '');
  const [organization, setOrganization] = useState<string>(initialSpeaker?.organization || '');
  const [bio, setBio] = useState<string>(initialSpeaker?.bio || '');
  const [day, setDay] = useState<number>(initialSpeaker?.day || 1);
  const [pillarId, setPillarId] = useState<SummitPillarId>(initialSpeaker?.pillarId || 'SGX.STORY');
  const [avatarUrl, setAvatarUrl] = useState<string>(keepAvatar(initialSpeaker?.avatarUrl));
  const isKeynote = initialSpeaker?.isKeynote || false; // set only by the organizers
  const [isAwakenInitiate, setIsAwakenInitiate] = useState<boolean>(initialSpeaker?.isAwakenInitiate ?? true);
  const awakenRank = initialSpeaker?.awakenRank || 'AWAKEN_STATUS';

  const [twitter, setTwitter] = useState<string>(initialSpeaker?.socialLinks?.twitter || '');
  const [linkedin, setLinkedin] = useState<string>(initialSpeaker?.socialLinks?.linkedin || '');
  const instagram = initialSpeaker?.socialLinks?.instagram || '';
  const [github, setGithub] = useState<string>(initialSpeaker?.socialLinks?.github || '');
  const [portfolio, setPortfolio] = useState<string>(initialSpeaker?.socialLinks?.portfolio || '');
  const [logo, setLogo] = useState<string>(initialSpeaker?.socialLinks?.logo || '');
  const roblox = initialSpeaker?.socialLinks?.roblox || '';

  // Avatar builder view (inside the same dialog)
  const pillar = findPillar(pillarId) || SGX_PILLARS[0];
  const accent = PILLAR_ACCENT[pillar.key];
  const [building, setBuilding] = useState(false);
  const [pilot, setPilot] = useState<PilotConfig>(() => configFromSeed(initialSpeaker?.id || name || 'speaker', accent));
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdSpeaker, setCreatedSpeaker] = useState<SummitSpeaker | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  if (!isOpen) return null;

  const publicPortalUrl = `${window.location.origin}/summit?speaker-register=true`;

  const handleCopyPortalLink = () => {
    navigator.clipboard?.writeText(publicPortalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = (es ? `¡Hola! Te invito a registrar tu perfil de Speaker / Artista para el Spatialgineers Summit 2026 (Dic 11-13): ${publicPortalUrl}` : `Hi! You're invited to register your Speaker / Artist profile for the Spatialgineers Summit 2026 (Dec 11-13): ${publicPortalUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTwitter = () => {
    const text = (es ? `Registra tu perfil de Speaker / Artista para el @Spatialgineers Summit 2026: ${publicPortalUrl}` : `Register your Speaker / Artist profile for the @Spatialgineers Summit 2026: ${publicPortalUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const renderAvatar = async (c: PilotConfig) => toSmallJpeg(await pilotImage(c, 400), 400, 480, 400, '#0b0d12');
  const applyPilot = async () => {
    try {
      setAvatarUrl(await renderAvatar(pilot));
      playUiChirp(980);
      setBuilding(false);
    } catch {
      setPhotoError(es ? 'No pudimos generar el avatar. Inténtalo de nuevo.' : "We couldn't render the avatar. Try again.");
      setBuilding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !organization.trim()) {
      setSubmitError((es ? 'Por favor completa todos los campos obligatorios (Nombre, Rol y Organización).' : 'Please fill in all required fields (Name, Role and Organization).'));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const speakerId = initialSpeaker?.id || `spk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const speakerPayload: SummitSpeaker = {
        id: speakerId,
        name: name.trim(),
        handle: handle.trim() ? (handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`) : undefined,
        role: role.trim(),
        organization: organization.trim(),
        avatarUrl: avatarUrl || await renderAvatar(pilot),
        bio: bio.trim() || (es ? 'Postulación pendiente de confirmación.' : 'Application pending confirmation.'),
        pillarId,
        day,
        isKeynote: false, // keynotes are confirmed by the organizers, never self-declared
        isAwakenInitiate,
        awakenRank,
        socialLinks: {
          twitter: twitter.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
          instagram: instagram.trim() || undefined,
          github: github.trim() || undefined,
          portfolio: portfolio.trim() || undefined,
          logo: logo.trim() || undefined,
          roblox: roblox.trim() || undefined,
        }
      };

      const registered = await registerSpeakerProfile(speakerPayload);
      // Their speaker Holo Card shows "in review" until the team approves it.
      savePendingCredential('speaker', {
        name: registered.name, title: registered.role, org: registered.organization,
        topic: registered.day ? (es ? `Día ${registered.day}` : `Day ${registered.day}`) : undefined,
        pillar: findPillar(registered.pillarId)?.key ?? null, photo: registered.avatarUrl || null, handle: registered.handle,
      });
      setCreatedSpeaker(registered);
      playNotificationChime();
      onSpeakerRegistered?.(registered);
    } catch (err: any) {
      setSubmitError(err?.message || (es ? 'No pudimos enviar tu perfil. Revisa tu conexión e inténtalo de nuevo.' : "We couldn't send your profile. Check your connection and try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const dayDate = day === 1 ? '11' : day === 2 ? '12' : '13';
  const face = (url: string, alt: string) => (
    <img className="sgx-sp__face" src={url} alt={alt} />
  );

  // ---------- Avatar builder view ----------
  if (building) {
    return (
      <SgxDialog
        key="builder"
        onClose={() => setBuilding(false)}
        title={es ? 'Arma tu avatar' : 'Build your avatar'}
        kicker={es ? 'Tu imagen en el Summit: la misma para visitantes, speakers y artistas.' : 'Your picture in the Summit: the same for visitors, speakers and artists.'}
        icon={<img src="/holo/bolt.png" alt="" />}
        accent={accent}
        size="lg"
        footer={
          <>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => setBuilding(false)}><ArrowLeft size={14} aria-hidden /> {es ? 'Volver al formulario' : 'Back to the form'}</button>
            <button type="button" className="sgx-btn sgx-btn--sm" onClick={applyPilot}><Check size={14} aria-hidden /> {es ? 'Usar este avatar' : 'Use this avatar'}</button>
          </>
        }
      >
        <div className="sgx-sp__builder">
          <PilotBuilder value={pilot} onChange={setPilot} accent={accent} callsign={name || undefined} />
        </div>
      </SgxDialog>
    );
  }

  // ---------- Success view ----------
  if (createdSpeaker) {
    return (
      <SgxDialog
        key="done"
        onClose={onClose}
        title={es ? 'Perfil recibido' : 'Profile received'}
        kicker={es ? 'El equipo lo revisa y lo publica cuando esté confirmado por escrito.' : 'The team reviews it and publishes it once confirmed in writing.'}
        icon={<img src="/holo/stage.png" alt="" />}
        size="md"
        footer={
          <>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => { setCreatedSpeaker(null); setName(''); setRole(''); setBio(''); setHandle(''); }}>
              {es ? 'Registrar otro' : 'Register another'}
            </button>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => window.dispatchEvent(new CustomEvent('sgx:open_holo_card', { detail: { role: 'speaker' } }))}>
              {es ? 'Ver mi Holo Card (en revisión)' : 'See my Holo Card (in review)'}
            </button>
            <button type="button" className="sgx-btn sgx-btn--sm" onClick={onClose}>{es ? 'Listo' : 'Done'}</button>
          </>
        }
      >
        <div className="sgx-m sgx-m-stack">
          <div className="sgx-m-note sgx-m-note--ok" role="status">
            <CheckCircle2 size={18} aria-hidden />
            <div>{es ? `Gracias, ${createdSpeaker.name}. Te escribiremos al confirmar tu participación.` : `Thanks, ${createdSpeaker.name}. We'll write to you once your participation is confirmed.`}</div>
          </div>
          <div className="sgx-m-card sgx-m-card--cyan">
            <div className="sgx-m-row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 14 }}>
              {face(createdSpeaker.avatarUrl, createdSpeaker.name)}
              <div style={{ minWidth: 0 }}>
                <h3 className="sgx-m-h">{createdSpeaker.name}</h3>
                {createdSpeaker.handle && <p className="sgx-m-fine">{createdSpeaker.handle}</p>}
                <p className="sgx-m-kicker" style={{ marginTop: 4 }}>{createdSpeaker.role}</p>
                <p className="sgx-m-fine">{createdSpeaker.organization} · {es ? 'Día' : 'Day'} {createdSpeaker.day}</p>
              </div>
            </div>
            <p className="sgx-m-p sgx-m-clamp3">{createdSpeaker.bio}</p>
          </div>
        </div>
      </SgxDialog>
    );
  }

  // ---------- Form view ----------
  return (
    <SgxDialog
      key="form"
      onClose={onClose}
      title={initialSpeaker ? (es ? 'Editar speaker' : 'Edit speaker') : (es ? 'Registro de speaker y artista' : 'Speaker & artist registration')}
      kicker={es ? 'Spatialgineers Summit 2026 · 11–13 dic' : 'Spatialgineers Summit 2026 · Dec 11–13'}
      icon={<img src="/holo/stage.png" alt="" />}
      size="lg"
      toolbar={
        <div className="sgx-sp__share">
          <p><Share2 size={14} aria-hidden /> {es ? 'Invita a otros speakers con este enlace:' : 'Invite other speakers with this link:'}</p>
          <div className="sgx-m-row">
            <button type="button" className="sgx-btn sgx-btn--sm" onClick={handleCopyPortalLink}>
              {copiedLink ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copiedLink ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar enlace' : 'Copy link')}
            </button>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={handleShareWhatsApp} aria-label={es ? 'Compartir por WhatsApp' : 'Share on WhatsApp'}>
              <MessageCircle size={14} aria-hidden /> WhatsApp
            </button>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={handleShareTwitter} aria-label={es ? 'Compartir en X' : 'Share on X'}>
              <Send size={14} aria-hidden /> X
            </button>
          </div>
        </div>
      }
      footer={
        <>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={onClose}>{es ? 'Cancelar' : 'Cancel'}</button>
          <button type="submit" form="sgx-speaker-form" className="sgx-btn sgx-btn--sm" disabled={isSubmitting}>
            {isSubmitting ? (es ? 'Enviando…' : 'Sending…') : initialSpeaker ? (es ? 'Guardar cambios' : 'Save changes') : (es ? 'Enviar para revisión' : 'Send for review')}
          </button>
        </>
      }
    >
      <form id="sgx-speaker-form" onSubmit={handleSubmit} className="sgx-m sgx-m-stack">
        {submitError && (
          <div className="sgx-m-note sgx-m-note--warn" role="alert">
            <AlertTriangle size={18} aria-hidden />
            <div>{submitError}</div>
          </div>
        )}

        <div className="sgx-sp">
          <div className="sgx-sp__col">
            <div className="sgx-m-grid--2 sgx-m-grid">
              <label className="sgx-m-field">
                <span>{es ? 'Nombre o nombre artístico' : 'Name or artist name'} <em>*</em></span>
                <input className="sgx-m-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder={es ? 'Ej: Sofía Chen' : 'E.g. Sofía Chen'} autoComplete="name" />
              </label>
              <label className="sgx-m-field">
                <span>{es ? 'Usuario (@)' : 'Handle (@)'}</span>
                <input className="sgx-m-input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@sofiachen_xr" />
              </label>
              <label className="sgx-m-field">
                <span>{es ? 'Rol o título' : 'Role or title'} <em>*</em></span>
                <input className="sgx-m-input" required value={role} onChange={(e) => setRole(e.target.value)} placeholder={es ? 'Ej: Artista de shaders y VJ' : 'E.g. Shader artist & VJ'} />
              </label>
              <label className="sgx-m-field">
                <span>{es ? 'Organización o colectivo' : 'Organization or collective'} <em>*</em></span>
                <input className="sgx-m-input" required value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder={es ? 'Ej: Estudio independiente' : 'E.g. Independent studio'} autoComplete="organization" />
              </label>
              <label className="sgx-m-field">
                <span>{es ? 'Día del Summit' : 'Summit day'}</span>
                <select className="sgx-m-input" value={day} onChange={(e) => setDay(Number(e.target.value))}>
                  <option value={1}>{es ? 'Día 1 · Vie 11 dic · Digital: pilares e Initiates' : 'Day 1 · Fri Dec 11 · Digital: pillars and Initiates'}</option>
                  <option value={2}>{es ? 'Día 2 · Sáb 12 dic · Digital: Día de la Industria' : 'Day 2 · Sat Dec 12 · Digital: Industry Day'}</option>
                  <option value={3}>{es ? 'Día 3 · Dom 13 dic · SGX Showcase en Chroma Space Studios (por invitación)' : 'Day 3 · Sun Dec 13 · SGX Showcase at Chroma Space Studios (by invitation)'}</option>
                </select>
              </label>
              <label className="sgx-m-field">
                <span>{es ? 'Pilar SGX' : 'SGX pillar'}</span>
                <select className="sgx-m-input" value={pillarId} onChange={(e) => setPillarId(e.target.value as SummitPillarId)}>
                  {SGX_PILLARS.map((p) => <option key={p.id} value={p.id}>{p.name} · {bi(p.title, language)}</option>)}
                </select>
              </label>
            </div>

            <label className={`sgx-m-check ${isAwakenInitiate ? 'is-on' : ''}`}>
              <input type="checkbox" checked={isAwakenInitiate} onChange={(e) => setIsAwakenInitiate(e.target.checked)} />
              <span>{es ? 'Soy recluta o Initiate del SGX Guild (candidato a la Ranked Trials Pitch Session).' : "I'm an SGX Guild recruit or Initiate (candidate for the Ranked Trials Pitch Session)."}</span>
            </label>

            <label className="sgx-m-field">
              <span className="sgx-m-row sgx-m-row--between">{es ? 'Biografía y lo que presentarás' : 'Bio and what you will present'} <small className="sgx-m-fine">{bio.length} / 2500</small></span>
              <textarea className="sgx-m-input" rows={4} maxLength={2500} value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder={es ? 'Tu trayectoria y tu trabajo en WebXR, computación espacial, shaders o arte generativo…' : 'Your background and your work in WebXR, spatial computing, shaders or generative art…'} />
            </label>

            <fieldset className="sgx-m-stack" style={{ gap: 8, border: 0, margin: 0, padding: 0 }}>
              <legend className="sgx-m-label" style={{ marginBottom: 6 }}>{es ? 'Enlaces (opcional)' : 'Links (optional)'}</legend>
              <div className="sgx-m-grid sgx-m-grid--2">
                <input className="sgx-m-input" type="url" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} aria-label={es ? 'Sitio web o portafolio' : 'Website or portfolio'} placeholder={es ? 'Sitio web o portafolio (https://…)' : 'Website or portfolio (https://…)'} />
                <input className="sgx-m-input" type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} aria-label={es ? 'Perfil de X' : 'X profile'} placeholder={es ? 'Perfil de X (URL)' : 'X profile (URL)'} />
                <input className="sgx-m-input" type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} aria-label={es ? 'Perfil de LinkedIn' : 'LinkedIn profile'} placeholder={es ? 'Perfil de LinkedIn (URL)' : 'LinkedIn profile (URL)'} />
                <input className="sgx-m-input" type="url" value={github} onChange={(e) => setGithub(e.target.value)} aria-label={es ? 'GitHub o ArtStation' : 'GitHub or ArtStation'} placeholder={es ? 'GitHub o ArtStation (URL)' : 'GitHub or ArtStation (URL)'} />
                <input className="sgx-m-input" type="url" value={logo} onChange={(e) => setLogo(e.target.value)} aria-label={es ? 'Enlace a tu logo o el de tu proyecto' : 'Link to your or your project logo'} placeholder={es ? 'Enlace a tu logo (https://…, PNG o SVG)' : 'Link to your logo (https://…, PNG or SVG)'} />
              </div>
            </fieldset>
          </div>

          <div className="sgx-sp__col">
            <div className="sgx-m-card">
              <p className="sgx-m-kicker">{es ? 'Tu avatar' : 'Your avatar'}</p>
              <p className="sgx-m-fine">{es ? 'En el Summit todos aparecen con su avatar SGX. Ármalo a tu gusto; si tienes un logo, pon su enlace arriba.' : 'Everyone in the Summit appears with their SGX avatar. Build yours; if you have a logo, add its link above.'}</p>
              <div className="sgx-sp__avatar-actions">
                <button type="button" className="sgx-btn sgx-btn--sm" data-probe="avatar-builder" onClick={() => { playUiChirp(760); setBuilding(true); }}>
                  <UserRound size={14} aria-hidden /> {avatarUrl ? (es ? 'Editar mi avatar' : 'Edit my avatar') : (es ? 'Arma tu avatar' : 'Build your avatar')}
                </button>
              </div>
              {photoError && <p className="sgx-m-err" role="alert">{photoError}</p>}
            </div>

            <div className="sgx-m-card sgx-m-card--cyan" aria-label={es ? 'Vista previa' : 'Preview'}>
              <p className="sgx-m-kicker">{es ? 'Vista previa' : 'Preview'}</p>
              <div className="sgx-m-row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 14 }}>
                {avatarUrl ? face(avatarUrl, name || 'Speaker') : <span className="sgx-sp__face" aria-hidden="true" dangerouslySetInnerHTML={{ __html: pilotSvg(pilot, { size: 96 }) }} />}
                <div style={{ minWidth: 0 }}>
                  <h3 className="sgx-m-h" style={{ overflowWrap: 'anywhere' }}>{name || (es ? 'Tu nombre' : 'Your name')}</h3>
                  {handle && <p className="sgx-m-fine">{handle}</p>}
                  <p className="sgx-m-kicker" style={{ marginTop: 4, overflowWrap: 'anywhere' }}>{role || (es ? 'Rol o especialidad' : 'Role or specialty')}</p>
                  <p className="sgx-m-fine">{organization || (es ? 'Organización' : 'Organization')}</p>
                  {isKeynote && <span className="sgx-m-tag sgx-m-tag--solid">Keynote</span>}
                </div>
              </div>
              <p className="sgx-m-p sgx-m-clamp3">{bio || (es ? 'Tu biografía aparecerá aquí. El equipo publica en el cartel solo a quien esté confirmado por escrito.' : 'Your bio will appear here. The team only adds people confirmed in writing to the lineup.')}</p>
              <div className="sgx-m-row sgx-m-row--between">
                <span className="sgx-m-tag" style={{ color: accent, boxShadow: `inset 0 0 0 1px ${accent}` }}>{pillar.name}</span>
                <span className="sgx-m-fine">{es ? `Día ${day} · ${dayDate} dic` : `Day ${day} · Dec ${dayDate}`}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </SgxDialog>
  );
};
