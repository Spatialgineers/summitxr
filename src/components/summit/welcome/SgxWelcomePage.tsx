import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowRight, Calendar, Download, ExternalLink, Gamepad2, Handshake, Building2, Mail, Mic, Newspaper, Phone, Play, ShieldCheck, Sparkles, Zap, MessageCircle } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { useLanguage } from '../../../context/LanguageContext';
import { useOptionalSgxIdentity } from '../../../identity/SgxIdentityContext';
import { getAppRouteAndSectionFromUrl, syncAppUrl } from '../../../lib/summitUrlSync';
import { SGX_EMAIL, SGX_INSTAGRAM, SGX_PHONE, SGX_SOCIAL, SGX_YOUTUBE } from '../../../lib/sgxLinks';
import {
  WELCOME_EXTRA_VIDEOS, WELCOME_FACTS, WELCOME_HUB, WELCOME_PUBLIC_ROLES, WELCOME_ROLE_COPY,
  isPortraitVideo, pick, resolveWelcomeRole, welcomeIdsFromDoc, welcomePathFor, youTubeEmbedUrl, youTubeThumb, youTubeWatchUrl,
  type WelcomeRole, type WelcomeVideoIds, type WelcomeVideoKey,
} from '../../../lib/welcomePortal';
import type { SummitSectionKey } from '../sectionKeys';
import { loadPersistedSessions } from '../../../lib/summitData';
import { DAY_LABEL, fromSession, parseInvite, pillarName, type InviteFields } from '../../../lib/welcomeInvites';
import './sgxWelcome.css';

/* The welcome portal: /bienvenida (hub) and /bienvenida/<rol>. One link the
   team sends per role: the role's video, the SGX Pass button, the shortcuts
   into the app, the dates and steps that matter, and contact. The video ids
   live in site_config/welcome (set from the admin, Contenido → Portal de
   bienvenida). The same copy is injected by the server for crawlers. */

const fire = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));
const TEL = `tel:${SGX_PHONE.replace(/[^+\d]/g, '')}`;
const WHATSAPP = `https://wa.me/${SGX_PHONE.replace(/\D/g, '')}`;

function roleFromUrl(): { role: WelcomeRole | null; raw: string | null; invite: InviteFields | null } {
  const parsed = getAppRouteAndSectionFromUrl();
  const raw = parsed.summitSection === 'WELCOME' ? parsed.subtab || null : null;
  const role = resolveWelcomeRole(raw);
  // A personal link (?n=…&s=…): the session from the public agenda wins over the explicit fields.
  const invite = role ? parseInvite(window.location.search) : null;
  return { role, raw, invite: invite ? fromSession(invite, loadPersistedSessions()) : null };
}

/** A personal link is not a page of its own for search engines. */
function useNoindex(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const m = document.createElement('meta');
    m.name = 'robots'; m.content = 'noindex, follow';
    document.head.appendChild(m);
    return () => { m.remove(); };
  }, [on]);
}

/** Sets the page title and description while the page is open, and puts them back after. */
function useHead(title: string, description: string) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    const prevTitle = document.title;
    const prevDesc = meta?.getAttribute('content') || '';
    document.title = title;
    meta?.setAttribute('content', description);
    return () => { document.title = prevTitle; meta?.setAttribute('content', prevDesc); };
  }, [title, description]);
}

/* ---------- the video: a poster until tapped, then the privacy-enhanced player ---------- */

