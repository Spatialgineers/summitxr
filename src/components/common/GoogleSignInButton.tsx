import React, { useState } from 'react';
import { RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';

interface GoogleSignInButtonProps {
  className?: string;
  onSuccess?: () => void;
  buttonText?: string;
  variant?: 'primary' | 'compact' | 'tactical';
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  className = '',
  onSuccess,
  buttonText = 'INICIAR SESIÓN CON GOOGLE',
  variant = 'primary'
}) => {
  const { signInWithGoogle, loading, authError, clearAuthError } = useAuth();
  const [isLocalProcessing, setIsLocalProcessing] = useState<boolean>(false);

  const handleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playUiChirp(680);
    clearAuthError();
    setIsLocalProcessing(true);

    try {
      await signInWithGoogle();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Google Sign-In caught in button handler:', err);
    } finally {
      setIsLocalProcessing(false);
    }
  };

  const isBusy = loading || isLocalProcessing;

  return (
    <div className={`space-y-2 font-mono ${className}`}>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isBusy}
        className={`w-full py-3 px-4 transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer font-extrabold uppercase shadow-lg group select-none active:scale-[0.98] ${
          variant === 'tactical'
            ? 'bg-[#262626] hover:bg-[#1E3A8A] text-white border-2 border-[var(--sgx-primary)] shadow-[var(--sgx-primary)]/20'
            : variant === 'compact'
            ? 'bg-[var(--sgx-primary)] hover:opacity-90 text-black py-2 px-3 text-xs'
            : 'bg-[var(--sgx-primary)] hover:opacity-95 text-black'
        } ${isBusy ? 'opacity-70 cursor-wait' : ''}`}
        style={{
          clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)'
        }}
        title="Iniciar sesión directamente con Google (Firebase Auth)"
      >
        {isBusy ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-current shrink-0" />
            <span className="text-xs tracking-wider">CONECTANDO CON GOOGLE...</span>
          </>
        ) : (
          <>
            {/* Official Google 'G' Mark */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.97 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span className="text-xs tracking-wider">{buttonText}</span>
          </>
        )}
      </button>

      {/* Discrete security and status note */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
        <ShieldCheck className="w-3 h-3 text-[var(--sgx-neon)]" />
        <span>Autenticación segura oficial vía Firebase Auth</span>
      </div>

      {/* Clear, helpful error notification if needed */}
      {authError && (
        <div 
          className="p-2.5 bg-red-950/80 border border-red-500/70 text-red-200 text-xs space-y-1 text-left animate-fadeIn"
          style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1 text-red-400 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Aviso de autenticación</span>
            </span>
            <button
              onClick={clearAuthError}
              className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
          <p className="text-[11px] font-sans leading-relaxed text-slate-200">
            {authError === 'POPUP_BLOCKED'
              ? 'La ventana emergente fue bloqueada por el navegador. Por favor permite popups en la barra de direcciones e intenta nuevamente.'
              : authError}
          </p>
        </div>
      )}
    </div>
  );
};
