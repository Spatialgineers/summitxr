import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, ExternalLink, Maximize2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { EmbedWidget, EmbedCategory } from '../../types/summit';
import { SummitDroneMiniGame } from './SummitDroneMiniGame';
import { LazyBoundary } from '../common/LazyBoundary';
import { LazyFallback } from '../common/LazyFallback';

// Native SGX.Spark games, each in its own chunk.
const StackGame = React.lazy(() => import('./games/stack'));
const PulseGame = React.lazy(() => import('./games/pulse'));
const BoltGame = React.lazy(() => import('./games/bolt'));
const NATIVE_COMPONENTS: Record<string, React.ComponentType> = {
  embed_drone_game: SummitDroneMiniGame, embed_game_stack: StackGame, embed_game_pulse: PulseGame, embed_game_bolt: BoltGame,
};
import { EmbedArt, EmbedArtKind } from './EmbedArt';
import { SgxDialog } from '../common/SgxDialog';
import { saveAllEmbedWidgets, loadAllEmbedWidgets } from '../../lib/summitData';
import { SGX_YOUTUBE } from '../../lib/sgxLinks';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { loc } from '../../lib/localize';
import { PILLAR_ACCENT } from '../../identity/sgxIdentity';
import './SummitEmbedsHub.css';

interface SummitEmbedsHubProps {
  embeds?: EmbedWidget[];
  onOpenCreateEmbedModal?: () => void;
}

/** How an embed is shown: native React game, sandboxed HTML, framed site, link out, or not published yet. */
type EmbedMode = 'native' | 'code' | 'frame' | 'link' | 'soon';

const NATIVE_GAMES = new Set(Object.keys(NATIVE_COMPONENTS));
// Sites that refuse to be framed (X-Frame-Options / frame-ancestors) open in a new tab instead.
const NO_FRAME_HOSTS = /(^|\.)(roblox\.com|instagram\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|linkedin\.com|github\.com)$/i;
const IFRAME_SNIPPET = /^\s*<iframe\b[^>]*\ssrc\s*=\s*["']([^"']+)["'][^>]*>\s*(<\/iframe>)?\s*$/i;
// Admin HTML runs with scripts only: no same-origin, so it cannot reach the Summit page, storage or session.
const CODE_SANDBOX = 'allow-scripts';
const CODE_ALLOW = 'autoplay; fullscreen';
const FRAME_ALLOW = 'autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write; xr-spatial-tracking; accelerometer; gyroscope';

const SEED_ART: Record<string, EmbedArtKind> = {
  embed_drone_game: 'drone', embed_game_stack: 'game', embed_game_pulse: 'synth', embed_game_bolt: 'shader',
};
const CATEGORY_ART: Record<EmbedCategory, EmbedArtKind> = {
  MINI_GAME: 'game', METAVERSE_ROBLOX: 'world', WEBGL_XR: 'shader', WEBAPP: 'board', STREAM_VIDEO: 'stream', CUSTOM_CODE: 'code',
};
const CATEGORY_LABEL: Record<EmbedCategory, { es: string; en: string }> = {
  MINI_GAME: { es: 'Minijuego', en: 'Mini-game' },
  METAVERSE_ROBLOX: { es: 'Mundo virtual', en: 'Virtual world' },
  WEBGL_XR: { es: '3D / XR', en: '3D / XR' },
  WEBAPP: { es: 'Herramienta', en: 'Tool' },
  STREAM_VIDEO: { es: 'Transmisión', en: 'Stream' },
  CUSTOM_CODE: { es: 'Laboratorio', en: 'Lab' },
};
const CATEGORY_ORDER: EmbedCategory[] = ['MINI_GAME', 'CUSTOM_CODE', 'WEBGL_XR', 'STREAM_VIDEO', 'METAVERSE_ROBLOX', 'WEBAPP'];