const WelcomeVideo: React.FC<{ id?: string; videoKey: WelcomeVideoKey; title: string; es: boolean }> = ({ id, videoKey, title, es }) => {
  const [playing, setPlaying] = useState(false);
  useEffect(() => setPlaying(false), [id]);
  const portrait = isPortraitVideo(videoKey);
  const frame = `sgx-wel-video ${portrait ? 'is-portrait' : 'is-landscape'}`;

  if (!id) {
    return (
      <figure className={frame}>
        <div className="sgx-wel-video__soon" role="img" aria-label={es ? `${title}: video muy pronto` : `${title}: video coming soon`}>
          <img src="/brand/sgx-bolt.svg" alt="" width={44} height={44} />
          <strong>{es ? 'Video muy pronto' : 'Video coming soon'}</strong>
          <span>{title}</span>
        </div>
      </figure>
    );
  }

  return (
    <figure className={frame}>
      <div className="sgx-wel-video__box">
        {playing ? (
          <iframe
            src={youTubeEmbedUrl(id)}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button type="button" className="sgx-wel-video__poster" onClick={() => setPlaying(true)} aria-label={es ? `Reproducir: ${title}` : `Play: ${title}`}>
            <img src={youTubeThumb(id, videoKey)} alt="" loading="lazy" decoding="async" />
            <span className="sgx-wel-video__play" aria-hidden="true"><Play /></span>
          </button>
        )}
      </div>
      <figcaption>
        <span>{title}</span>
        <a href={youTubeWatchUrl(id)} target="_blank" rel="noopener noreferrer">{es ? 'Ver en YouTube' : 'Watch on YouTube'} <ExternalLink aria-hidden="true" /></a>
      </figcaption>
    </figure>
  );
};

/* ---------- shortcuts per role ---------- */

interface Shortcut { href: string; label: string; icon: React.ComponentType<{ className?: string }>; go: () => void }

