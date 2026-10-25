import React from 'react';
import { LogIn, ShieldAlert, Tv, Vote, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageRoute } from '../common/HeaderNav';
import { GoogleSignInButton } from '../common/GoogleSignInButton';

interface AdminAuthGuardProps {
  onNavigate: (page: PageRoute) => void;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ onNavigate }) => {
  const { signInWithGoogle, loading, authError } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 font-mono select-none">
      <div
        className="max-w-md w-full p-6 md:p-8 bg-[#121212]/95 border-2 border-[var(--sgx-accent)] shadow-2xl shadow-[var(--sgx-accent)]/10 space-y-6 text-center relative"
        style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
      >
        {/* Top Tactical Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-xl bg-[var(--sgx-bg)] border-2 border-[var(--sgx-accent)] flex items-center justify-center relative shadow-lg shadow-[var(--sgx-accent)]/20">
          <ShieldAlert className="w-8 h-8 text-[var(--sgx-accent)] animate-pulse" />
        </div>

        <div>
          <span className="text-[10px] text-[var(--sgx-accent)] font-bold uppercase tracking-widest block mb-1">
            PROTECCIÓN DE ROL • FIREBASE AUTH
          </span>
          <h2 className="text-xl font-extrabold text-white font-['Orbitron',sans-serif] uppercase tracking-wider">
            ACCESO DE DIRECTOR SGX
          </h2>
          <p className="text-xs text-slate-300 font-sans leading-relaxed mt-2">
            Inicia sesión con la cuenta autorizada de Director (<strong className="text-[var(--sgx-accent)] font-mono">info@spatialgineers.com</strong>) para acceder al control de transmisión, moderación y telemetría en vivo.
          </p>
        </div>

        {/* PRIMARY ACTION: Pure Firebase Auth with Google Popup */}
        <div className="pt-2">
          <GoogleSignInButton
            buttonText="INICIAR SESIÓN CON GOOGLE"
            variant="tactical"
          />
        </div>

        {/* Alternative Public Navigation for Non-Admins */}
        <div className="pt-4 border-t border-[var(--sgx-secondary)]/60 space-y-3">
          <span className="text-[10px] text-slate-400 block uppercase">
            O navega a los módulos públicos:
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigate('stage')}
              className="p-2.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-left space-y-1 transition-all group"
            >
              <div className="flex items-center space-x-1.5 text-[var(--sgx-neon)] text-xs font-bold">
                <Tv className="w-3.5 h-3.5" />
                <span>STAGE OUTPUT</span>
              </div>
              <span className="text-[9px] text-slate-400 block font-sans">
                Ver escenario 3D en vivo
              </span>
            </button>

            <button
              onClick={() => onNavigate('play')}
              className="p-2.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-accent)] text-left space-y-1 transition-all group"
            >
              <div className="flex items-center space-x-1.5 text-[var(--sgx-accent)] text-xs font-bold">
                <Vote className="w-3.5 h-3.5" />
                <span>PLAY & VOTE</span>
              </div>
              <span className="text-[9px] text-slate-400 block font-sans">
                Participar como audiencia
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

