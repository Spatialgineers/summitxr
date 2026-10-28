import React, { useEffect, useRef, useState } from 'react';
import { StageVisualizer } from '../visualizer/StageVisualizer';
import { StageHud } from './StageHud';
import { EventSession, Question, VoteSummary, ReactionBurst, CustomVisualAssets } from '../../types/engine';
import type { PageRoute } from '../common/HeaderNav';
import { ArrowLeft, Check, Copy, Maximize, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import './stage.css';

/* The live stage for the venue screens and OBS. Visitors only watch: the
   visual is driven by the director (presets, votes), never from this page.
   Admins get projection settings (transparent background for OBS, HUD on or
   off, bars, camera motion, sound) and a clean OBS link.
   URL: ?page=stage  ·  &clean=1 hides every button  ·  &transparent=1 for chroma  ·  &hud=0 hides the HUD */

interface StagePageProps {
  tenantId: string;
  eventId: string;
  session: EventSession;
  currentQuestion?: Question | null;
  voteSummary?: VoteSummary | null;
  reactions: ReactionBurst[];
  customAssets?: CustomVisualAssets;
  onNavigate?: (page: PageRoute) => void;
}

const params = () => new URLSearchParams(window.location.search);
const flag = (v: string | null) => v === '1' || v === 'true';

export const StagePage: React.FC<StagePageProps> = ({
  session,
  currentQuestion,
  voteSummary,
  reactions,
  customAssets,
  onNavigate,
}) => {
  const { isAdmin } = useAuth();
  const { language } = useLanguage();
  const es = language === 'es';
  const [clean] = useState(() => flag(params().get('clean')));
  const [isTransparent, setIsTransparent] = useState(() => flag(params().get('transparent')));
  const [showHud, setShowHud] = useState(() => params().get('hud') !== '0');
  const [showBars, setShowBars] = useState(true);
  const [cameraMotion, setCameraMotion] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Buttons fade out when the pointer rests, so the screen stays clean.
  useEffect(() => {
    let timer = window.setTimeout(() => setChromeVisible(false), 3000);
    const wake = () => {
      setChromeVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setChromeVisible(false), 3000);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  // Short synth cues when voting opens and when the result lands (admin opt-in).
  const playSound = (freq: number, duration = 0.1, type: OscillatorType = 'sine') => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  useEffect(() => {
    if (session.status === 'VOTING_ACTIVE') {
      playSound(440, 0.12, 'triangle');
    } else if (session.status === 'RESULT_REVEALED') {
      playSound(880, 0.4, 'sine');
      setTimeout(() => playSound(1174, 0.5, 'sine'), 150);
    }
  }, [session.status]);

  const obsLink = `${window.location.origin}/?page=stage&clean=1${isTransparent ? '&transparent=1' : ''}${showHud ? '' : '&hud=0'}`;
  const copyObsLink = () => {
    navigator.clipboard.writeText(obsLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const chromeClass = chromeVisible || trayOpen ? '' : ' is-hidden';

  return (
    <div className={`relative w-screen h-screen overflow-hidden select-none ${isTransparent ? 'bg-transparent' : 'bg-[var(--sgx-bg)]'}`}>
      <StageVisualizer
        // Remount when the background mode changes: the scene is built once per mode.
        key={isTransparent ? 'alpha' : 'solid'}
        presetId={session.activePresetId}
        voteSummary={voteSummary}
        currentQuestion={currentQuestion}
        timeRemaining={session.timeRemaining}
        totalDuration={currentQuestion?.durationSeconds || 30}
        sessionStatus={session.status}
        reactions={reactions}
        settings={{
          transparentBackground: isTransparent,
          showHUD: showHud,
          show3DVotingBars: showBars,
          cameraMotion,
          particleDensityMultiplier: 1.0,
          resolutionQuality: 'high',
          bloomIntensity: 1.0,
        }}
        isTransparent={isTransparent}
        customAssets={customAssets}
      />

      {showHud && <StageHud session={session} question={currentQuestion} summary={voteSummary} reactions={reactions} />}

      {!clean && (
        <>
          {onNavigate && (
            <div className={`sgx-stage-chrome is-left${chromeClass}`}>
              <button type="button" className="sgx-stage-btn" onClick={() => onNavigate('summit')}>
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                {es ? 'Volver al Summit' : 'Back to the Summit'}
              </button>
            </div>
          )}

          <div className={`sgx-stage-chrome is-right${chromeClass}`}>
            {isAdmin && (
              <button
                type="button"
                className="sgx-stage-btn"
                aria-pressed={trayOpen}
                aria-expanded={trayOpen}
                onClick={() => setTrayOpen((o) => !o)}
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                {es ? 'Proyección' : 'Projection'}
              </button>
            )}
            <button type="button" className="sgx-stage-btn" onClick={toggleFullscreen} aria-label={es ? 'Pantalla completa' : 'Fullscreen'}>
              <Maximize className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {isAdmin && trayOpen && (
            <div className="sgx-stage-tray" role="dialog" aria-label={es ? 'Ajustes de proyección' : 'Projection settings'}>
              <h2>{es ? 'Ajustes de proyección' : 'Projection settings'}</h2>
              <p>{es ? 'Solo los ves tú (admin). El visual lo cambias desde el admin → FX Presets.' : 'Only you (admin) see these. Change the visual from the admin → FX Presets.'}</p>
              <label>
                {es ? 'Fondo transparente (OBS)' : 'Transparent background (OBS)'}
                <input type="checkbox" checked={isTransparent} onChange={(e) => setIsTransparent(e.target.checked)} />
              </label>
              <label>
                {es ? 'Pregunta, resultados y QR' : 'Question, results and QR'}
                <input type="checkbox" checked={showHud} onChange={(e) => setShowHud(e.target.checked)} />
              </label>
              <label>
                {es ? 'Torres de votos 3D' : '3D vote towers'}
                <input type="checkbox" checked={showBars} onChange={(e) => setShowBars(e.target.checked)} />
              </label>
              <label>
                {es ? 'Movimiento de cámara' : 'Camera motion'}
                <input type="checkbox" checked={cameraMotion} onChange={(e) => setCameraMotion(e.target.checked)} />
              </label>
              <label>
                {es ? 'Sonidos al votar' : 'Voting sounds'}
                <input type="checkbox" checked={audioEnabled} onChange={(e) => setAudioEnabled(e.target.checked)} />
              </label>
              <button type="button" className="sgx-stage-btn" onClick={copyObsLink}>
                {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                {copied ? (es ? 'Enlace copiado' : 'Link copied') : (es ? 'Copiar enlace para OBS' : 'Copy OBS link')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