export const SgxWelcomePage: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const sgx = useOptionalSgxIdentity();
  const forged = !!sgx?.isForged;
  const [{ role, invite }, setLoc] = useState(roleFromUrl);
  const [ids, setIds] = useState<WelcomeVideoIds>({});

  useEffect(() => onSnapshot(doc(db, 'site_config', 'welcome'), (snap) => setIds(welcomeIdsFromDoc(snap.data())), () => { /* offline: posters stay "muy pronto" */ }), []);

  // Follow the address bar (back / forward, links inside the app); aliases settle on the clean link.
  useEffect(() => {
    const sync = () => {
      const next = roleFromUrl();
      setLoc(next);
      if (next.role && next.raw !== next.role && window.location.pathname.toLowerCase().startsWith('/bienvenida')) {
        window.history.replaceState(window.history.state, '', welcomePathFor(next.role) + window.location.search + window.location.hash);
      }
    };
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('sgx:route_changed', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('sgx:route_changed', sync); };
  }, []);

  const copy = role ? WELCOME_ROLE_COPY[role] : null;
  useNoindex(!!invite);
  useHead(copy ? pick(copy.metaTitle, es) : pick(WELCOME_HUB.metaTitle, es), copy ? pick(copy.description, es) : pick(WELCOME_HUB.description, es));

  const openRole = useCallback((next: WelcomeRole | null) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    syncAppUrl({ page: 'summit', section: 'WELCOME', subtab: next || undefined });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goSection = (section: SummitSectionKey) => () => fire('sgx:switch_summit_section', { section });
  // The press room is its own page (/prensa); land on the block the shortcut names.
  const goPress = (anchor: string) => () => {
    fire('sgx:open_press');
    window.setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 700);
  };
  const link = (href: string, go: () => void) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    go();
  };

  const shortcuts: Shortcut[] = useMemo(() => {
    switch (role) {
      case 'speaker': return [
        { href: '/portal-speakers', label: es ? 'Portal de speakers' : 'Speaker portal', icon: Mic, go: goSection('SPEAKER_PORTAL') },
        { href: '/agenda', label: es ? 'Agenda de 3 días' : '3-day agenda', icon: Calendar, go: goSection('AGENDA') },
      ];
      case 'sponsor': return [
        { href: '/patrocina', label: es ? 'Patrocina el Summit' : 'Sponsor the Summit', icon: Handshake, go: goSection('SPONSOR') },
        { href: '/sponsors', label: 'Partners & Brand Showcases', icon: Building2, go: goSection('SPONSORS_HUB') },
      ];
      case 'prensa': return [
        { href: '/prensa', label: es ? 'Solicitar acreditación' : 'Request accreditation', icon: Newspaper, go: goPress('acreditacion') },
        { href: '/prensa#kit', label: es ? 'Kit de prensa' : 'Press kit', icon: Download, go: goPress('kit') },
        { href: '/agenda', label: es ? 'Agenda de 3 días' : '3-day agenda', icon: Calendar, go: goSection('AGENDA') },
      ];
      case 'equipo': return [
        { href: '/admin', label: es ? 'Centro de mando (admin)' : 'Command center (admin)', icon: ShieldCheck, go: () => { window.location.href = '/admin'; } },
        { href: '/agenda', label: es ? 'Agenda de 3 días' : '3-day agenda', icon: Calendar, go: goSection('AGENDA') },
      ];
      case 'visitante': return [
        { href: '/agenda', label: es ? 'Agenda de 3 días' : '3-day agenda', icon: Calendar, go: goSection('AGENDA') },
        { href: '/juegos', label: es ? 'Juegos y laboratorios' : 'Games & labs', icon: Gamepad2, go: goSection('EMBEDS_GAMES') },
        { href: '/pase', label: es ? 'Reactor de misiones' : 'Mission reactor', icon: Sparkles, go: () => fire('sgx:open_hangar', { tab: 'reactor' }) },
      ];
      default: return [
        { href: '/agenda', label: es ? 'Agenda de 3 días' : '3-day agenda', icon: Calendar, go: goSection('AGENDA') },
        { href: '/juegos', label: es ? 'Juegos y laboratorios' : 'Games & labs', icon: Gamepad2, go: goSection('EMBEDS_GAMES') },
      ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, es]);

  const passButton = (
    <span className="sgx-glow">
      <button
        type="button"
        className="sgx-btn sgx-wel-cta"
        onClick={() => (forged ? fire('sgx:open_hangar', { tab: 'pass' }) : fire('sgx:open_forge', { tier: 'DIGITAL' }))}
      >
        <Zap aria-hidden="true" />
        {forged ? (es ? 'Abrir mi Estudio' : 'Open my Studio') : (es ? 'Forjar mi SGX Pass' : 'Forge my SGX Pass')}
      </button>
    </span>
  );

  const facts = [
    { k: es ? '11–13 dic 2026' : 'Dec 11–13, 2026', v: es ? 'En español' : 'In Spanish' },
    { k: es ? 'Días 1 y 2' : 'Days 1 and 2', v: es ? 'Gratis por YouTube Live' : 'Free on YouTube Live' },
    { k: es ? 'Día 3' : 'Day 3', v: es ? 'Chroma Space Studios, San Juan · por invitación' : 'Chroma Space Studios, San Juan · by invitation' },
  ];

  const faq = copy ? copy.faq : WELCOME_HUB.faq;
  const videoKey: WelcomeVideoKey = role || 'tour';

  return (
    <div id="summit-section-bienvenida" className={`sgx-wel ${role ? 'is-role' : 'is-hub'}`}>
      <nav className="sgx-wel-crumbs" aria-label={es ? 'Ruta' : 'Breadcrumb'}>
        <a href="/bienvenida" onClick={openRole(null)} aria-current={role ? undefined : 'page'}>{es ? 'Bienvenida' : 'Welcome'}</a>
        {copy && <><span aria-hidden="true">/</span><span aria-current="page">{pick(copy.label, es)}</span></>}
      </nav>

      {invite && (invite.nombre || invite.titulo || invite.dia || invite.hora || invite.paquete) && (
        <aside className="sgx-wel-invite" aria-label={es ? 'Tu invitación' : 'Your invitation'}>
          <p className="sgx-wel-invite__hi">{invite.nombre ? `${es ? 'Hola' : 'Hi'} ${invite.nombre}` : (es ? 'Hola' : 'Hi')}</p>
          {(invite.titulo || invite.dia || invite.hora || invite.pilar) && (
            <p className="sgx-wel-invite__line">
              <span className="sgx-wel-invite__k">{es ? 'Tu sesión' : 'Your session'}</span>
              {[invite.titulo ? `«${invite.titulo}»` : '', pillarName(invite.pilar) || '', invite.dia ? DAY_LABEL[invite.dia] : '', invite.hora || ''].filter(Boolean).join(' · ')}
            </p>
          )}
          {role === 'sponsor' && invite.paquete && (
            <p className="sgx-wel-invite__line"><span className="sgx-wel-invite__k">{es ? 'Tu paquete' : 'Your package'}</span>{es ? 'Paquete' : 'Package'} {invite.paquete}</p>
          )}
        </aside>
      )}

      <header className={`sgx-wel-hero ${role ? 'has-video' : ''}`} aria-labelledby="sgx-wel-title">
        <div className="sgx-wel-hero__copy">
          <p className="sgx-wel-eyebrow">
            <img src="/brand/sgx-bolt.svg" alt="" width={20} height={20} />
            <span>Spatialgineers Summit 2026 · {copy ? pick(copy.label, es) : (es ? 'Portal de bienvenida' : 'Welcome portal')}</span>
          </p>
          <h1 id="sgx-wel-title" className="sgx-wel-title">{copy ? pick(copy.title, es) : pick(WELCOME_HUB.title, es)}</h1>
          <p className="sgx-wel-lead">{copy ? pick(copy.intro, es) : pick(WELCOME_HUB.intro, es)}</p>
          <dl className="sgx-wel-facts">
            {facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}
          </dl>
          <div className="sgx-wel-actions">
            {passButton}
            {shortcuts.map((s) => (
              <a key={s.href + s.label} href={s.href} className="sgx-btn sgx-btn--ground" onClick={link(s.href, s.go)}>
                <s.icon aria-hidden="true" />{s.label}
              </a>
            ))}
          </div>
        </div>
        {role && (
          <div className="sgx-wel-hero__video">
            <WelcomeVideo id={ids[videoKey]} videoKey={videoKey} title={pick(copy!.videoTitle, es)} es={es} />
          </div>
        )}
      </header>

      {!role && (
        <section className="sgx-wel-section" aria-labelledby="sgx-wel-roles">
          <div className="sgx-wel-head">
            <p className="sgx-wel-kicker">{es ? 'Elige tu rol' : 'Pick your role'}</p>
            <h2 id="sgx-wel-roles" className="sgx-wel-h2">{es ? '¿Cómo llegas al Summit?' : 'How are you coming to the Summit?'}</h2>
          </div>
          <ul className="sgx-wel-roles">
            {WELCOME_PUBLIC_ROLES.map((r) => {
              const c = WELCOME_ROLE_COPY[r];
              const Icon = r === 'speaker' ? Mic : r === 'sponsor' ? Handshake : r === 'prensa' ? Newspaper : Sparkles;
              return (
                <li key={r}>
                  <a href={welcomePathFor(r)} className={`sgx-wel-role is-${r}`} onClick={openRole(r)}>
                    <span className="sgx-wel-role__icon" aria-hidden="true"><Icon /></span>
                    <h3>{pick(c.label, es)}</h3>
                    <p>{pick(c.intro, es)}</p>
                    <span className="sgx-wel-role__go">{es ? 'Ver mi video y mis pasos' : 'See my video and steps'} <ArrowRight aria-hidden="true" /></span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!role && (
        <section className="sgx-wel-section" aria-labelledby="sgx-wel-videos">
          <div className="sgx-wel-head">
            <p className="sgx-wel-kicker">{es ? 'Videos' : 'Videos'}</p>
            <h2 id="sgx-wel-videos" className="sgx-wel-h2">{es ? 'El Summit en video' : 'The Summit on video'}</h2>
          </div>
          <div className="sgx-wel-videos">
            {(['tour', 'pass', 'build'] as const).filter((k) => k !== 'build' || ids.build).map((k) => (
              <article key={k} className={`sgx-wel-videocard is-${k}`}>
                <WelcomeVideo id={ids[k]} videoKey={k} title={pick(WELCOME_EXTRA_VIDEOS[k].title, es)} es={es} />
                <div>
                  <h3>{pick(WELCOME_EXTRA_VIDEOS[k].title, es)}</h3>
                  <p>{pick(WELCOME_EXTRA_VIDEOS[k].body, es)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {copy && copy.steps.length > 0 && (
        <section className="sgx-wel-section" aria-labelledby="sgx-wel-steps">
          <div className="sgx-wel-head">
            <p className="sgx-wel-kicker">{es ? 'Fechas y pasos clave' : 'Key dates and steps'}</p>
            <h2 id="sgx-wel-steps" className="sgx-wel-h2">{es ? 'Lo que te toca, en orden' : 'What is on you, in order'}</h2>
          </div>
          <ol className="sgx-wel-steps">
            {copy.steps.map((s, i) => (
              <li key={i}>
                <span className="sgx-wel-steps__n" aria-hidden="true">{i + 1}</span>
                <p className="sgx-wel-steps__when">{pick(s.when, es)}</p>
                <h3>{pick(s.title, es)}</h3>
                <p>{pick(s.body, es)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {faq.length > 0 && (
        <section className="sgx-wel-section" aria-labelledby="sgx-wel-faq">
          <div className="sgx-wel-head">
            <p className="sgx-wel-kicker">{es ? 'Preguntas frecuentes' : 'FAQ'}</p>
            <h2 id="sgx-wel-faq" className="sgx-wel-h2">{es ? 'Respuestas cortas' : 'Short answers'}</h2>
          </div>
          <div className="sgx-wel-faq">
            {faq.map((f, i) => (
              <details key={i} className="sgx-panel" open={i === 0}>
                <summary><h3>{pick(f.q, es)}</h3></summary>
                <p>{pick(f.a, es)}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="sgx-wel-section sgx-wel-contact" aria-labelledby="sgx-wel-contact">
        <div className="sgx-wel-head">
          <p className="sgx-wel-kicker">{es ? 'Contacto y redes' : 'Contact and social'}</p>
          <h2 id="sgx-wel-contact" className="sgx-wel-h2">{es ? '¿Dudas? Escríbenos' : 'Questions? Write to us'}</h2>
        </div>
        <ul className="sgx-wel-contact__list">
          <li><a href={`mailto:${SGX_EMAIL}`}><Mail aria-hidden="true" /><span><small>Email</small>{SGX_EMAIL}</span></a></li>
          <li><a href={TEL}><Phone aria-hidden="true" /><span><small>{es ? 'Teléfono' : 'Phone'}</small>{SGX_PHONE}</span></a></li>
          <li><a href={WHATSAPP} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /><span><small>WhatsApp</small>{SGX_PHONE}</span></a></li>
          <li><a href={SGX_YOUTUBE} target="_blank" rel="noopener noreferrer"><Play aria-hidden="true" /><span><small>YouTube</small>{SGX_SOCIAL}</span></a></li>
          <li><a href={SGX_INSTAGRAM} target="_blank" rel="noopener noreferrer"><Sparkles aria-hidden="true" /><span><small>Instagram</small>{SGX_SOCIAL}</span></a></li>
        </ul>
        <p className="sgx-wel-fine">{pick(WELCOME_FACTS.press, es)}</p>
      </section>

      {role && (
        <nav className="sgx-wel-section sgx-wel-others" aria-label={es ? 'Otros roles' : 'Other roles'}>
          <p className="sgx-wel-kicker">{es ? '¿Vienes con otro rol?' : 'Coming in another role?'}</p>
          <div className="sgx-wel-others__row">
            {WELCOME_PUBLIC_ROLES.filter((r) => r !== role).map((r) => (
              <a key={r} href={welcomePathFor(r)} className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={openRole(r)}>{pick(WELCOME_ROLE_COPY[r].label, es)}</a>
            ))}
            <a href="/bienvenida" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={openRole(null)}>{es ? 'Todos los videos' : 'All videos'}</a>
          </div>
        </nav>
      )}
    </div>
  );
};

export default SgxWelcomePage;
