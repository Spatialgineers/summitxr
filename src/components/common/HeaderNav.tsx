import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { SgxPilotGlyph } from '../../identity/SgxPilotGlyph';
import { PILLAR_ACCENT } from '../../identity/sgxIdentity';
import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3, Building2, Check, LogOut, ShieldCheck, Sparkles, Zap, Ticket, Share2, Menu, X, Sliders, Volume2, VolumeX,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { HeaderPillarNav, PillarDirectoryGrid } from './SgxPillarNav';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { playUiChirp, getIsAudioMuted, toggleAudioMute } from '../../lib/cyberAudioEngine';
import { syncAppUrl } from '../../lib/summitUrlSync';
import { TransientSponsorSlot } from '../summit/TransientSponsorSlot';
import { SgxDialog } from './SgxDialog';
import { AccountMenu } from './AccountMenu';
import '../summit/sgx-kit.css';
import './HeaderNav.css';

export type PageRoute = 'summit' | 'multiview' | 'admin' | 'play' | 'stage' | 'analytics' | 'schema';

interface HeaderNavProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  selectedTenantId: string;
  selectedEventId: string;
  onSelectTenant: (tenantId: string) => void;
  isConnected: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ currentPage, onNavigate }) => {
  const [copiedPath, setCopiedPath] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => getIsAudioMuted());
  const systemMenuRef = useRef<HTMLDivElement>(null);
  const systemTriggerRef = useRef<HTMLButtonElement>(null);
  const { language, setLanguage } = useLanguage();
  const es = language === 'es';
  const { liteMode, setLiteMode } = usePilotProfile();
  const sgxId = useOptionalSgxIdentity();
  const { isAdmin, user, logout } = useAuth();
  const [acctOpen, setAcctOpen] = useState(false);
  const chipRef = useRef<HTMLButtonElement | null>(null);

  // Admin tools menu: click outside or Escape closes it; arrows move between items.
  useEffect(() => {
    if (!isSystemMenuOpen) return;
    const items = (): HTMLElement[] => Array.from(systemMenuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const t = window.setTimeout(() => items()[0]?.focus(), 20);
    const onDown = (e: MouseEvent) => {
      if (systemMenuRef.current && !systemMenuRef.current.contains(e.target as Node)) setIsSystemMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSystemMenuOpen(false);
        systemTriggerRef.current?.focus();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
      list[next]?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isSystemMenuOpen]);

  useEffect(() => {
    const handleOpenDrawer = () => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'pass' } }));
    window.addEventListener('sgx:open_profile_drawer', handleOpenDrawer);
    return () => window.removeEventListener('sgx:open_profile_drawer', handleOpenDrawer);
  }, []);

  useEffect(() => {
    const handleOpenMainMenu = () => setIsMenuOpen(true);
    window.addEventListener('sgx:open_main_menu', handleOpenMainMenu);
    return () => window.removeEventListener('sgx:open_main_menu', handleOpenMainMenu);
  }, []);

  const handleCopyCurrentURL = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopiedPath(true);
    playUiChirp(880);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleToggleAudio = () => {
    const muted = toggleAudioMute();
    setIsAudioMuted(muted);
    if (!muted) playUiChirp(840);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const systemItem = (label: string, Icon: typeof Sliders, run: () => void) => (
    <button
      type="button"
      role="menuitem"
      className="sgx-hdr__menuitem"
      onClick={() => { setIsSystemMenuOpen(false); playUiChirp(720); run(); }}
    >
      <Icon aria-hidden />{label}
    </button>
  );

  const langSwitch = (extra = '') => (
    <div className={`sgx-hdr__lang ${extra}`} role="group" aria-label={es ? 'Idioma' : 'Language'} data-tour="language-toggle">
      <button type="button" aria-pressed={language === 'es'} onClick={() => setLanguage('es')} lang="es" title="Español">ES</button>
      <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')} lang="en" title="English">EN</button>
    </div>
  );

  return (
    <>
      <header className="sgx-hdr">
        <div className="sgx-hdr__inner">
          <button
            type="button"
            data-tour="brand-logo"
            className="sgx-hdr__brand"
            onClick={() => {
              playUiChirp(700);
              if (currentPage !== 'summit') onNavigate('summit');
              syncAppUrl({ page: 'summit', section: 'OVERVIEW' });
              window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', { detail: { section: 'OVERVIEW' } }));
            }}
            aria-label={es ? 'Spatialgineers Summit 2026: inicio' : 'Spatialgineers Summit 2026: home'}
          >
            <img src="https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG" alt="" className="sgx-hdr__logo" />
            <img src="https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png" alt="" className="sgx-hdr__mark" />
            <span className="sgx-hdr__brand-text">
              <b>Spatialgineers Summit 2026</b>
              <small>{es ? '11–13 dic · Puerto Rico' : 'Dec 11–13 · Puerto Rico'}</small>
            </span>
          </button>

          {/* The six SGX pillars, always one click away */}
          <div className="sgx-hdr__pillars">
            <HeaderPillarNav />
          </div>

          <div className="sgx-hdr__sponsor">
            <TransientSponsorSlot slotId="header_main" variant="compact" showSubtitleLink={true} />
          </div>

          <div className="sgx-hdr__actions">
            {langSwitch('sgx-hdr__wide')}

            <button
              type="button"
              className="sgx-iconbtn sgx-hdr__icon sgx-hdr__wide"
              aria-pressed={!isAudioMuted}
              onClick={handleToggleAudio}
              aria-label={isAudioMuted ? (es ? 'Activar sonido' : 'Turn sound on') : (es ? 'Silenciar sonido' : 'Mute sound')}
              title={isAudioMuted ? (es ? 'Activar sonido' : 'Turn sound on') : (es ? 'Silenciar sonido' : 'Mute sound')}
            >
              {isAudioMuted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
            </button>

            <button
              type="button"
              className="sgx-hdr__fx sgx-hdr__wide"
              aria-pressed={liteMode}
              onClick={() => { playUiChirp(820); setLiteMode(prev => !prev); }}
              title={liteMode ? (es ? 'Modo ligero activo: toca para volver a los efectos 3D' : 'Lite mode on: tap to go back to 3D effects') : (es ? 'Efectos 3D activos: toca para el modo ligero (ahorra batería)' : '3D effects on: tap for lite mode (saves battery)')}
            >
              <Zap aria-hidden />{liteMode ? (es ? 'Ligero' : 'Lite') : 'FX'}
            </button>

            {/* Admin tools (hidden for attendees) */}
            {isAdmin && (
              <div className="sgx-hdr__sys" ref={systemMenuRef}>
                <button
                  ref={systemTriggerRef}
                  type="button"
                  className="sgx-iconbtn sgx-hdr__icon"
                  aria-haspopup="menu"
                  aria-expanded={isSystemMenuOpen}
                  aria-pressed={isSystemMenuOpen}
                  onClick={() => { playUiChirp(680); setIsSystemMenuOpen(!isSystemMenuOpen); }}
                  aria-label={es ? 'Herramientas de administración' : 'Admin tools'}
                  title={es ? 'Herramientas de administración' : 'Admin tools'}
                >
                  <Sliders aria-hidden />
                </button>
                {isSystemMenuOpen && (
                  <div className="sgx-hdr__menu" role="menu" aria-label={es ? 'Herramientas de administración' : 'Admin tools'}>
                    <p className="sgx-kicker">{es ? 'Administración' : 'Admin'}</p>
                    {systemItem(es ? 'Módulos y visibilidad' : 'Modules and visibility', Sliders, () => window.dispatchEvent(new CustomEvent('sgx:open_audit_modal')))}
                    {systemItem(es ? 'Panel de administración' : 'Admin panel', ShieldCheck, () => onNavigate('admin'))}
                    {systemItem(es ? 'Analíticas' : 'Analytics', BarChart3, () => window.dispatchEvent(new CustomEvent('sgx:open_analytics')))}
                    {systemItem(es ? 'Mi SGX Pass' : 'My SGX Pass', Sparkles, () => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'pass' } })))}
                    {systemItem(es ? 'Ser patrocinador' : 'Become a sponsor', Building2, () => window.dispatchEvent(new CustomEvent('sgx:open_sponsor_modal')))}
                    {systemItem(liteMode ? (es ? 'Modo 3D completo' : 'Full 3D mode') : (es ? 'Modo ligero' : 'Lite mode'), Zap, () => setLiteMode(prev => !prev))}
                  </div>
                )}
              </div>
            )}

            {/* SGX Pass chip: the one "me" button. Opens the account menu (Estudio, Forja, Google sign-in / sign-out). */}
            <div className="sgx-acct-wrap">
            <button
              ref={chipRef}
              type="button"
              data-tour="user-passport-btn"
              aria-haspopup="menu"
              aria-expanded={acctOpen}
              onClick={() => { playUiChirp(840); setAcctOpen((o) => !o); }}
              className={`sgx-passchip ${sgxId?.isForged ? '' : 'sgx-passchip--forge'}`}
              title={es ? 'Tu cuenta: Estudio, pase y sesión' : 'Your account: Studio, pass and sign-in'}
            >
              <span className="sgx-passchip__face">
                {sgxId?.identity.avatar.png ? (
                  <img src={sgxId.identity.avatar.png} alt="" />
                ) : sgxId?.isForged ? (
                  <SgxPilotGlyph seed={sgxId.identity.avatar.seed} config={sgxId.identity.avatar.pilot} accent={sgxId.identity.affinity ? PILLAR_ACCENT[sgxId.identity.affinity] : '#FDCC0D'} size={20} />
                ) : isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <Ticket className="w-3.5 h-3.5" />
                )}
              </span>
              <span className="sgx-passchip__label">
                {sgxId?.isForged ? (
                  <>
                    <b>{sgxId.identity.callsign}</b>
                    <small>#{sgxId.identity.pass!.serial} · {sgxId.xpEarned.toLocaleString('es-PR')} XP</small>
                  </>
                ) : (
                  <b>{es ? 'FORJAR PASE' : 'FORGE PASS'}</b>
                )}
              </span>
            </button>
            <AccountMenu open={acctOpen} onClose={() => setAcctOpen(false)} anchorRef={chipRef} />
            </div>

            <button
              type="button"
              data-tour="share-btn"
              className="sgx-iconbtn sgx-hdr__icon sgx-hdr__wide"
              onClick={handleCopyCurrentURL}
              aria-label={copiedPath ? (es ? 'Enlace copiado' : 'Link copied') : (es ? 'Copiar enlace' : 'Copy link')}
              title={es ? 'Copiar enlace' : 'Copy link'}
            >
              {copiedPath ? <Check aria-hidden /> : <Share2 aria-hidden />}
            </button>

            <button
              type="button"
              className="sgx-hdr__menubtn"
              aria-haspopup="dialog"
              aria-expanded={isMenuOpen}
              onClick={() => { playUiChirp(700); setIsMenuOpen(!isMenuOpen); }}
            >
              {isMenuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
              <span>{es ? 'Menú' : 'Menu'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main menu: the whole event divided into the six SGX pillars (single source: lib/sgxPillars) */}
      <SgxDialog
        open={isMenuOpen}
        onClose={() => { playUiChirp(450); closeMenu(); }}
        size="lg"
        accent="rgba(253, 204, 13, 0.6)"
        className="sgx-dialog--fit sgx-hdr-dlg"
        title={es ? 'Los 6 pilares' : 'The 6 pillars'}
        kicker={es ? 'Todo el Summit vive dentro de los seis pilares del SGX Framework, en su orden oficial.' : 'The whole Summit lives inside the six pillars of the SGX Framework, in their official order.'}
        footer={
          <div className="sgx-hdr-dlg__foot">
            <div className="sgx-hdr-dlg__quick">
              <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => { closeMenu(); playUiChirp(880); window.dispatchEvent(new CustomEvent('sgx:open_tickets')); }}>
                <Ticket aria-hidden />SGX Pass
              </button>
              <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => { closeMenu(); window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'pass' } })); }}>
                <Sparkles aria-hidden />{es ? 'Tu Estudio' : 'Your Studio'}
              </button>
              {user && !user.isAnonymous && (
                <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => { closeMenu(); playUiChirp(420); logout(); }}>
                  <LogOut aria-hidden />{es ? 'Cerrar sesión' : 'Sign out'}
                </button>
              )}
              {isAdmin && (
                <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => { closeMenu(); window.dispatchEvent(new CustomEvent('sgx:open_audit_modal')); }}>
                  <Sliders aria-hidden />{es ? 'Módulos' : 'Modules'}
                </button>
              )}
            </div>
            {/* On phones the header keeps only the pass chip and Menú; language, sound and link live here. */}
            <div className="sgx-hdr-dlg__quick sgx-hdr__narrow">
              {langSwitch()}
              <button type="button" className="sgx-iconbtn" aria-pressed={!isAudioMuted} onClick={handleToggleAudio} aria-label={isAudioMuted ? (es ? 'Activar sonido' : 'Turn sound on') : (es ? 'Silenciar sonido' : 'Mute sound')}>
                {isAudioMuted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
              </button>
              <button type="button" className="sgx-iconbtn" onClick={handleCopyCurrentURL} aria-label={copiedPath ? (es ? 'Enlace copiado' : 'Link copied') : (es ? 'Copiar enlace' : 'Copy link')}>
                {copiedPath ? <Check aria-hidden /> : <Share2 aria-hidden />}
              </button>
            </div>
            <p className="sgx-fine sgx-hdr__wide">{es ? 'Esc para cerrar' : 'Esc to close'}</p>
          </div>
        }
      >
        <PillarDirectoryGrid onDone={closeMenu} />
      </SgxDialog>
    </>
  );
};
