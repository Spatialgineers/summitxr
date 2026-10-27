import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  ExternalLink, 
  Code2, 
  Eye, 
  Play, 
  Layers, 
  Sparkles, 
  Globe, 
  Maximize2, 
  Minimize2,
  Share2,
  Tv,
  Box,
  Compass,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  Check,
  AlertCircle,
  X,
  Radio,
  FileCode,
  Laptop,
  CheckCircle2
} from 'lucide-react';
import { EmbedWidget, EmbedCategory } from '../../types/summit';
import { SummitDroneMiniGame } from './SummitDroneMiniGame';
import { saveAllEmbedWidgets, loadAllEmbedWidgets } from '../../lib/summitData';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';

interface SummitEmbedsHubProps {
  embeds?: EmbedWidget[];
  onOpenCreateEmbedModal?: () => void;
}

// Utility to convert user links into embed-ready iframe URLs
function parseEmbedUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // YouTube standard watch: youtube.com/watch?v=ID
  const ytWatchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/i);
  if (ytWatchMatch && ytWatchMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytWatchMatch[1]}?autoplay=1&rel=0&enablejsapi=1`;
  }

  // Vimeo: vimeo.com/ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }

  // Spline 3D: my.spline.design/ID
  if (trimmed.includes('my.spline.design')) {
    return trimmed;
  }

  // Google Docs / Sheets / Slides preview
  if (trimmed.includes('docs.google.com') && !trimmed.includes('/preview') && !trimmed.includes('/embed')) {
    return trimmed.replace(/\/edit.*$/, '/preview');
  }

  // If already full URL, return
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export const SummitEmbedsHub: React.FC<SummitEmbedsHubProps> = ({
  embeds: initialEmbedsProp,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [embedList, setEmbedList] = useState<EmbedWidget[]>(() => {
    try {
      const saved = loadAllEmbedWidgets();
      if (saved && saved.length > 0) return saved;
    } catch {}
    return initialEmbedsProp && initialEmbedsProp.length > 0 ? initialEmbedsProp : [];
  });

  // Published CMS changes arrive through the shared 'storage' refresh.
  useEffect(() => {
    const onStorage = () => {
      const saved = loadAllEmbedWidgets();
      if (saved && saved.length > 0) setEmbedList(saved);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const [selectedEmbedId, setSelectedEmbedId] = useState<string>(() => embedList[0]?.id || 'embed_drone_game');
  const [selectedCategory, setSelectedCategory] = useState<EmbedCategory | 'ALL'>('ALL');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [heightMode, setHeightMode] = useState<'STANDARD' | 'EXPANDED' | 'CINEMATIC'>('EXPANDED');
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  // Modal State for Adding / Editing Custom App
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEmbedId, setEditingEmbedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    category: EmbedCategory;
    embedType: 'URL' | 'CODE';
    sourceValue: string;
    description: string;
    author: string;
    tags: string;
  }>({
    title: '',
    category: 'WEBAPP',
    embedType: 'URL',
    sourceValue: '',
    description: '',
    author: 'Spatialgineer Dev',
    tags: 'WebApp, Spatial, Interactive'
  });
  const [modalPreviewTab, setModalPreviewTab] = useState<'FORM' | 'PREVIEW'>('FORM');

  // Keep selectedEmbed valid
  const activeEmbed = embedList.find(e => e.id === selectedEmbedId) || embedList[0];

  const filteredEmbeds = embedList.filter(e => {
    if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;
    return true;
  });

  const handleReloadIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  const handleCopyLink = () => {
    const url = activeEmbed?.embedUrl || activeEmbed?.externalUrl || window.location.href;
    navigator.clipboard?.writeText(url);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleOpenAddModal = () => {
    setEditingEmbedId(null);
    setFormData({
      title: '',
      category: 'WEBAPP',
      embedType: 'URL',
      sourceValue: '',
      description: '',
      author: 'Spatialgineer Creator',
      tags: 'WebApp, Tool, Interactive'
    });
    setModalPreviewTab('FORM');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emb: EmbedWidget) => {
    setEditingEmbedId(emb.id);
    const isCode = emb.embedType === 'CODE' || Boolean(emb.customCode);
    setFormData({
      title: emb.title,
      category: emb.category,
      embedType: isCode ? 'CODE' : 'URL',
      sourceValue: isCode ? (emb.customCode || '') : (emb.embedUrl || emb.externalUrl || ''),
      description: emb.description || '',
      author: emb.author || 'Spatialgineer Creator',
      tags: (emb.tags || []).join(', ')
    });
    setModalPreviewTab('FORM');
    setIsModalOpen(true);
  };

  const handleDeleteEmbed = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm((es ? '¿Estás seguro de que deseas eliminar esta aplicación integrada?' : 'Are you sure you want to remove this embedded app?'))) {
      const updated = embedList.filter(item => item.id !== id);
      setEmbedList(updated);
      saveAllEmbedWidgets(updated);
      if (selectedEmbedId === id && updated.length > 0) {
        setSelectedEmbedId(updated[0].id);
      }
    }
  };

  const handleSaveEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.sourceValue.trim()) return;

    const isCode = formData.embedType === 'CODE' || formData.sourceValue.includes('<');
    const tagsArray = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const parsedUrl = !isCode ? parseEmbedUrl(formData.sourceValue) : undefined;

    const newWidget: EmbedWidget = {
      id: editingEmbedId || `custom_embed_${Date.now()}`,
      title: formData.title.trim(),
      category: formData.category,
      embedType: isCode ? 'CODE' : 'URL',
      description: formData.description.trim() || (es ? 'Aplicación integrada personalizada en Spatialgineers Summit.' : 'Custom app embedded in the Spatialgineers Summit.'),
      thumbnailUrl: '',
      embedUrl: isCode ? undefined : parsedUrl,
      externalUrl: isCode ? undefined : formData.sourceValue.trim(),
      customCode: isCode ? formData.sourceValue.trim() : undefined,
      author: formData.author.trim() || 'Custom Developer',
      tags: tagsArray.length > 0 ? tagsArray : ['Custom', 'App'],
      rating: 5.0,
      featured: true,
      isCustomUserApp: true
    };

    let updatedList: EmbedWidget[];
    if (editingEmbedId) {
      updatedList = embedList.map(item => item.id === editingEmbedId ? newWidget : item);
    } else {
      updatedList = [newWidget, ...embedList];
    }

    setEmbedList(updatedList);
    saveAllEmbedWidgets(updatedList);
    setSelectedEmbedId(newWidget.id);
    setIsModalOpen(false);
  };

  // Determine current active rendering source
  const isCustomCode = activeEmbed?.embedType === 'CODE' || Boolean(activeEmbed?.customCode);
  const activeUrl = !isCustomCode ? parseEmbedUrl(activeEmbed?.embedUrl || activeEmbed?.externalUrl || '') : '';

  const containerHeightClasses = {
    CINEMATIC: 'h-[480px] sm:h-[520px] lg:h-[560px]',
    STANDARD: 'h-[520px] sm:h-[560px] lg:h-[600px]',
    EXPANDED: 'h-[580px] sm:h-[640px] lg:h-[680px]',
  }[heightMode];

  return (
    <div className="space-y-6">
      {/* 1. FULL-WIDTH 100% CORNER-TO-CORNER GAME / EXPERIENCE STAGE ON TOP (ZERO SCROLL) */}
      <div
        className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] overflow-hidden flex flex-col shadow-2xl sgx-crystal-card"
        style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
      >
        {/* Compact Top Bar for Active Game / Experience */}
        <div className="bg-[#0F0F0F] border-b border-[var(--sgx-secondary)]/60 px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5 max-w-full">
            <Gamepad2 className="w-4 h-4 text-[#FDCC0D] shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-white font-['Orbitron',sans-serif] uppercase tracking-wider break-words">
              {activeEmbed && loc(activeEmbed, 'title', language)}
            </span>
            <span
              className="text-[9px] px-2 py-0.5 bg-[#32527B]/40 border border-[#00DDFF]/60 text-[#00DDFF] font-mono shrink-0 font-bold"
              style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
            >
              {activeEmbed?.category}
            </span>
            <span className="hidden md:inline-block text-[10px] font-mono text-slate-400">
              {es ? '• VISOR 100% ESQUINA A ESQUINA SIN SCROLL' : '• 100% EDGE-TO-EDGE VIEWER, NO SCROLL'}
            </span>
            {activeEmbed?.isCustomUserApp && (
              <span
                className="text-[8px] px-1.5 py-0.2 bg-[#FDCC0D] text-black font-bold font-mono shrink-0 uppercase"
                style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
              >
                USER APP
              </span>
            )}
          </div>

          {/* Action Controls: Height Mode (for external iframes), Reload, Share, Fullscreen, External Link */}
          <div className="flex items-center space-x-1.5">
            {activeEmbed?.id !== 'embed_drone_game' && (
              <div
                className="hidden sm:flex items-center bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-0.5 text-[10px] font-mono"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              >
                <button
                  onClick={() => setHeightMode('CINEMATIC')}
                  className={`px-2 py-0.5 transition-colors cursor-pointer ${heightMode === 'CINEMATIC' ? 'bg-[#00DDFF] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                  style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                  title={es ? 'Modo Cine 16:9' : '16:9 Cinema Mode'}
                >
                  16:9
                </button>
                <button
                  onClick={() => setHeightMode('STANDARD')}
                  className={`px-2 py-0.5 transition-colors cursor-pointer ${heightMode === 'STANDARD' ? 'bg-[#00DDFF] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                  style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                  title={es ? 'Modo Estándar' : 'Standard Mode'}
                >
                  {es ? 'ESTÁNDAR' : 'STANDARD'}
                </button>
                <button
                  onClick={() => setHeightMode('EXPANDED')}
                  className={`px-2 py-0.5 transition-colors cursor-pointer ${heightMode === 'EXPANDED' ? 'bg-[#00DDFF] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                  style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                  title={es ? 'Modo Extendido' : 'Extended Mode'}
                >
                  {es ? 'EXPANDIDO' : 'EXPANDED'}
                </button>
              </div>
            )}

            <button
              onClick={handleReloadIframe}
              className="p-1.5 bg-[var(--sgx-bg)] hover:bg-[#32527B] text-slate-300 hover:text-white border border-[var(--sgx-secondary)] transition-colors cursor-pointer"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              title={es ? 'Recargar App Embebida' : 'Reload Embedded App'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopyLink}
              className="p-1.5 bg-[var(--sgx-bg)] hover:bg-[#32527B] text-slate-300 hover:text-white border border-[var(--sgx-secondary)] transition-colors relative cursor-pointer"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              title={es ? 'Copiar Enlace de la App' : 'Copy App Link'}
            >
              <Share2 className="w-3.5 h-3.5" />
              {copiedToast && (
                <span
                  className="absolute -top-7 right-0 bg-[#FDCC0D] text-black text-[9px] font-bold font-mono px-2 py-0.5 whitespace-nowrap shadow-lg"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                >
                  {es ? '¡Copiado!' : 'Copied!'}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsFullscreen(true)}
              className="px-2.5 py-1 bg-[#32527B]/60 hover:bg-[#00DDFF] hover:text-black text-[#00DDFF] border border-[#00DDFF]/60 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              title={es ? 'Pantalla Completa Inmersiva' : 'Immersive Fullscreen'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{es ? 'PANTALLA COMPLETA' : 'FULLSCREEN'}</span>
            </button>

            {(activeEmbed?.externalUrl || activeEmbed?.embedUrl) && (
              <a
                href={activeEmbed.externalUrl || activeEmbed.embedUrl}
                target="_blank"
                rel="noreferrer"
                className="sgx-btn-cyan px-2.5 py-1 text-[10px] font-bold font-mono flex items-center space-x-1 shadow-md shadow-[var(--sgx-neon)]/15 shrink-0"
              >
                <span className="hidden sm:inline">{es ? 'NUEVA PESTAÑA' : 'NEW TAB'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Full-Width Corner-to-Corner Viewport with ZERO Scroll */}
        {activeEmbed?.id === 'embed_drone_game' ? (
          <div className="w-full overflow-hidden">
            <SummitDroneMiniGame />
          </div>
        ) : (
          <div className={`relative w-full ${containerHeightClasses} bg-black flex items-center justify-center overflow-hidden transition-all duration-300`}>
            {isCustomCode ? (
              <iframe
                key={`custom_code_${activeEmbed?.id}_${iframeKey}`}
                srcDoc={activeEmbed?.customCode}
                title={activeEmbed?.title || 'SGX Custom Code Sandbox'}
                className="w-full h-full border-0 bg-[#0A0A0A]"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads allow-modals"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; xr-spatial-tracking; fullscreen; camera; microphone"
                allowFullScreen
              />
            ) : activeUrl ? (
              <div className="w-full h-full relative bg-slate-950">
                <iframe
                  key={`url_frame_${activeEmbed?.id}_${iframeKey}`}
                  src={activeUrl}
                  title={activeEmbed?.title || 'SGX Embedded App'}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads allow-modals"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; xr-spatial-tracking; fullscreen; camera; microphone"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <img
                  src={activeEmbed?.thumbnailUrl || '/brand/sgx-bolt.svg'}
                  alt={activeEmbed?.title}
                  className="w-28 h-28 object-cover border border-[var(--sgx-secondary)] mb-2"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                />
                <span className="text-base font-bold text-white font-['Orbitron',sans-serif]">{activeEmbed && loc(activeEmbed, 'title', language)}</span>
                <p className="text-xs text-slate-400 max-w-md font-mono">{activeEmbed && loc(activeEmbed, 'description', language)}</p>
                {activeEmbed?.externalUrl && (
                  <a
                    href={activeEmbed.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="sgx-btn px-5 py-2.5 text-xs font-bold flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{es ? 'ABRIR ENLACE EN NUEVA PESTAÑA' : 'OPEN LINK IN NEW TAB'}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Compact Description & Author Footer Bar */}
        <div className="px-4 py-2.5 bg-[#0F0F0F] border-t border-[var(--sgx-secondary)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-mono">
            <span className="line-clamp-1">{activeEmbed && loc(activeEmbed, 'description', language)}</span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400">
              {es ? 'Autor: ' : 'Author: '}<strong className="text-[#FDCC0D]">{activeEmbed?.author}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => handleOpenEditModal(activeEmbed)}
              className="px-2.5 py-1 bg-[var(--sgx-bg)] hover:bg-[#32527B] text-slate-300 hover:text-white border border-[var(--sgx-secondary)] text-[11px] font-mono flex items-center space-x-1.5 transition-colors cursor-pointer"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              title={es ? 'Editar Configuración de la App' : 'Edit App Settings'}
            >
              <Edit3 className="w-3 h-3" />
              <span>{es ? 'CONFIGURAR' : 'CONFIGURE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. EMBEDDED EXPERIENCES HUB CATALOG BELOW IN A 4-COLUMN 3D GRID */}
      <div
        className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-4 sm:p-5 shadow-xl sgx-crystal-card space-y-4"
        style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--sgx-secondary)]/50 pb-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <Box className="w-5 h-5 text-[#FDCC0D]" />
              <h3 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
                {es ? 'HUB DE EXPERIENCIAS EMBEBIDAS, MINIJUEGOS & SANDBOX (' : 'EMBEDDED EXPERIENCES, MINI-GAMES & SANDBOX HUB ('}{filteredEmbeds.length})
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-mono">
              {es ? 'Selecciona cualquier experiencia del catálogo inferior para lanzarla arriba de esquina a esquina, o integra tu propio juego/código WebGL.' : 'Pick any experience from the catalog below to launch it edge to edge above, or embed your own WebGL game/code.'}
            </p>
          </div>

          {/* Categories Bar & Quick Add Button */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#FDCC0D] text-black font-extrabold shadow-md'
                    : 'bg-[var(--sgx-bg)] text-slate-300 border border-[var(--sgx-secondary)] hover:text-white'
                }`}
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                {es ? 'TODOS (' : 'ALL ('}{embedList.length})
              </button>
              <button
                onClick={() => setSelectedCategory('MINI_GAME')}
                className={`px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedCategory === 'MINI_GAME'
                    ? 'bg-[#FFBB00] text-black font-extrabold shadow-md'
                    : 'bg-[var(--sgx-bg)] text-slate-300 border border-[var(--sgx-secondary)] hover:text-white'
                }`}
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                {es ? 'MINIJUEGOS' : 'MINI-GAMES'}
              </button>
              <button
                onClick={() => setSelectedCategory('WEBGL_XR')}
                className={`px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedCategory === 'WEBGL_XR'
                    ? 'bg-[#00DDFF] text-black font-extrabold shadow-md'
                    : 'bg-[var(--sgx-bg)] text-slate-300 border border-[var(--sgx-secondary)] hover:text-white'
                }`}
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                SPLINE 3D / XR
              </button>
              <button
                onClick={() => setSelectedCategory('STREAM_VIDEO')}
                className={`px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedCategory === 'STREAM_VIDEO'
                    ? 'bg-[#32527B] text-white border border-[#00DDFF] font-extrabold shadow-md'
                    : 'bg-[var(--sgx-bg)] text-slate-300 border border-[var(--sgx-secondary)] hover:text-white'
                }`}
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                {es ? 'STREAMS EN VIVO' : 'LIVE STREAMS'}
              </button>
              <button
                onClick={() => setSelectedCategory('CUSTOM_CODE')}
                className={`px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedCategory === 'CUSTOM_CODE'
                    ? 'bg-[#32527B] text-white border border-[#FDCC0D] font-extrabold shadow-md'
                    : 'bg-[var(--sgx-bg)] text-slate-300 border border-[var(--sgx-secondary)] hover:text-white'
                }`}
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                {es ? 'SANDBOX / CÓDIGO' : 'SANDBOX / CODE'}
              </button>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="sgx-btn px-4 py-2 text-xs font-bold font-mono flex items-center space-x-1.5 shadow-lg shadow-[var(--sgx-accent)]/20 hover:scale-105 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{es ? '＋ INTEGRAR APP O CÓDIGO' : '＋ EMBED APP OR CODE'}</span>
            </button>
          </div>
        </div>

        {/* 4-Column Responsive Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredEmbeds.map(emb => {
            const isSelected = emb.id === selectedEmbedId;
            return (
              <div
                key={emb.id}
                onClick={() => setSelectedEmbedId(emb.id)}
                className={`w-full text-left p-3.5 border transition-all flex flex-col justify-between gap-3 cursor-pointer group relative sgx-spatial-card ${
                  isSelected
                    ? 'border-[#FDCC0D] bg-[#FDCC0D]/10 shadow-lg ring-1 ring-[#FDCC0D]'
                    : 'border-[#32527B]/70 bg-[var(--sgx-bg)] hover:border-[#00DDFF]'
                }`}
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="flex items-start space-x-3">
                  <img
                    src={emb.thumbnailUrl || '/brand/sgx-bolt.svg'}
                    alt={emb.title}
                    className="w-14 h-14 object-cover border border-[#32527B] shrink-0 group-hover:border-[#00DDFF] transition-colors"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate font-['Orbitron',sans-serif] group-hover:text-[#FDCC0D]">
                        {loc(emb, 'title', language)}
                      </span>
                      {emb.featured && (
                        <span
                          className="text-[8px] bg-[#FDCC0D] text-black font-bold px-1.5 py-0.2 uppercase shrink-0"
                          style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                        >
                          {es ? 'ACTIVO' : 'ACTIVE'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="text-[9px] text-[#00DDFF] font-mono uppercase font-bold">
                        {emb.category}
                      </span>
                      {emb.isCustomUserApp && (
                        <span className="text-[8px] text-[#FDCC0D] font-mono">• USER</span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 font-mono leading-snug">
                      {loc(emb, 'description', language)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono">
                  <span className="text-slate-400 truncate">{emb.author}</span>
                  <span className={`font-bold ${isSelected ? 'text-[#FDCC0D]' : 'text-[#00DDFF]'}`}>
                    {isSelected ? (es ? 'EN PANTALLA ARRIBA ▲' : 'ON SCREEN ABOVE ▲') : (es ? 'CARGAR EN VISOR ▲' : 'LOAD IN VIEWER ▲')}
                  </span>
                </div>

                {emb.isCustomUserApp && (
                  <button
                    onClick={e => handleDeleteEmbed(emb.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity absolute top-2 right-2 cursor-pointer"
                    title={es ? 'Eliminar esta app personalizada' : 'Remove this custom app'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Fullscreen Immersive Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Floating Header */}
          <div className="bg-[#131313]/95 backdrop-blur-md border-b border-[var(--sgx-secondary)] px-6 py-3 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              <Box className="w-5 h-5 text-[var(--sgx-neon)]" />
              <span className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                {activeEmbed && loc(activeEmbed, 'title', language)}
              </span>
              <span 
                className="text-[10px] px-2 py-0.5 bg-[var(--sgx-neon)]/20 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] font-mono"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              >
                {es ? 'PANTALLA COMPLETA' : 'FULLSCREEN'}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleReloadIframe}
                className="p-2 bg-[var(--sgx-bg)] hover:bg-[var(--sgx-secondary)] text-white border border-[var(--sgx-secondary)] text-xs font-mono flex items-center space-x-1.5"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              >
                <RefreshCw className="w-4 h-4" />
                <span>{es ? 'RECARGAR' : 'RELOAD'}</span>
              </button>

              <button
                onClick={() => setIsFullscreen(false)}
                className="sgx-btn px-4 py-2 text-xs font-bold font-mono flex items-center space-x-1.5"
              >
                <Minimize2 className="w-4 h-4" />
                <span>{es ? 'SALIR DE PANTALLA COMPLETA' : 'EXIT FULLSCREEN'}</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Iframe Canvas */}
          <div className="flex-1 w-full h-full bg-black relative">
            {activeEmbed?.id === 'embed_drone_game' ? (
              <SummitDroneMiniGame />
            ) : isCustomCode ? (
              <iframe
                key={`fs_code_${activeEmbed?.id}_${iframeKey}`}
                srcDoc={activeEmbed?.customCode}
                title={activeEmbed?.title}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads allow-modals"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; xr-spatial-tracking; fullscreen; camera; microphone"
                allowFullScreen
              />
            ) : activeUrl ? (
              <iframe
                key={`fs_url_${activeEmbed?.id}_${iframeKey}`}
                src={activeUrl}
                title={activeEmbed?.title}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads allow-modals"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; xr-spatial-tracking; fullscreen; camera; microphone"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-mono">
                {es ? 'Sin contenido disponible.' : 'No content available.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Modal for Integrating ANY Custom App (Link or Code) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div 
            className="bg-[var(--sgx-card-bg)] border-2 border-[var(--sgx-neon)] max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            style={{ 
              clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
              boxShadow: '0 0 35px rgba(0, 221, 255, 0.18)' 
            }}
          >
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-3">
              <div className="flex items-center space-x-2.5">
                <Code2 className="w-6 h-6 text-[var(--sgx-neon)]" />
                <h3 className="text-base sm:text-lg font-bold text-white uppercase font-['Orbitron',sans-serif]">
                  {editingEmbedId ? (es ? 'EDITAR EXPERIENCIA EMBEBIDA' : 'EDIT EMBEDDED EXPERIENCE') : (es ? 'INTEGRAR NUEVA APP O CÓDIGO EMBEBIDO' : 'EMBED A NEW APP OR CODE')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher: Form vs Live Preview */}
            <div className="flex items-center space-x-2 border-b border-[var(--sgx-secondary)]/40 pb-2">
              <button
                type="button"
                onClick={() => setModalPreviewTab('FORM')}
                className={`px-3 py-1.5 text-xs font-mono font-bold transition-colors ${
                  modalPreviewTab === 'FORM' ? 'bg-[var(--sgx-neon)] text-black' : 'bg-[var(--sgx-bg)] text-slate-400 border border-[var(--sgx-secondary)]'
                }`}
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                {es ? '⚙️ CONFIGURACIÓN' : '⚙️ SETTINGS'}
              </button>
              <button
                type="button"
                onClick={() => setModalPreviewTab('PREVIEW')}
                className={`px-3 py-1.5 text-xs font-mono font-bold transition-colors ${
                  modalPreviewTab === 'PREVIEW' ? 'bg-[var(--sgx-accent)] text-black' : 'bg-[var(--sgx-bg)] text-slate-400 border border-[var(--sgx-secondary)]'
                }`}
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                {es ? '👁️ VISTA PREVIA EN VIVO' : '👁️ LIVE PREVIEW'}
              </button>
            </div>

            {modalPreviewTab === 'FORM' ? (
              <form onSubmit={handleSaveEmbed} className="space-y-4">
                
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-white font-mono mb-1">
                    {es ? 'TÍTULO DE LA APLICACIÓN / EXPERIENCIA *' : 'APP / EXPERIENCE TITLE *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={es ? 'Ej. Mi Tablero Miro, Escena Spline 3D, Stream YouTube, Juego HTML5...' : 'E.g. My Miro Board, Spline 3D Scene, YouTube Stream, HTML5 Game...'}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  />
                </div>

                {/* Integration Type: URL vs Raw Code */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white font-mono mb-1">
                      {es ? 'TIPO DE INTEGRACIÓN' : 'INTEGRATION TYPE'}
                    </label>
                    <select
                      value={formData.embedType}
                      onChange={(e) => setFormData({ ...formData, embedType: e.target.value as any })}
                      className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                      <option value="URL">{es ? '🌐 Enlace Web Directo (URL / Iframe Link)' : '🌐 Direct Web Link (URL / Iframe Link)'}</option>
                      <option value="CODE">{es ? '💻 Código HTML / Snippet Iframe / Canvas' : '💻 HTML Code / Iframe Snippet / Canvas'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white font-mono mb-1">
                      {es ? 'CATEGORÍA' : 'CATEGORY'}
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                      <option value="WEBAPP">{es ? 'WebApp / Herramienta' : 'Web App / Tool'}</option>
                      <option value="MINI_GAME">{es ? 'Minijuego 2D/3D' : '2D/3D Mini-Game'}</option>
                      <option value="WEBGL_XR">WebGL / WebXR / Spline 3D</option>
                      <option value="STREAM_VIDEO">Stream / Video (YouTube)</option>
                      <option value="METAVERSE_ROBLOX">{es ? 'Mundo Virtual / Roblox Portal' : 'Virtual World / Roblox Portal'}</option>
                      <option value="CUSTOM_CODE">{es ? 'Sandbox de Código Personalizado' : 'Custom Code Sandbox'}</option>
                    </select>
                  </div>
                </div>

                {/* Source Input: URL or Code */}
                <div>
                  <label className="block text-xs font-bold text-white font-mono mb-1">
                    {formData.embedType === 'URL' ? (es ? 'ENLACE URL DE LA APP O STREAM *' : 'APP OR STREAM URL *') : (es ? 'CÓDIGO HTML / IFRAME SNIPPET *' : 'HTML CODE / IFRAME SNIPPET *')}
                  </label>
                  
                  {formData.embedType === 'URL' ? (
                    <input
                      type="url"
                      required
                      value={formData.sourceValue}
                      onChange={(e) => setFormData({ ...formData, sourceValue: e.target.value })}
                      placeholder="https://my.spline.design/... o https://youtube.com/watch?v=... o https://excalidraw.com..."
                      className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    />
                  ) : (
                    <textarea
                      required
                      rows={6}
                      value={formData.sourceValue}
                      onChange={(e) => setFormData({ ...formData, sourceValue: e.target.value })}
                      placeholder={es ? '<iframe src=\'...\' width=\'100%\' height=\'500\'></iframe> o <!DOCTYPE html><html>...</html>' : '<iframe src=\'...\' width=\'100%\' height=\'500\'></iframe> or <!DOCTYPE html><html>...</html>'}
                      className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-3 text-xs text-white font-mono focus:outline-none focus:border-[var(--sgx-neon)] font-mono leading-relaxed"
                      style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                    />
                  )}
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    {formData.embedType === 'URL'
                      ? (es ? 'Soporta enlaces directos, YouTube, Vimeo, Spline 3D, Google Docs, Excalidraw, etc. Convertimos automáticamente enlaces para renderizado óptimo.' : 'Supports direct links, YouTube, Vimeo, Spline 3D, Google Docs, Excalidraw, etc. Links are converted automatically for optimal rendering.')
                      : (es ? 'Puedes pegar una etiqueta <iframe> completa o un documento HTML/JS interactivo completo. Se ejecuta en un sandbox seguro con scripts habilitados.' : 'You can paste a full <iframe> tag or a complete interactive HTML/JS document. It runs in a secure sandbox with scripts enabled.')}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-white font-mono mb-1">
                    {es ? 'DESCRIPCIÓN DE LA EXPERIENCIA' : 'EXPERIENCE DESCRIPTION'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={es ? 'Describe qué hace esta app o experiencia para los participantes del Summit...' : 'Describe what this app or experience does for Summit participants...'}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-3 text-xs text-white font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  />
                </div>

                {/* Author & Tags */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white font-mono mb-1">
                      {es ? 'AUTOR / ESTUDIO' : 'AUTHOR / STUDIO'}
                    </label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder={es ? 'Nombre del creador' : 'Creator name'}
                      className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] px-3 py-2 text-xs text-white font-mono"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white font-mono mb-1">
                      {es ? 'TAGS (SEPARADOS POR COMA)' : 'TAGS (COMMA-SEPARATED)'}
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="3D, Tool, AI, Shader..."
                      className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] px-3 py-2 text-xs text-white font-mono"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[var(--sgx-secondary)]/60">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-slate-300 text-xs font-mono hover:text-white"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    {es ? 'CANCELAR' : 'CANCEL'}
                  </button>
                  <button
                    type="submit"
                    className="sgx-btn-cyan px-6 py-2.5 text-xs font-bold font-mono shadow-lg shadow-[var(--sgx-neon)]/20"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    {editingEmbedId ? (es ? 'GUARDAR CAMBIOS' : 'SAVE CHANGES') : (es ? 'GUARDAR E INTEGRAR APP' : 'SAVE AND EMBED APP')}
                  </button>
                </div>

              </form>
            ) : (
              /* Live Preview Tab in Modal */
              <div className="space-y-3">
                <div 
                  className="h-[360px] bg-black border border-[var(--sgx-secondary)] overflow-hidden relative"
                  style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                >
                  {formData.sourceValue ? (
                    formData.embedType === 'CODE' || formData.sourceValue.includes('<') ? (
                      <iframe
                        srcDoc={formData.sourceValue}
                        title="Modal Live Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
                        allowFullScreen
                      />
                    ) : (
                      <iframe
                        src={parseEmbedUrl(formData.sourceValue)}
                        title="Modal Live Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; xr-spatial-tracking; fullscreen"
                        allowFullScreen
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs p-4 text-center">
                      <Code2 className="w-8 h-8 mb-2 opacity-50" />
                      <span>{es ? 'Ingresa un enlace URL o código HTML en la pestaña de configuración para previsualizarlo en vivo.' : 'Enter a URL or HTML code in the settings tab to preview it live.'}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {es ? 'Vista previa renderizada en tiempo real mediante sandbox iframe.' : 'Preview rendered in real time in an iframe sandbox.'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveEmbed}
                    disabled={!formData.title.trim() || !formData.sourceValue.trim()}
                    className="sgx-btn px-5 py-2 text-xs font-bold font-mono disabled:opacity-50"
                  >
                    {es ? 'GUARDAR APP' : 'SAVE APP'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
