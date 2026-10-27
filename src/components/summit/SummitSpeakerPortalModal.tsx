import React, { useState } from 'react';
import { 
  User, 
  Sparkles, 
  Check, 
  Copy, 
  Share2, 
  X, 
  Award, 
  Layers, 
  Globe, 
  Calendar, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Palette
} from 'lucide-react';
import { SummitSpeaker, SummitPillarId } from '../../types/summit';
import { registerSpeakerProfile, SUMMIT_PILLARS, playNotificationChime } from '../../lib/summitData';
import { findPillar } from '../../lib/sgxPillars';
import { savePendingCredential } from '../../identity/credentials';
import { useAuth } from '../../context/AuthContext';
import { AttendeeAvatarGenerator } from './AttendeeAvatarGenerator';
import { useLanguage } from '../../context/LanguageContext';

interface SummitSpeakerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeakerRegistered?: (speaker: SummitSpeaker) => void;
  initialSpeaker?: SummitSpeaker | null;
}

export const PRESET_AVATARS = [
  { label: 'Piloto Stage & MoCap (Oro)', url: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Stage%20Icon%20BY.png' },
  { label: 'Piloto Systems & Red (Cyan)', url: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Showcase%20Icon%20BY.png' },
  { label: 'Piloto Spark & Shaders (Naranja)', url: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Spark%20Icon%20BY.png' },
  { label: 'Piloto Story & Lore (Dorado)', url: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Story%20Icon%20BY.png' },
  { label: 'Piloto SGX Guild Initiate', url: 'https://cdn.spatialgineers.com/Branding/Guild/Guild%20color.png' },
  { label: 'Insignia Spatialgineer Core', url: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png' },
];

export const SummitSpeakerPortalModal: React.FC<SummitSpeakerPortalModalProps> = ({
  isOpen,
  onClose,
  onSpeakerRegistered,
  initialSpeaker,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { user: authUser } = useAuth();

  // Form State
  const [name, setName] = useState<string>(initialSpeaker?.name || authUser?.displayName || '');
  const [handle, setHandle] = useState<string>(initialSpeaker?.handle || '');
  const [role, setRole] = useState<string>(initialSpeaker?.role || '');
  const [organization, setOrganization] = useState<string>(initialSpeaker?.organization || '');
  const [bio, setBio] = useState<string>(initialSpeaker?.bio || '');
  const [day, setDay] = useState<number>(initialSpeaker?.day || 1);
  const [pillarId, setPillarId] = useState<SummitPillarId>(initialSpeaker?.pillarId || 'SGX.STORY');
  const [avatarUrl, setAvatarUrl] = useState<string>(
    initialSpeaker?.avatarUrl || authUser?.photoURL || PRESET_AVATARS[0].url
  );
  const [isKeynote] = useState<boolean>(initialSpeaker?.isKeynote || false); // set only by the organizers
  const [isAwakenInitiate, setIsAwakenInitiate] = useState<boolean>(initialSpeaker?.isAwakenInitiate || true);
  const [awakenRank, setAwakenRank] = useState<'INITIATE' | 'AWAKEN_STATUS' | 'HONORARY_MENTION'>(
    initialSpeaker?.awakenRank || 'AWAKEN_STATUS'
  );

  // Social Links
  const [twitter, setTwitter] = useState<string>(initialSpeaker?.socialLinks?.twitter || '');
  const [linkedin, setLinkedin] = useState<string>(initialSpeaker?.socialLinks?.linkedin || '');
  const [instagram, setInstagram] = useState<string>(initialSpeaker?.socialLinks?.instagram || '');
  const [github, setGithub] = useState<string>(initialSpeaker?.socialLinks?.github || '');
  const [portfolio, setPortfolio] = useState<string>(initialSpeaker?.socialLinks?.portfolio || '');
  const [roblox, setRoblox] = useState<string>(initialSpeaker?.socialLinks?.roblox || '');

  // Character Editor Sub-Modal State
  const [isCharacterEditorOpen, setIsCharacterEditorOpen] = useState<boolean>(false);

  // Submission State
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [createdSpeaker, setCreatedSpeaker] = useState<SummitSpeaker | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showShareBar, setShowShareBar] = useState<boolean>(true);

  if (!isOpen) return null;

  const publicPortalUrl = `${window.location.origin}/summit?speaker-register=true`;

  const handleCopyPortalLink = () => {
    navigator.clipboard.writeText(publicPortalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = (es ? `¡Hola! Te invito a registrar tu perfil de Speaker / Artista para el Spatialgineers Summit 2026 (Dic 11-13): ${publicPortalUrl}` : `Hi! You're invited to register your Speaker / Artist profile for the Spatialgineers Summit 2026 (Dec 11-13): ${publicPortalUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTwitter = () => {
    const text = (es ? `Registra tu perfil de Speaker / Artista para el @Spatialgineers Summit 2026 🚀 ${publicPortalUrl}` : `Register your Speaker / Artist profile for the @Spatialgineers Summit 2026 🚀 ${publicPortalUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
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
        avatarUrl: avatarUrl || PRESET_AVATARS[0].url,
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
      setIsSuccess(true);
      playNotificationChime();

      if (onSpeakerRegistered) {
        onSpeakerRegistered(registered);
      }
    } catch (err: any) {
      setSubmitError(err?.message || (es ? 'No pudimos enviar tu perfil. Revisa tu conexión e inténtalo de nuevo.' : "We couldn't send your profile. Check your connection and try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPillarObj = SUMMIT_PILLARS.find(p => p.id === pillarId) || SUMMIT_PILLARS[0];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-neon)] max-w-4xl w-full my-auto rounded-none shadow-[0_0_50px_rgba(0, 221, 255,0.15)] flex flex-col max-h-[92vh] overflow-hidden">
          
          {/* Header */}
          <div className="bg-[var(--sgx-bg)] border-b border-[var(--sgx-secondary)] px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-none bg-[var(--sgx-neon)]/15 border border-[var(--sgx-neon)] flex items-center justify-center text-[var(--sgx-neon)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold tracking-widest text-[var(--sgx-neon)] uppercase">
                    SGX LIVE // PORTAL SELF-SERVICE
                  </span>
                  <span className="bg-[var(--sgx-accent)]/20 text-[var(--sgx-accent)] text-[9px] px-2 py-0.5 font-mono font-bold border border-[var(--sgx-accent)]/40 uppercase">
                    {es ? 'DICIEMBRE 11-13, 2026' : 'DECEMBER 11-13, 2026'}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-white font-['Orbitron',sans-serif]">
                  {es ? 'REGISTRO DE SPEAKER & ARTISTA' : 'SPEAKER & ARTIST REGISTRATION'}
                </h2>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Public Shareable Link Invitation Banner */}
          {showShareBar && !isSuccess && (
            <div className="bg-[var(--sgx-neon)]/10 border-b border-[var(--sgx-neon)]/30 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center space-x-2 text-slate-300">
                <Share2 className="w-4 h-4 text-[var(--sgx-neon)]" />
                <span>{es ? 'Enlace público para invitar a tus speakers/artistas a registrarse:' : 'Public link to invite your speakers/artists to register:'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyPortalLink}
                  className="bg-black/60 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] px-3 py-1 text-[11px] font-bold hover:bg-[var(--sgx-neon)] hover:text-black transition-colors flex items-center space-x-1.5"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? '¡COPIADO!' : (es ? 'COPIAR ENLACE' : 'COPY LINK')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="bg-[#25D366]/20 border border-[#25D366]/60 text-[#25D366] px-2.5 py-1 text-[11px] font-bold hover:bg-[#25D366] hover:text-black transition-colors"
                  title={es ? 'Compartir por WhatsApp' : 'Share on WhatsApp'}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleShareTwitter}
                  className="bg-[#1DA1F2]/20 border border-[#1DA1F2]/60 text-[#1DA1F2] px-2.5 py-1 text-[11px] font-bold hover:bg-[#1DA1F2] hover:text-white transition-colors"
                  title={es ? 'Compartir por X (Twitter)' : 'Share on X (Twitter)'}
                >
                  X / Twitter
                </button>
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="p-5 overflow-y-auto flex-1 space-y-6">
            
            {isSuccess && createdSpeaker ? (
              /* SUCCESS CONFIRMATION VIEW */
              <div className="space-y-6 text-center py-6 max-w-lg mx-auto">
                <div className="w-16 h-16 mx-auto bg-amber-500/20 border border-[#FDCC0D] text-[#FDCC0D] flex items-center justify-center rounded-none shadow-[0_0_20px_rgba(253,204,13,0.3)]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-xs font-mono text-[#FDCC0D] font-bold uppercase tracking-widest">
                    {es ? 'PERFIL RECIBIDO · EL EQUIPO LO REVISA Y LO PUBLICA' : 'PROFILE RECEIVED · THE TEAM REVIEWS AND PUBLISHES IT'}
                  </span>
                  <h3 className="text-xl font-bold text-white font-['Orbitron',sans-serif] mt-1">
                    {createdSpeaker.name}
                  </h3>
                  <p className="text-xs text-slate-300 font-mono mt-1">
                    {createdSpeaker.role} // {createdSpeaker.organization}
                  </p>
                </div>

                {/* Holographic Card Preview Badge */}
                <div className="bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-4 text-left relative overflow-hidden">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={createdSpeaker.avatarUrl} 
                      alt={createdSpeaker.name}
                      className="w-14 h-14 object-cover border border-[var(--sgx-neon)] shrink-0"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white font-['Orbitron',sans-serif]">{createdSpeaker.name}</span>
                        {createdSpeaker.handle && (
                          <span className="text-[10px] text-slate-400 font-mono">{createdSpeaker.handle}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--sgx-neon)] font-mono">{createdSpeaker.role}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{createdSpeaker.organization}{es ? ' • Día ' : ' • Day '}{createdSpeaker.day}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--sgx-secondary)] text-xs text-slate-300 line-clamp-2">
                    {createdSpeaker.bio}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('sgx:open_holo_card', { detail: { role: 'speaker' } }));
                    }}
                    className="w-full sm:w-auto bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500 hover:text-black font-bold px-5 py-2.5 text-xs font-mono transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg shadow-cyan-500/10"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{es ? 'Ver mi Holo Card (en revisión)' : 'See my Holo Card (in review)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSuccess(false);
                      onClose();
                    }}
                    className="w-full sm:w-auto sgx-btn text-xs font-bold px-6 py-2.5 cursor-pointer"
                  >
                    {es ? 'VER EN AGENDA' : 'VIEW IN AGENDA'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSuccess(false);
                      setName('');
                      setRole('');
                      setBio('');
                      setHandle('');
                    }}
                    className="w-full sm:w-auto bg-black/60 border border-[var(--sgx-secondary)] text-slate-300 px-5 py-2.5 text-xs font-mono hover:text-white hover:border-white transition-colors cursor-pointer"
                  >
                    {es ? 'REGISTRAR OTRO' : 'REGISTER ANOTHER'}
                  </button>
                </div>
              </div>
            ) : (
              /* REGISTRATION FORM */
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {submitError && (
                  <div className="bg-rose-950/40 border border-rose-500/80 p-3 text-xs font-mono text-rose-200 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Form Inputs (7 cols) */}
                  <div className="lg:col-span-7 space-y-4 font-mono text-xs">
                    
                    {/* Name & Handle */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">
                          {es ? 'Nombre Completo / Artista ' : 'Full Name / Artist '}<span className="text-[var(--sgx-neon)]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={es ? 'Ej: Sofía Chen / CyberArtist' : 'E.g. Sofía Chen / CyberArtist'}
                          className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2.5 text-white focus:outline-none focus:border-[var(--sgx-neon)] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">
                          Handle / Alias (@)
                        </label>
                        <input
                          type="text"
                          value={handle}
                          onChange={(e) => setHandle(e.target.value)}
                          placeholder="@sofiachen_xr"
                          className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2.5 text-white focus:outline-none focus:border-[var(--sgx-neon)] transition-colors"
                        />
                      </div>
                    </div>

                    {/* Role & Organization */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">
                          {es ? 'Rol / Título Profesional ' : 'Role / Professional Title '}<span className="text-[var(--sgx-neon)]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder={es ? 'Ej: XR Shaders Dev & VJ' : 'E.g. XR Shaders Dev & VJ'}
                          className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2.5 text-white focus:outline-none focus:border-[var(--sgx-neon)] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">
                          {es ? 'Organización / Estudio / Colectivo ' : 'Organization / Studio / Collective '}<span className="text-[var(--sgx-neon)]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          placeholder={es ? 'Ej: Spatialgineers Guild' : 'E.g. Spatialgineers Guild'}
                          className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2.5 text-white focus:outline-none focus:border-[var(--sgx-neon)] transition-colors"
                        />
                      </div>
                    </div>

                    {/* Day & Pillar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">
                          {es ? 'Día del Summit' : 'Summit Day'}
                        </label>
                        <select
                          value={day}
                          onChange={(e) => setDay(Number(e.target.value))}
                          className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2.5 text-white focus:outline-none focus:border-[var(--sgx-neon)]"
                        >
                          <option value={1}>{es ? 'Día 1: Vie 11 Dic (Digital · Pilares e Initiates)' : 'Day 1: Fri Dec 11 (Digital · Pillars and Initiates)'}</option>
                          <option value={2}>{es ? 'Día 2: Sáb 12 Dic (Digital · Día de la Industria)' : 'Day 2: Sat Dec 12 (Digital · Industry Day)'}</option>
                          <option value={3}>{es ? 'Día 3: Dom 13 Dic (SGX Showcase · Chroma Space Studios, por invitación)' : 'Day 3: Sun Dec 13 (SGX Showcase · Chroma Space Studios, by invitation)'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">
                          {es ? 'Pilar Temático SGX' : 'SGX Theme Pillar'}
                        </label>
                        <select
                          value={pillarId}
                          onChange={(e) => setPillarId(e.target.value as SummitPillarId)}
                          className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2.5 text-white focus:outline-none focus:border-[var(--sgx-neon)]"
                        >
                          {SUMMIT_PILLARS.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} - {p.tagline}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Badges & Keynote */}
                    <div className="flex flex-wrap gap-4 py-2 border-y border-[var(--sgx-secondary)]/50">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAwakenInitiate}
                          onChange={(e) => setIsAwakenInitiate(e.target.checked)}
                          className="accent-[var(--sgx-accent)]"
                        />
                        <span className="text-[11px] text-slate-200">{es ? 'Recluta o Initiate del SGX Guild (candidato a la Ranked Trials Pitch Session)' : 'SGX Guild recruit or Initiate (candidate for the Ranked Trials Pitch Session)'}</span>
                      </label>
                    </div>

                    {/* Bio */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-400 uppercase">
                          {es ? 'Biografía & Descripción del Showcase' : 'Bio & Showcase Description'}
                        </label>
                        <span className="text-[10px] text-slate-500">{bio.length} / 2500</span>
                      </div>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={es ? 'Comparte tu trayectoria, innovaciones en WebXR, computación espacial, shaders o arte generativo...' : 'Share your background and your work in WebXR, spatial computing, shaders or generative art...'}
                        className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2.5 text-white focus:outline-none focus:border-[var(--sgx-neon)] transition-colors"
                        maxLength={2500}
                      />
                    </div>

                    {/* Social Links */}
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1.5">
                        {es ? 'Enlaces Sociales & Portafolio (Opcional)' : 'Social Links & Portfolio (Optional)'}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="url"
                          value={portfolio}
                          onChange={(e) => setPortfolio(e.target.value)}
                          placeholder={es ? 'Sitio Web / Portafolio (https://...)' : 'Website / Portfolio (https://...)'}
                          className="bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-[11px]"
                        />
                        <input
                          type="url"
                          value={twitter}
                          onChange={(e) => setTwitter(e.target.value)}
                          placeholder="Twitter / X Profile URL"
                          className="bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-[11px]"
                        />
                        <input
                          type="url"
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          placeholder="LinkedIn Profile URL"
                          className="bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-[11px]"
                        />
                        <input
                          type="url"
                          value={github}
                          onChange={(e) => setGithub(e.target.value)}
                          placeholder="GitHub / ArtStation Profile URL"
                          className="bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-[11px]"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Character Editor & Live Holographic Card (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    
                    {/* Character Customization / Editor Box (NO IMAGE UPLOAD) */}
                    <div className="bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-4 space-y-3 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--sgx-neon)] uppercase font-bold flex items-center space-x-1">
                          <Palette className="w-3.5 h-3.5" />
                          <span>{es ? 'EDITOR DE PERSONAJE DE PILOTO' : 'PILOT CHARACTER EDITOR'}</span>
                        </span>
                        <span className="bg-amber-500/10 text-amber-400 text-[9px] px-2 py-0.5 font-mono font-bold border border-amber-500/30 uppercase">
                          {es ? 'Generador Vectorial' : 'Vector Generator'}
                        </span>
                      </div>

                      {/* Open Character Editor CTA Button */}
                      <button
                        type="button"
                        onClick={() => setIsCharacterEditorOpen(true)}
                        className="w-full bg-gradient-to-r from-cyan-950/80 via-[#1a1a1a] to-amber-950/80 border-2 border-[var(--sgx-neon)] hover:border-amber-400 p-4 text-center cursor-pointer transition-all hover:scale-[1.01] shadow-[0_0_20px_rgba(0, 221, 255,0.2)] flex flex-col items-center justify-center space-y-2 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--sgx-neon)]/15 border border-[var(--sgx-neon)] group-hover:border-amber-400 flex items-center justify-center text-[var(--sgx-neon)] group-hover:text-amber-400 transition-colors">
                          <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="text-xs text-white font-black font-['Orbitron',sans-serif] tracking-wider uppercase group-hover:text-[var(--sgx-neon)] transition-colors">
                          {es ? '🎨 ABRIR EDITOR DE PERSONAJE SGX' : '🎨 OPEN SGX CHARACTER EDITOR'}
                        </div>
                        <div className="text-[10px] text-slate-300 max-w-xs">
                          {es ? 'Personaliza tu casco, visor, traje y colores de pilar para tu credencial oficial.' : 'Customize your helmet, visor, suit and pillar colors for your official credential.'}
                        </div>
                      </button>

                      {/* Quick Preset Avatars Picker */}
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                          <span>{es ? 'O Elige una Insignia / Piloto Oficial:' : 'Or Choose an Official Badge / Pilot:'}</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {PRESET_AVATARS.map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setAvatarUrl(p.url)}
                              className={`aspect-square overflow-hidden border ${
                                avatarUrl === p.url ? 'border-[var(--sgx-neon)] ring-2 ring-[var(--sgx-neon)] scale-105' : 'border-slate-700 opacity-60 hover:opacity-100'
                              } transition-all`}
                              title={p.label}
                            >
                              <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live Holographic Speaker Card Preview */}
                    <div className="bg-[var(--sgx-bg)] border border-[var(--sgx-neon)]/50 p-4 space-y-3 relative overflow-hidden">
                      <div className="text-[9px] font-mono text-[var(--sgx-neon)] uppercase tracking-wider font-bold">
                        // VISTA PREVIA HOLOGRÁFICA EN VIVO
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="relative shrink-0">
                          <img 
                            src={avatarUrl || PRESET_AVATARS[0].url} 
                            alt={name || 'Speaker'} 
                            className="w-16 h-16 object-cover border border-[var(--sgx-neon)]"
                          />
                          {isKeynote && (
                            <span className="absolute -top-2 -right-2 bg-[var(--sgx-neon)] text-black text-[8px] font-mono font-bold px-1 uppercase">
                              KEYNOTE
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="text-sm font-bold text-white font-['Orbitron',sans-serif] break-words">
                            {name || (es ? 'Tu Nombre de Speaker' : 'Your Speaker Name')}
                          </div>
                          {handle && (
                            <div className="text-[10px] text-slate-400 font-mono break-all">{handle}</div>
                          )}
                          <div className="text-xs text-[var(--sgx-neon)] font-mono font-bold break-words">
                            {role || (es ? 'Rol / Especialidad' : 'Role / Specialty')}
                          </div>
                          <div className="text-[10px] text-slate-300 font-mono break-words">
                            {organization || (es ? 'Organización' : 'Organization')}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 line-clamp-2 font-mono">
                        {bio || (es ? 'Tu biografía aparecerá aquí. El equipo publica en el cartel solo a quien esté confirmado por escrito.' : 'Your bio will appear here. The team only adds people confirmed in writing to the lineup.')}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--sgx-secondary)] text-[10px] font-mono">
                        <span 
                          className="px-2 py-0.5 uppercase font-bold" 
                          style={{ color: selectedPillarObj.color, backgroundColor: `${selectedPillarObj.color}15`, border: `1px solid ${selectedPillarObj.color}40` }}
                        >
                          {selectedPillarObj.name}
                        </span>
                        <span className="text-slate-400">
                          {es ? 'Día ' : 'Day '}{day}{es ? ' (Dic ' : ' (Dec '}{day === 1 ? '11' : day === 2 ? '12' : '13'})
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--sgx-secondary)]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
                  >
                    {es ? 'CANCELAR' : 'CANCEL'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="sgx-btn text-xs font-bold px-6 py-2.5 flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <span>{es ? 'GUARDANDO EN FIRESTORE...' : 'SAVING TO FIRESTORE...'}</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{initialSpeaker ? (es ? 'GUARDAR CAMBIOS' : 'SAVE CHANGES') : (es ? 'ENVIAR PERFIL PARA REVISIÓN' : 'SEND PROFILE FOR REVIEW')}</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>

        </div>
      </div>

      {/* Embedded Character Editor Modal */}
      {isCharacterEditorOpen && (
        <AttendeeAvatarGenerator
          onClose={() => setIsCharacterEditorOpen(false)}
          onApplyAvatar={(dataUrl) => {
            setAvatarUrl(dataUrl);
            setIsCharacterEditorOpen(false);
          }}
        />
      )}
    </>
  );
};
