import React, { useState, useEffect } from 'react';
import { X, Sparkles, Ticket, Award } from 'lucide-react';
import { playUiChirp, playCyberBurstSound } from '../../lib/cyberAudioEngine';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { useAuth } from '../../context/AuthContext';
import { SgxNativeCredentialStudio } from './SgxNativeCredentialStudio';

export interface HoloCardProfile {
  name?: string;
  title?: string;
  jobtitle?: string;
  org?: string;
  topic?: string;
  handle?: string;
  photoUrl?: string;
  role?:
    | 'SPEAKER'
    | 'INITIATE'
    | 'SPONSOR'
    | 'VISITANTE'
    | 'VISITOR'
    | 'speaker'
    | 'initiate'
    | 'sponsor'
    | 'visitante'
    | 'visitor';
  portfolio?: string;
  studio?: string;
  bio?: string;
  tier?: string;
  num?: string;
  passType?: string;
  ticketCode?: string;
}

interface SgxHoloCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile?: HoloCardProfile | null;
}

export function resolveStoredUserHoloProfile(
  explicitProfile?: HoloCardProfile | null,
  fallbackNickname?: string,
  fallbackRole?: string | null,
  fallbackAvatar?: string | null
): HoloCardProfile {
  if (explicitProfile && (explicitProfile.name || explicitProfile.role)) {
    return explicitProfile;
  }
  try {
    const savedPassRaw = localStorage.getItem('sgx_summit_registered_pass');
    const savedAvatar =
      localStorage.getItem('sgx_attendee_avatar_png') ||
      fallbackAvatar ||
      undefined;
    if (savedPassRaw) {
      const pass = JSON.parse(savedPassRaw);
      if (pass && pass.fullName) {
        return {
          role: 'visitante',
          name: pass.fullName,
          jobtitle: pass.roleTitle || 'VISITANTE CON PASAPORTE SUMMIT',
          org: pass.organization || 'SPATIALGINEERS SUMMIT',
          passType:
            pass.ticketType === 'SHOWCASE_PHYSICAL' ? 'showcase' : 'digital',
          ticketCode: pass.referenceCode || '',
          photoUrl: savedAvatar
        };
      }
    }
    if (fallbackNickname) {
      return {
        role: 'visitante',
        name: fallbackNickname,
        jobtitle: fallbackRole
          ? `RUTA ${fallbackRole.toUpperCase()}`
          : 'VISITANTE CON PASAPORTE SUMMIT',
        org: 'SPATIALGINEERS SUMMIT 2026',
        passType: 'digital',
        photoUrl: savedAvatar
      };
    }
  } catch {
    // ignore storage errors
  }
  return explicitProfile || {};
}

export const SgxHoloCardGeneratorModal: React.FC<
  SgxHoloCardGeneratorModalProps
> = ({ isOpen, onClose, initialProfile }) => {
  const { profile: pilotProfile } = usePilotProfile();
  const { playerProfile, user } = useAuth();
  const [activeProfile, setActiveProfile] = useState<HoloCardProfile | null>(
    null
  );

  const resolvedProfile = resolveStoredUserHoloProfile(
    activeProfile || initialProfile,
    playerProfile?.nickname || user?.displayName || undefined,
    pilotProfile?.selectedRole,
    playerProfile?.avatar || (user as any)?.photoURL
  );

  useEffect(() => {
    if (isOpen) {
      playCyberBurstSound();
      setActiveProfile(initialProfile || null);
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen bg-[#0A0A0A]/95 backdrop-blur-xl flex flex-col p-0 m-0 overflow-hidden animate-fadeIn">
      {/* Top Holographic Studio Header Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2.5 bg-[#121212] border-b border-cyan-500/40 shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm md:text-base font-black text-white font-['Orbitron',sans-serif] uppercase tracking-wider flex items-center gap-2">
              <span>SGX 3D Credential & Holo Card Studio</span>
              <span className="text-[10px] px-2 py-0.5 bg-[#FDCC0D]/15 border border-[#FDCC0D]/50 text-[#FDCC0D] font-mono hidden sm:inline">
                +150 XP AL EXPORTAR
              </span>
            </h2>
          </div>
        </div>

        {/* Quick Preset Role Switcher */}
        <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              playUiChirp(760);
              const visitorProf = resolveStoredUserHoloProfile(
                null,
                playerProfile?.nickname || user?.displayName || 'Visitante SGX',
                pilotProfile?.selectedRole,
                playerProfile?.avatar || (user as any)?.photoURL
              );
              setActiveProfile({
                ...visitorProf,
                role: 'visitante',
                jobtitle: 'VISITANTE CON PASAPORTE SUMMIT'
              });
            }}
            className="px-2.5 py-1 bg-[#FDCC0D]/15 hover:bg-[#FDCC0D] text-[#FDCC0D] hover:text-black border border-[#FDCC0D]/60 font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Ticket className="w-3 h-3" />
            <span>Mi Pase Visitante</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playUiChirp(780);
              setActiveProfile({
                ...resolvedProfile,
                role: 'speaker',
                jobtitle: 'PONENTE OFICIAL · SGX STAGE',
                topic: 'KEYNOTE: COMPUTACIÓN ESPACIAL & PRODUCCIÓN VIRTUAL'
              });
            }}
            className="px-2.5 py-1 bg-slate-900 hover:bg-cyan-500 text-slate-300 hover:text-black border border-white/15 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Modo Speaker
          </button>

          <button
            type="button"
            onClick={() => {
              playUiChirp(800);
              setActiveProfile({
                ...resolvedProfile,
                role: 'initiate',
                jobtitle: 'INICIADO OFICIAL · SGX GUILD',
                topic: 'SGX GUILD RANKED TRIALS PITCH SESSION'
              });
            }}
            className="px-2.5 py-1 bg-slate-900 hover:bg-cyan-500 text-slate-300 hover:text-black border border-white/15 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Modo Guild
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            playUiChirp(700);
            onClose();
          }}
          className="px-3 py-1.5 bg-slate-800/90 hover:bg-rose-600 border border-slate-700 hover:border-rose-400 text-slate-200 hover:text-white transition-colors text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
          <span>CERRAR</span>
        </button>
      </div>

      {/* Scrollable Native 3D Credential Studio Body */}
      <div className="flex-1 w-full overflow-y-auto">
        <SgxNativeCredentialStudio
          initialProfile={resolvedProfile}
          isModal={true}
        />
      </div>
    </div>
  );
};