// Turns a pasted link into an embed-ready iframe URL (YouTube, Vimeo, Google Docs).
function parseEmbedUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  const yt = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/i);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const vimeo = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeo && vimeo[3]) return `https://player.vimeo.com/video/${vimeo[3]}`;
  if (trimmed.includes('docs.google.com') && !trimmed.includes('/preview') && !trimmed.includes('/embed')) return trimmed.replace(/\/edit.*$/, '/preview');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function sourceOf(e: EmbedWidget): string {
  return (e.embedUrl || e.externalUrl || '').trim();
}

function embedMode(e: EmbedWidget): EmbedMode {
  if (NATIVE_GAMES.has(e.id)) return 'native';
  if (e.customCode?.trim()) return 'code';
  const raw = sourceOf(e);
  if (!raw) return 'soon';
  const url = parseEmbedUrl(raw);
  const host = hostOf(url);
  if (!host || NO_FRAME_HOSTS.test(host)) return 'link';
  // YouTube only frames single videos and live ids, not channel pages.
  if (/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(host) && !url.includes('/embed/')) return 'link';
  return 'frame';
}

/** Third-party sites keep their own origin (storage, login); our own origin never gets it with scripts. */
function frameSandbox(url: string): string {
  let sameOrigin = true;
  try { sameOrigin = new URL(url, window.location.href).origin === window.location.origin; } catch { /* keep strict */ }
  return `allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads${sameOrigin ? '' : ' allow-same-origin'}`;
}

/** Sandboxed pages read <html lang> to show their own labels in the visitor's language. */
function withLang(code: string, language: string): string {
  return code.replace(/<html(?![^>]*\blang=)/i, `<html lang="${language}"`);
}

function linkLabel(url: string, es: boolean): string {
  const host = hostOf(url);
  if (/youtube|youtu\.be/.test(host)) return es ? 'Abrir en YouTube' : 'Open on YouTube';
  if (/roblox/.test(host)) return es ? 'Abrir en Roblox' : 'Open in Roblox';
  return es ? `Abrir ${host}` : `Open ${host}`;
}

function statusText(mode: EmbedMode, e: EmbedWidget, es: boolean, short: boolean): string {
  switch (mode) {
    case 'native': return short ? (es ? 'Nativo' : 'Native') : (es ? 'Nativo · se juega aquí' : 'Native · plays here');
    case 'code': return short ? 'Sandbox' : (es ? 'Sandbox · corre en tu navegador' : 'Sandbox · runs in your browser');
    case 'frame': return short ? (es ? 'Embebido' : 'Embedded') : `${es ? 'Embebido' : 'Embedded'} · ${hostOf(parseEmbedUrl(sourceOf(e)))}`;
    case 'link': return short ? (es ? 'Externo' : 'External') : (es ? 'Externo · abre en pestaña nueva' : 'External · opens in a new tab');
    default: return es ? 'Próximamente' : 'Coming soon';
  }
}

const Thumb: React.FC<{ embed: EmbedWidget; className?: string }> = ({ embed, className }) => {
  const seedArt = SEED_ART[embed.id];
  if (!seedArt && embed.thumbnailUrl) return <img src={embed.thumbnailUrl} alt="" className={className} loading="lazy" />;
  return <EmbedArt kind={seedArt || CATEGORY_ART[embed.category] || 'code'} className={className} />;
};

interface EmbedForm {
  title: string;
  titleEn: string;
  category: EmbedCategory;
  embedType: 'URL' | 'CODE';
  sourceValue: string;
  description: string;
  descriptionEn: string;
  author: string;
  tags: string;
}

const BLANK_FORM: EmbedForm = {
  title: '', titleEn: '', category: 'WEBAPP', embedType: 'URL', sourceValue: '',
  description: '', descriptionEn: '', author: 'Spatialgineers', tags: '',
};

