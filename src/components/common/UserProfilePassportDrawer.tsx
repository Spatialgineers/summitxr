import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  ShieldAlert, 
  Trophy, 
  Ticket, 
  Sparkles, 
  Compass, 
  ExternalLink, 
  Edit3, 
  Check, 
  LogIn, 
  LogOut, 
  Flame, 
  Zap, 
  Award, 
  QrCode, 
  Palette, 
  ChevronRight, 
  Layers, 
  Activity, 
  Shield, 
  Star,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { PageRoute } from './HeaderNav';
import { GoogleSignInButton } from './GoogleSignInButton';

interface UserProfilePassportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageRoute) => void;
  onOpenPassportModal?: () => void;
  onOpenTicketModal?: () => void;
  onOpenAvatarGenerator?: () => void;
  onOpenRewardsStore?: () => void;
  onOpenQrScanner?: () => void;
}

export const UserProfilePassportDrawer: React.FC<UserProfilePassportDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenPassportModal,
  onOpenTicketModal,
  onOpenAvatarGenerator,
  onOpenRewardsStore,
  onOpenQrScanner
}) => {
  const { 
    user, 
    playerProfile, 
    isAdmin, 
    isSuperAdmin, 
    signInWithGoogle, 
    signInWithEmail,
    signUpWithEmail,
    authError,
    clearAuthError,
    logout, 
    savePlayerProfile, 
    loading 
  } = useAuth();
  
  const { tenant } = useTenantTheme();
  const { profile } = usePilotProfile();

  // Email / Password Auth Form State
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authEmailInput, setAuthEmailInput] = useState('');
  const [authPassInput, setAuthPassInput] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // Editing state for nickname
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showBitacoraDetails, setShowBitacoraDetails] = useState(false);

  // Stored pass details
  const [registeredPass, setRegisteredPass] = useState<any>(null);

  // Stored quests completed
  const [completedQuests, setCompletedQuests] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      playUiChirp(780);
      setNicknameInput(playerProfile?.nickname || user?.displayName || 'Spatialgineer');

      // Check registered pass
      try {
        const passRaw = localStorage.getItem('sgx_summit_pass_registered');
        if (passRaw) {
          setRegisteredPass(JSON.parse(passRaw));
        } else {
          setRegisteredPass(null);
        }
      } catch {
        setRegisteredPass(null);
      }

      // Check completed quests
      try {
        const questsRaw = localStorage.getItem('sgx_passport_quests');
        if (questsRaw) {
          setCompletedQuests(JSON.parse(questsRaw));
        }
      } catch {
        setCompletedQuests({});
      }
    }
  }, [isOpen, playerProfile, user]);

  if (!isOpen) return null;

  // Gamification calculations
  const totalScore = playerProfile?.totalScore ?? 150;
  const currentLevel = Math.floor(totalScore / 150) + 1;
  const nextLevelXp = currentLevel * 150;
  const prevLevelXp = (currentLevel - 1) * 150;
  const xpInCurrentLevel = Math.max(0, totalScore - prevLevelXp);
  const levelProgressPercent = Math.min(100, Math.round((xpInCurrentLevel / 150) * 100));

  // Determine Rank Name
  let rankTier = 'Cadete Espacial';
  let rankBadgeColor = 'text-amber-400 border-amber-500/50 bg-amber-950/40';
  if (totalScore >= 800) {
    rankTier = 'Master Spatialgineer';
    rankBadgeColor = 'text-purple-300 border-purple-500/60 bg-purple-950/50';
  } else if (totalScore >= 450) {
    rankTier = 'Ingeniero Creativo';
    rankBadgeColor = 'text-[var(--sgx-primary)] border-[var(--sgx-primary)] bg-[var(--sgx-card-bg)]';
  } else if (totalScore >= 200) {
    rankTier = 'Pionero Cyber';
    rankBadgeColor = 'text-cyan-300 border-cyan-500/60 bg-cyan-950/50';
  }

  // Quests summary
  const questKeys = ['quest_ticket', 'quest_360', 'quest_drone', 'quest_forum', 'quest_guild', 'quest_qr_networking'];
  const completedCount = questKeys.filter(k => completedQuests[k]).length;

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;
    setIsSavingName(true);
    try {
      await savePlayerProfile({
        nickname: nicknameInput.trim()
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditingNickname(false);
      }, 800);
    } catch (err) {
      console.error('Error saving nickname:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleActionClick = (action: () => void) => {
    playUiChirp(840);
    action();
  };

  const dispatchGlobalEvent = (eventName: string) => {
    window.dispatchEvent(new CustomEvent(eventName));
    onClose();
  };

  // Avatar resolution
  const userAvatar = playerProfile?.avatar || (user as any)?.photoURL;

  return (
    <div className="fixed inset-0 z-[999999] overflow-hidden flex justify-end">
      
      {/* Dark Blur Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={() => {
          playUiChirp(440);
          onClose();
        }}
      />

      {/* Slide-over Right Drawer Container */}
      <div 
        className="relative w-full max-w-md sm:max-w-lg bg-[var(--sgx-card-bg)] border-l-2 border-[var(--sgx-primary)] text-slate-100 shadow-2xl z-10 flex flex-col h-full overflow-y-auto transform transition-transform duration-300 ease-out font-sans"
        style={{
          boxShadow: '0 0 50px var(--sgx-glow)',
        }}
      >
        
        {/* Top Glowing Header */}
        <div className="p-4 sm:p-5 bg-[var(--sgx-bg)] border-b border-[var(--sgx-border)] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-2.5">
            <div 
              className="w-8 h-8 bg-[var(--sgx-card-bg)] border border-[var(--sgx-primary)] flex items-center justify-center text-[var(--sgx-primary)] shadow-sm"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <User className="w-4 h-4 text-[var(--sgx-primary)]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase text-white font-['Orbitron',sans-serif] tracking-wider flex items-center gap-1.5">
                <span>PASAPORTE & PERFIL</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[var(--sgx-primary)] text-black font-mono font-bold rounded-xs">
                  SGX ID
                </span>
              </h2>
              <span className="text-[10px] text-slate-400 font-mono block">
                Spatialgineers Summit Community Matrix
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              playUiChirp(440);
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] hover:border-[var(--sgx-primary)] transition-all cursor-pointer"
            title="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-5 flex-1 overflow-y-auto font-mono text-xs">
          
          {/* 1. Attendee Identity & Avatar Card */}
          <div 
            className="p-4 bg-[var(--sgx-bg)] border border-[var(--sgx-primary)]/80 relative overflow-hidden space-y-3.5"
            style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
          >
            {/* Ambient Background Gradient */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[var(--sgx-primary)]/10 via-[var(--sgx-secondary)]/10 to-transparent pointer-events-none rounded-full blur-2xl" />

            <div className="flex items-start gap-3.5 relative z-10">
              
              {/* Avatar Box with Edit Badge */}
              <div className="relative shrink-0">
                <div 
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--sgx-card-bg)] border-2 border-[var(--sgx-primary)] p-0.5 flex items-center justify-center overflow-hidden shadow-lg"
                  style={{ 
                    clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                    boxShadow: '0 0 15px var(--sgx-glow)'
                  }}
                >
                  {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
                      }}
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl">🚀</span>
                  )}
                </div>

                {/* Quick Avatar Studio Button */}
                <button
                  onClick={() => {
                    handleActionClick(() => {
                      if (onOpenAvatarGenerator) onOpenAvatarGenerator();
                      else dispatchGlobalEvent('sgx:open_avatar');
                    });
                  }}
                  className="absolute -bottom-1 -right-1 p-1 bg-[var(--sgx-primary)] text-black rounded-full border border-black hover:scale-110 transition-transform shadow-md cursor-pointer"
                  title="Diseñar avatar cyberpunk 3D"
                >
                  <Palette className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Identity Details */}
              <div className="flex-1 min-w-0 space-y-1">
                
                {/* Nickname & Quick Edit */}
                {isEditingNickname ? (
                  <form onSubmit={handleSaveNickname} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      placeholder="Tu apodo/alias..."
                      maxLength={24}
                      className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-primary)] px-2 py-1 text-xs text-white font-bold focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isSavingName}
                      className="p-1 bg-[var(--sgx-primary)] text-black font-bold shrink-0 hover:opacity-90"
                    >
                      {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingNickname(false)}
                      className="p-1 bg-slate-800 text-slate-300 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm sm:text-base text-white truncate font-['Orbitron',sans-serif]">
                      {playerProfile?.nickname || user?.displayName || 'Invitado Spatialgineer'}
                    </span>
                    <button
                      onClick={() => setIsEditingNickname(true)}
                      className="p-1 text-slate-400 hover:text-[var(--sgx-primary)] transition-colors cursor-pointer"
                      title="Editar nickname"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Email or Guest Status */}
                <div className="text-[11px] text-slate-400 truncate">
                  {user && !user.isAnonymous && user.email ? (
                    <span className="flex items-center gap-1 text-[var(--sgx-primary)] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-[var(--sgx-primary)] shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </span>
                  ) : (
                    <span className="text-amber-400/90 font-bold flex items-center gap-1">
                      <User className="w-3 h-3 shrink-0" />
                      <span>Sesión Temporal de Invitado</span>
                    </span>
                  )}
                </div>

                {/* Role and Rank Badge */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {isAdmin ? (
                    <span 
                      className="px-2.5 py-0.5 bg-[#FDCC0D]/20 border border-[#FDCC0D] text-[#FDCC0D] text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 shadow-sm"
                      style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FDCC0D]" />
                      <span>DIRECTOR GENERAL (SPATIALGINEERS)</span>
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase flex items-center gap-1 ${rankBadgeColor}`}
                          style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}>
                      <Sparkles className="w-3 h-3" />
                      <span>{rankTier}</span>
                    </span>
                  )}

                  <span 
                    className="px-2 py-0.5 bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] text-slate-300 text-[9px] font-bold"
                    style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                  >
                    NIVEL {currentLevel}
                  </span>
                </div>

              </div>

            </div>

            {/* Email & Auth Action Bar inside Top Card */}
            {user && !user.isAnonymous && user.email ? (
              <div className="pt-2 border-t border-[var(--sgx-border)] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 block uppercase font-mono">Email Conectado</span>
                  <span className="text-xs font-bold text-white font-mono truncate block">{user.email}</span>
                </div>
                <button
                  onClick={() => {
                    handleActionClick(() => {
                      logout();
                    });
                  }}
                  className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-200 text-[10px] font-bold uppercase flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                  title="Cerrar sesión de esta cuenta"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-[var(--sgx-border)] flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-300 font-sans">
                  Guarda tu progreso y gana <strong>+100 XP</strong>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    playUiChirp(840);
                    signInWithGoogle();
                  }}
                  disabled={loading}
                  className="px-3 py-1.5 bg-[var(--sgx-primary)] text-black font-extrabold text-[10px] uppercase flex items-center gap-1.5 shrink-0 hover:opacity-90 transition-opacity cursor-pointer shadow-md select-none active:scale-95"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>INICIAR CON GOOGLE</span>
                </button>
              </div>
            )}

          </div>

          {/* 2. Gamification XP & Level Progression */}
          <div className="p-3.5 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
                <span>EXPERIENCIA (XP):</span>
              </span>
              <span className="text-[var(--sgx-primary)] font-black text-sm font-['Orbitron',sans-serif]">
                {totalScore} XP
              </span>
            </div>

            {/* Level Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-2.5 bg-black/60 border border-[var(--sgx-border)] overflow-hidden rounded-xs p-0.5">
                <div 
                  className="h-full bg-[var(--sgx-gradient)] transition-all duration-500 rounded-xs"
                  style={{ width: `${levelProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Nivel {currentLevel}</span>
                <span>{xpInCurrentLevel} / 150 XP ({levelProgressPercent}%)</span>
                <span>Nivel {currentLevel + 1}</span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--sgx-border)] text-center text-[10px]">
              <div className="p-1.5 bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] space-y-0.5">
                <span className="text-slate-400 block">Racha</span>
                <span className="text-amber-400 font-bold flex items-center justify-center gap-0.5">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{playerProfile?.currentStreak || 1}x</span>
                </span>
              </div>

              <div className="p-1.5 bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] space-y-0.5">
                <span className="text-slate-400 block">Multiplicador</span>
                <span className="text-[var(--sgx-primary)] font-bold flex items-center justify-center gap-0.5">
                  <Zap className="w-3 h-3 text-[var(--sgx-primary)]" />
                  <span>{playerProfile?.multiplier || 1.0}x</span>
                </span>
              </div>

              <div className="p-1.5 bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] space-y-0.5">
                <span className="text-slate-400 block">Votos & Q&A</span>
                <span className="text-cyan-400 font-bold">
                  {playerProfile?.totalInteractions || 1}
                </span>
              </div>
            </div>

            {/* Inline Weekend Activity Log & Bitácora Toggle */}
            <button
              onClick={() => {
                playUiChirp(620);
                setShowBitacoraDetails(!showBitacoraDetails);
              }}
              className="w-full py-2 px-3 bg-gradient-to-r from-cyan-950/80 to-purple-950/80 hover:from-cyan-900 hover:to-purple-900 border border-cyan-500/50 text-cyan-200 text-xs font-bold transition-all flex items-center justify-between gap-2 rounded shadow-lg cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>BITÁCORA DE ACTIVIDAD (3 DÍAS)</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-cyan-400 transition-transform ${showBitacoraDetails ? 'rotate-90' : ''}`} />
            </button>

            {showBitacoraDetails && (
              <div className="p-3 bg-slate-950/90 border border-cyan-500/30 rounded text-xs font-mono space-y-2 animate-fadeIn">
                <div className="text-[10px] uppercase font-bold text-cyan-400">Historial de Interacciones & Eventos</div>
                {profile?.weekendActivity && profile.weekendActivity.length > 0 ? (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {profile.weekendActivity.map((act) => (
                      <div key={act.id} className="p-1.5 bg-[#171717] border border-slate-800 flex justify-between items-center text-[11px]">
                        <div>
                          <span className="text-white font-bold block">{act.title}</span>
                          <span className="text-[9px] text-slate-400 uppercase">{act.day?.replace('_', ' ') || 'DÍA 1'} • {act.category}</span>
                        </div>
                        <span className="text-[var(--sgx-neon)] font-bold">+{act.points} XP</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-[11px]">Explora el mapa 360°, vota en la Arena 3D o completa misiones para registrar eventos en tu bitácora.</p>
                )}
              </div>
            )}
          </div>

          {/* 3. Event Pass & Ticket Status Card */}
          <div className="p-3.5 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
                <span>PASE OFICIAL DEL SUMMIT</span>
              </span>

              {registeredPass ? (
                <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>ACREDITADO</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold">
                  SIN REGISTRAR
                </span>
              )}
            </div>

            {registeredPass ? (
              <div className="p-2 bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] text-[11px] space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Tipo:</span>
                  <span className="text-[var(--sgx-primary)] font-bold">{registeredPass.tierName || 'Pase General Digital'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">ID Pase:</span>
                  <span className="font-mono text-white">{registeredPass.passId || '#SGX-PASS-LIVE'}</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-sans">
                Acredítate para recibir tu entrada digital en PDF, badge de acceso y <strong>+250 XP</strong>.
              </p>
            )}

            <button
              onClick={() => {
                handleActionClick(() => {
                  if (onOpenTicketModal) onOpenTicketModal();
                  else dispatchGlobalEvent('sgx:open_ticket');
                });
              }}
              className="w-full py-1.5 px-3 bg-[var(--sgx-card-bg)] hover:bg-slate-800 border border-[var(--sgx-secondary)] hover:border-[var(--sgx-primary)] text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
              <span>{registeredPass ? 'VER O DESCARGAR MI PASE' : 'OBTENER PASE AHORA (+250 XP)'}</span>
            </button>
          </div>

          {/* 4. Quests & Passport Summary */}
          <div className="p-3.5 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
                <span>MISIONES DE PASAPORTE DE SUMMIT</span>
              </span>
              <span className="text-[11px] text-[var(--sgx-primary)] font-bold">
                {completedCount} / 6 Completadas
              </span>
            </div>

            {/* Quests full list */}
            <div className="space-y-1.5">
              {[
                { key: 'quest_ticket', label: 'Acreditación Oficial (+250 XP)', icon: Ticket },
                { key: 'quest_360', label: 'Explorador Espacial 360° (+200 XP)', icon: Compass },
                { key: 'quest_drone', label: 'Piloto Simulador de Dron (+200 XP)', icon: Activity },
                { key: 'quest_forum', label: 'Participación en Foros del Summit (+200 XP)', icon: Layers },
                { key: 'quest_guild', label: 'Invocación de Initiates (+200 XP)', icon: Star },
                { key: 'quest_qr_networking', label: 'Networking QR San Juan (+250 XP)', icon: QrCode },
              ].map((q) => {
                const isDone = Boolean(completedQuests[q.key]);
                const Icon = q.icon;
                return (
                  <div 
                    key={q.key} 
                    className={`p-2 border flex items-center justify-between text-[11px] transition-colors ${
                      isDone 
                        ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200' 
                        : 'bg-[var(--sgx-card-bg)] border-[var(--sgx-border)] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isDone ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="truncate">{q.label}</span>
                    </div>
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">Pendiente</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Direct Navigation Portal Shortcuts */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Accesos Directos a la Plataforma:
            </span>

            {/* Primary Action: Go to Audience PWA / Profile Page */}
            <button
              onClick={() => {
                handleActionClick(() => {
                  onNavigate('play');
                  onClose();
                });
              }}
              className="sgx-btn w-full py-2.5 px-4 text-xs font-bold uppercase flex items-center justify-between shadow-lg cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>IR A MI PÁGINA DE PERFIL (/play)</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              {/* Rewards Store */}
              <button
                onClick={() => {
                  handleActionClick(() => {
                    if (onOpenRewardsStore) onOpenRewardsStore();
                    else dispatchGlobalEvent('sgx:open_rewards');
                  });
                }}
                className="p-2 bg-[var(--sgx-bg)] hover:bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] hover:border-[var(--sgx-primary)] text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
                <span className="truncate">Canjear XP</span>
              </button>

              {/* Avatar Studio */}
              <button
                onClick={() => {
                  handleActionClick(() => {
                    if (onOpenAvatarGenerator) onOpenAvatarGenerator();
                    else dispatchGlobalEvent('sgx:open_avatar');
                  });
                }}
                className="p-2 bg-[var(--sgx-bg)] hover:bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] hover:border-[var(--sgx-primary)] text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
                <span className="truncate">Avatar Studio</span>
              </button>
            </div>

            {/* QR Networking Scanner */}
            <button
              onClick={() => {
                handleActionClick(() => {
                  if (onOpenQrScanner) onOpenQrScanner();
                  else dispatchGlobalEvent('sgx:open_qr_scanner');
                });
              }}
              className="w-full p-2 bg-[var(--sgx-bg)] hover:bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] hover:border-[var(--sgx-primary)] text-slate-300 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
              <span>Escanear QR de Networking</span>
            </button>
          </div>

          {/* 6. Footer: Auth Logout / Login Action */}
          <div className="pt-3 border-t border-[var(--sgx-border)] space-y-3 font-mono">
            
            {/* Display Auth Error Notice if Any */}
            {authError && (
              <div className="p-3 bg-red-950/90 border border-red-500 text-red-200 text-xs space-y-2 rounded">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <Lock className="w-4 h-4" />
                    <span>Error de Autenticación:</span>
                  </span>
                  <button
                    type="button"
                    onClick={clearAuthError}
                    className="p-1 hover:bg-red-900 text-slate-300 hover:text-white rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed font-sans">{authError}</p>
              </div>
            )}

            {user && !user.isAnonymous && user.email ? (
              <button
                onClick={() => {
                  handleActionClick(() => {
                    logout();
                    onClose();
                  });
                }}
                className="w-full py-2.5 px-4 bg-red-950/60 hover:bg-red-900/80 border border-red-500/80 text-red-100 text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer rounded shadow-md"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>CERRAR SESIÓN ({user.email})</span>
              </button>
            ) : (
              <div className="space-y-3">
                <GoogleSignInButton
                  buttonText="INICIAR SESIÓN CON GOOGLE (+100 XP)"
                />

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(!showEmailForm)}
                    className="text-[11px] text-slate-400 hover:text-[var(--sgx-primary)] underline transition-colors cursor-pointer"
                  >
                    {showEmailForm ? 'Ocultar formulario de correo' : '¿Problemas con Google? Iniciar sesión con correo/contraseña'}
                  </button>
                </div>

                {showEmailForm && (
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!authEmailInput.trim() || !authPassInput) return;
                      setIsAuthSubmitting(true);
                      try {
                        if (isSignUpMode) {
                          await signUpWithEmail(authEmailInput.trim(), authPassInput);
                        } else {
                          await signInWithEmail(authEmailInput.trim(), authPassInput);
                        }
                      } finally {
                        setIsAuthSubmitting(false);
                      }
                    }}
                    className="p-3 bg-slate-950 border border-[var(--sgx-border)] space-y-2.5 rounded animate-fadeIn text-xs"
                  >
                    <div className="text-[10px] uppercase font-bold text-white flex justify-between">
                      <span>{isSignUpMode ? 'Crear Cuenta' : 'Ingresar con Correo'}</span>
                      <button 
                        type="button" 
                        onClick={() => setIsSignUpMode(!isSignUpMode)}
                        className="text-[var(--sgx-neon)] hover:underline"
                      >
                        {isSignUpMode ? '¿Ya tienes cuenta? Ingresar' : '¿Sin cuenta? Registrarse'}
                      </button>
                    </div>

                    <input
                      type="email"
                      placeholder="tu-correo@spatialgineers.com"
                      value={authEmailInput}
                      onChange={(e) => setAuthEmailInput(e.target.value)}
                      required
                      className="w-full p-2 bg-black border border-slate-700 text-white rounded font-mono text-xs focus:outline-none focus:border-[var(--sgx-primary)]"
                    />

                    <input
                      type="password"
                      placeholder="Contraseña (mínimo 6 caracteres)"
                      value={authPassInput}
                      onChange={(e) => setAuthPassInput(e.target.value)}
                      required
                      minLength={6}
                      className="w-full p-2 bg-black border border-slate-700 text-white rounded font-mono text-xs focus:outline-none focus:border-[var(--sgx-primary)]"
                    />

                    <button
                      type="submit"
                      disabled={isAuthSubmitting}
                      className="w-full py-2 bg-[var(--sgx-neon)] text-black font-extrabold uppercase text-xs rounded hover:opacity-90 transition-opacity"
                    >
                      {isAuthSubmitting ? 'Procesando...' : (isSignUpMode ? 'Registrar e Iniciar Sesión' : 'Iniciar Sesión')}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