export const SummitEmbedsHub: React.FC<SummitEmbedsHubProps> = ({ embeds: initialEmbedsProp }) => {
  const { language } = useLanguage();
  const { isAdmin } = useAuth();
  const es = language === 'es';
  const stageRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [embedList, setEmbedList] = useState<EmbedWidget[]>(() => {
    const saved = loadAllEmbedWidgets();
    if (saved.length > 0) return saved;
    return initialEmbedsProp ?? [];
  });

  // Published CMS changes arrive through the shared 'storage' refresh.
  useEffect(() => {
    const onStorage = () => {
      const saved = loadAllEmbedWidgets();
      if (saved.length > 0) setEmbedList(saved);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const [selectedId, setSelectedId] = useState<string>(() => embedList[0]?.id || 'embed_drone_game');
  const [filter, setFilter] = useState<EmbedCategory | 'ALL'>('ALL');
  const [frameKey, setFrameKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmbedForm>(BLANK_FORM);
  const [formTab, setFormTab] = useState<'FORM' | 'PREVIEW'>('FORM');

  const active = embedList.find((e) => e.id === selectedId) || embedList[0];
  const activeMode = active ? embedMode(active) : 'soon';
  const activeTitle = active ? loc(active, 'title', language) : '';
  const categories = CATEGORY_ORDER.filter((c) => embedList.some((e) => e.category === c));
  const visible = embedList.filter((e) => filter === 'ALL' || e.category === filter);
  const accent = PILLAR_ACCENT.SPARK;
  const canExpand = activeMode === 'native' || activeMode === 'code' || activeMode === 'frame';

  const selectEmbed = (id: string) => {
    setSelectedId(id);
    setFrameKey((k) => k + 1);
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(BLANK_FORM);
    setFormTab('FORM');
    setIsFormOpen(true);
  };

  const openEditForm = (emb: EmbedWidget) => {
    const isCode = Boolean(emb.customCode);
    setEditingId(emb.id);
    setForm({
      title: emb.title,
      titleEn: emb.titleEn || '',
      category: emb.category,
      embedType: isCode ? 'CODE' : 'URL',
      sourceValue: isCode ? (emb.customCode || '') : sourceOf(emb),
      description: emb.description || '',
      descriptionEn: emb.descriptionEn || '',
      author: emb.author || '',
      tags: (emb.tags || []).join(', '),
    });
    setFormTab('FORM');
    setIsFormOpen(true);
  };

  const deleteEmbed = (id: string) => {
    if (!confirm(es ? '¿Eliminar esta experiencia del hub?' : 'Remove this experience from the hub?')) return;
    const updated = embedList.filter((item) => item.id !== id);
    setEmbedList(updated);
    saveAllEmbedWidgets(updated);
    if (selectedId === id && updated.length > 0) setSelectedId(updated[0].id);
  };

  const saveEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    const source = form.sourceValue.trim();
    if (!form.title.trim() || !source) return;
    // A pasted <iframe src="…"> snippet is stored as a plain link so it is framed with the URL rules.
    const snippetSrc = form.embedType === 'CODE' ? source.match(IFRAME_SNIPPET)?.[1] : undefined;
    const isCode = form.embedType === 'CODE' && !snippetSrc;
    const url = isCode ? undefined : (snippetSrc || source);
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const previous = embedList.find((item) => item.id === editingId);

    const widget: EmbedWidget = {
      id: editingId || `custom_embed_${Date.now()}`,
      title: form.title.trim(),
      titleEn: form.titleEn.trim() || undefined,
      category: form.category,
      embedType: isCode ? 'CODE' : 'URL',
      description: form.description.trim(),
      descriptionEn: form.descriptionEn.trim() || undefined,
      thumbnailUrl: previous?.thumbnailUrl || '',
      embedUrl: url ? parseEmbedUrl(url) : undefined,
      externalUrl: url,
      customCode: isCode ? source : undefined,
      author: form.author.trim() || 'Spatialgineers',
      tags,
      isCustomUserApp: true,
    };

    const updated = editingId ? embedList.map((item) => (item.id === editingId ? widget : item)) : [widget, ...embedList];
    setEmbedList(updated);
    saveAllEmbedWidgets(updated);
    setSelectedId(widget.id);
    setFrameKey((k) => k + 1);
    setIsFormOpen(false);
  };

  const submitForm = () => {
    if (formTab !== 'FORM') {
      setFormTab('FORM');
      requestAnimationFrame(() => formRef.current?.requestSubmit());
    } else formRef.current?.requestSubmit();
  };

  const renderStage = (emb: EmbedWidget, mode: EmbedMode, where: 'inline' | 'full') => {
    if (mode === 'native') {
      const Native = NATIVE_COMPONENTS[emb.id] || SummitDroneMiniGame;
      return <LazyBoundary fallback={<LazyFallback />}><Native /></LazyBoundary>;
    }
    if (mode === 'code') {
      return (
        <iframe
          key={`code_${emb.id}_${frameKey}_${language}`}
          srcDoc={withLang(emb.customCode || '', language)}
          title={loc(emb, 'title', language)}
          className="sgx-embeds__frame"
          sandbox={CODE_SANDBOX}
          allow={CODE_ALLOW}
        />
      );
    }
    if (mode === 'frame') {
      const url = parseEmbedUrl(sourceOf(emb));
      return (
        <iframe
          key={`url_${emb.id}_${frameKey}`}
          src={url}
          title={loc(emb, 'title', language)}
          className="sgx-embeds__frame"
          sandbox={frameSandbox(url)}
          allow={FRAME_ALLOW}
          allowFullScreen
          loading={where === 'inline' ? 'lazy' : undefined}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      );
    }
    const href = emb.externalUrl || emb.embedUrl || '';
    return (
      <div className="sgx-embeds__away">
        <Thumb embed={emb} className="sgx-embeds__away-art" />
        <div className="sgx-embeds__away-copy">
          <p className="sgx-embeds__kicker">{mode === 'soon' ? (es ? 'Próximamente' : 'Coming soon') : (es ? 'Vive en otro sitio' : 'Lives on another site')}</p>
          <h3>{loc(emb, 'title', language)}</h3>
          <p>{loc(emb, 'description', language)}</p>
          {mode === 'link' ? (
            <>
              <p className="sgx-embeds__note">
                {es ? `${hostOf(href)} no se puede mostrar dentro de esta página, así que se abre en una pestaña nueva.` : `${hostOf(href)} can't be shown inside this page, so it opens in a new tab.`}
              </p>
              <a className="sgx-btn" href={href} target="_blank" rel="noopener noreferrer">
                {linkLabel(href, es)} <ExternalLink className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">{es ? '(abre en pestaña nueva)' : '(opens in a new tab)'}</span>
              </a>
            </>
          ) : (
            <>
              <p className="sgx-embeds__note">{es ? 'Anunciaremos el enlace en el canal de YouTube de Spatialgineers.' : 'We will announce the link on the Spatialgineers YouTube channel.'}</p>
              <a className="sgx-btn sgx-btn--ground" href={SGX_YOUTUBE} target="_blank" rel="noopener noreferrer">
                {es ? 'Seguir en YouTube' : 'Follow on YouTube'} <ExternalLink className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">{es ? '(abre en pestaña nueva)' : '(opens in a new tab)'}</span>
              </a>
            </>
          )}
        </div>
      </div>
    );
  };

  const crumbs = (
    <>
      <span>SGX.Spark</span>
      <ChevronRight className="w-3 h-3" aria-hidden="true" />
      <span>{es ? 'Juegos y laboratorios' : 'Games & labs'}</span>
      <ChevronRight className="w-3 h-3" aria-hidden="true" />
    </>
  );

  const formSource = form.sourceValue.trim();
  const formSnippet = formSource.match(IFRAME_SNIPPET)?.[1];
  const formPreview: EmbedWidget = {
    id: 'preview', title: form.title || (es ? 'Vista previa' : 'Preview'), category: form.category, description: form.description,
    thumbnailUrl: '', author: form.author, tags: [],
    ...(form.embedType === 'CODE' && !formSnippet ? { customCode: formSource } : { embedUrl: formSnippet || formSource }),
  };
  const formPreviewMode = formSource ? embedMode(formPreview) : null;

  if (!active) return null;

  return (
    <div className="sgx-embeds">
      {/* Stage: the open experience */}
      <section ref={stageRef} className="sgx-embeds__stage" aria-labelledby="sgx-embeds-stage-title">
        <header className="sgx-embeds__bar">
          <div className="sgx-embeds__bar-main">
            <nav className="sgx-embeds__crumbs" aria-label={es ? 'Ubicación' : 'Location'}>
              {crumbs}
              <span aria-current="page" className="sgx-embeds__crumb-on">{activeTitle}</span>
            </nav>
            <div className="sgx-embeds__bar-title">
              <h2 id="sgx-embeds-stage-title">{activeTitle}</h2>
              <span className={`sgx-embeds__chip sgx-embeds__chip--${activeMode}`}>{statusText(activeMode, active, es, false)}</span>
            </div>
          </div>
          <div className="sgx-embeds__actions">
            {(activeMode === 'code' || activeMode === 'frame') && (
              <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => setFrameKey((k) => k + 1)}>
                <RefreshCw className="w-4 h-4" aria-hidden="true" /> {es ? 'Recargar' : 'Reload'}
              </button>
            )}
            {activeMode === 'frame' && (
              <a className="sgx-btn sgx-btn--ground sgx-btn--sm" href={active.externalUrl || active.embedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" aria-hidden="true" /> {es ? 'Pestaña nueva' : 'New tab'}
              </a>
            )}
            {canExpand && (
              <button type="button" className="sgx-btn sgx-btn--sm sgx-embeds__fs" onClick={() => setIsFullscreen(true)}>
                <Maximize2 className="w-4 h-4" aria-hidden="true" /> {es ? 'Pantalla completa' : 'Fullscreen'}
              </button>
            )}
          </div>
        </header>

        <div className={`sgx-embeds__view sgx-embeds__view--${activeMode}`}>
          {isFullscreen ? (
            <div className="sgx-embeds__parked">
              <p>{es ? 'Abierto en pantalla completa.' : 'Open in fullscreen.'}</p>
              <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => setIsFullscreen(false)}>{es ? 'Volver aquí' : 'Bring it back here'}</button>
            </div>
          ) : renderStage(active, activeMode, 'inline')}
        </div>

        <footer className="sgx-embeds__foot">
          {activeMode !== 'link' && activeMode !== 'soon' && <p>{loc(active, 'description', language)}</p>}
          <div className="sgx-embeds__foot-meta">
            <span>{es ? 'Por' : 'By'} <b>{active.author}</b></span>
            {isAdmin && activeMode !== 'native' && (
              <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => openEditForm(active)}>
                <Pencil className="w-4 h-4" aria-hidden="true" /> {es ? 'Editar' : 'Edit'}
              </button>
            )}
          </div>
        </footer>
      </section>

      {/* Catalog */}
      <section className="sgx-embeds__catalog" aria-labelledby="sgx-embeds-catalog-title">
        <header className="sgx-embeds__catalog-head">
          <div>
            <p className="sgx-embeds__kicker">{es ? 'Módulo 03.1 · SGX.Spark' : 'Module 03.1 · SGX.Spark'}</p>
            <h2 id="sgx-embeds-catalog-title">{es ? 'Juegos y laboratorios' : 'Games & labs'} <span className="sgx-embeds__count">{embedList.length}</span></h2>
            <p className="sgx-embeds__lede">
              {es
                ? 'Lo nativo y los laboratorios corren aquí mismo; lo que vive en otro sitio se abre en una pestaña nueva.'
                : 'Native games and labs run right here; whatever lives on another site opens in a new tab.'}
            </p>
          </div>
          <div className="sgx-embeds__tools">
            <div className="sgx-embeds__filters" role="group" aria-label={es ? 'Filtrar por tipo' : 'Filter by type'}>
              <button type="button" aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}>{es ? 'Todo' : 'All'}</button>
              {categories.map((c) => (
                <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)}>{CATEGORY_LABEL[c][es ? 'es' : 'en']}</button>
              ))}
            </div>
            {isAdmin && (
              <button type="button" className="sgx-btn sgx-btn--sm" onClick={openAddForm}>
                <Plus className="w-4 h-4" aria-hidden="true" /> {es ? 'Añadir' : 'Add'}
              </button>
            )}
          </div>
        </header>

        <ul className="sgx-embeds__grid">
          {visible.map((emb) => {
            const mode = embedMode(emb);
            const on = emb.id === active.id;
            return (
              <li key={emb.id} className="sgx-embeds__item">
                <button type="button" className={`sgx-embeds__card${on ? ' is-on' : ''}`} data-embed={emb.id} aria-pressed={on} onClick={() => selectEmbed(emb.id)}>
                  <span className="sgx-embeds__thumb"><Thumb embed={emb} /></span>
                  <span className="sgx-embeds__card-body">
                    <span className="sgx-embeds__card-meta">
                      <span>{CATEGORY_LABEL[emb.category]?.[es ? 'es' : 'en'] ?? emb.category}</span>
                      <span className={`sgx-embeds__chip sgx-embeds__chip--${mode}`}>{statusText(mode, emb, es, true)}</span>
                    </span>
                    <span className="sgx-embeds__card-title">{loc(emb, 'title', language)}</span>
                    <span className="sgx-embeds__card-desc">{loc(emb, 'description', language)}</span>
                    <span className="sgx-embeds__card-foot">{on ? (es ? 'En pantalla' : 'On screen') : (es ? 'Abrir' : 'Open')}</span>
                  </span>
                </button>
                {isAdmin && emb.isCustomUserApp && (
                  <div className="sgx-embeds__admin">
                    <button type="button" onClick={() => openEditForm(emb)} aria-label={`${es ? 'Editar' : 'Edit'} ${loc(emb, 'title', language)}`}><Pencil className="w-4 h-4" aria-hidden="true" /></button>
                    <button type="button" onClick={() => deleteEmbed(emb.id)} aria-label={`${es ? 'Eliminar' : 'Remove'} ${loc(emb, 'title', language)}`}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {isFullscreen && canExpand && (
        <SgxDialog
          onClose={() => setIsFullscreen(false)}
          size="full"
          accent={accent}
          dismissable={false}
          className="sgx-embeds-dialog"
          icon={<img src="/holo/spark.png" alt="" />}
          title={activeTitle}
          kicker={statusText(activeMode, active, es, false)}
          headerExtra={activeMode !== 'native' ? (
            <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => setFrameKey((k) => k + 1)}>
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> <span className="sgx-embeds__hide-sm">{es ? 'Recargar' : 'Reload'}</span>
            </button>
          ) : undefined}
        >
          <div className={`sgx-embeds__full sgx-embeds__view--${activeMode}`}>{renderStage(active, activeMode, 'full')}</div>
        </SgxDialog>
      )}

      {isAdmin && isFormOpen && (
        <SgxDialog
          onClose={() => setIsFormOpen(false)}
          size="md"
          accent={accent}
          dismissable={false}
          className="sgx-embeds-form"
          title={editingId ? (es ? 'Editar experiencia' : 'Edit experience') : (es ? 'Añadir experiencia' : 'Add experience')}
          kicker={es ? 'Solo admins · se publica en el hub' : 'Admins only · published to the hub'}
          toolbar={(
            <div className="sgx-hangar__tabs" role="tablist" aria-label={es ? 'Secciones' : 'Sections'}>
              <button type="button" role="tab" aria-selected={formTab === 'FORM'} className={formTab === 'FORM' ? 'is-on' : ''} onClick={() => setFormTab('FORM')}>{es ? 'Datos' : 'Details'}</button>
              <button type="button" role="tab" aria-selected={formTab === 'PREVIEW'} className={formTab === 'PREVIEW' ? 'is-on' : ''} onClick={() => setFormTab('PREVIEW')}>{es ? 'Vista previa' : 'Preview'}</button>
            </div>
          )}
          footer={(
            <>
              <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => setIsFormOpen(false)}>{es ? 'Cancelar' : 'Cancel'}</button>
              <button type="button" className="sgx-btn sgx-btn--sm" onClick={submitForm}>{editingId ? (es ? 'Guardar cambios' : 'Save changes') : (es ? 'Añadir al hub' : 'Add to hub')}</button>
            </>
          )}
        >
          <form ref={formRef} onSubmit={saveEmbed} className="sgx-embeds__form" hidden={formTab !== 'FORM'}>
            <label>
              <span>{es ? 'Título (español) *' : 'Title (Spanish) *'}</span>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>
              <span>{es ? 'Título (inglés)' : 'Title (English)'}</span>
              <input type="text" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
            </label>
            <div className="sgx-embeds__form-row">
              <label>
                <span>{es ? 'Tipo' : 'Type'}</span>
                <select value={form.embedType} onChange={(e) => setForm({ ...form, embedType: e.target.value as EmbedForm['embedType'] })}>
                  <option value="URL">{es ? 'Enlace (URL)' : 'Link (URL)'}</option>
                  <option value="CODE">{es ? 'Código HTML' : 'HTML code'}</option>
                </select>
              </label>
              <label>
                <span>{es ? 'Categoría' : 'Category'}</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as EmbedCategory })}>
                  {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c][es ? 'es' : 'en']}</option>)}
                </select>
              </label>
            </div>
            <label>
              <span>{form.embedType === 'URL' ? (es ? 'Enlace *' : 'Link *') : (es ? 'Código HTML *' : 'HTML code *')}</span>
              {form.embedType === 'URL' ? (
                <input type="url" required value={form.sourceValue} onChange={(e) => setForm({ ...form, sourceValue: e.target.value })} placeholder="https://" />
              ) : (
                <textarea required rows={6} value={form.sourceValue} onChange={(e) => setForm({ ...form, sourceValue: e.target.value })} placeholder="<!DOCTYPE html>…" />
              )}
              <small>
                {form.embedType === 'URL'
                  ? (es ? 'Videos de YouTube o Vimeo y documentos de Google se convierten solos. Los sitios que no se dejan mostrar (Roblox, redes sociales, canales de YouTube) se ofrecen como botón a pestaña nueva.' : 'YouTube or Vimeo videos and Google docs are converted automatically. Sites that refuse to be shown (Roblox, social networks, YouTube channels) are offered as a new-tab button.')
                  : (es ? 'Corre aislado: puede usar scripts, pero no la sesión, el almacenamiento ni la página del Summit. Un <iframe src> pegado se guarda como enlace.' : 'Runs isolated: it can use scripts, but not the Summit session, storage or page. A pasted <iframe src> is saved as a link.')}
              </small>
            </label>
            <label>
              <span>{es ? 'Descripción (español)' : 'Description (Spanish)'}</span>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label>
              <span>{es ? 'Descripción (inglés)' : 'Description (English)'}</span>
              <textarea rows={2} value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
            </label>
            <div className="sgx-embeds__form-row">
              <label>
                <span>{es ? 'Autor / estudio' : 'Author / studio'}</span>
                <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </label>
              <label>
                <span>{es ? 'Etiquetas (separadas por coma)' : 'Tags (comma-separated)'}</span>
                <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </label>
            </div>
          </form>
          {formTab === 'PREVIEW' && (
            <div className={`sgx-embeds__preview sgx-embeds__view--${formPreviewMode || 'soon'}`}>
              {formPreviewMode
                ? renderStage(formPreview, formPreviewMode, 'full')
                : <p className="sgx-embeds__note">{es ? 'Escribe un enlace o código en Datos para verlo aquí.' : 'Enter a link or code in Details to see it here.'}</p>}
            </div>
          )}
        </SgxDialog>
      )}
    </div>
  );
};
