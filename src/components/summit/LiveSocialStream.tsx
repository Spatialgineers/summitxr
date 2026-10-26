import React, { useState, useEffect } from 'react';
import { 
  Instagram, 
  Share2, 
  Heart, 
  MessageCircle, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Radio, 
  Send, 
  X, 
  Tv,
  MapPin,
  TrendingUp,
  Plus,
  Link as LinkIcon,
  ShieldCheck,
  AlertCircle,
  UploadCloud
} from 'lucide-react';
import { 
  fetchSocialPosts, 
  subscribeToSocialPosts,
  likeSocialPost, 
  addCommentToPost, 
  publishAttendeePost,
  OFFICIAL_SUMMIT_HASHTAGS,
  SocialPost, 
  SocialPlatform 
} from '../../lib/realSocialStreamApi';
import { InstagramEmbedCard } from './InstagramEmbedCard';
import { BulkInstagramImportModal } from '../admin/BulkInstagramImportModal';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useAuth } from '../../context/AuthContext';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { TransientSponsorSlot } from './TransientSponsorSlot';

interface LiveSocialStreamProps {
  initialHashtag?: string;
  isCompact?: boolean;
  onOpenBroadcastRoom?: () => void;
  onSelectHashtag?: (hashtag: string) => void;
}

export const LiveSocialStream: React.FC<LiveSocialStreamProps> = ({
  initialHashtag = 'all',
  isCompact = false,
  onOpenBroadcastRoom
}) => {
  const { addXp, user } = useAuth();
  const { styles } = useTenantTheme();

  // Feed State
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedHashtag, setSelectedHashtag] = useState<string>(initialHashtag);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'stage_featured'>('recent');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [copiedHashtags, setCopiedHashtags] = useState<boolean>(false);

  // Modals
  const [activeLightboxPost, setActiveLightboxPost] = useState<SocialPost | null>(null);
  const [activeCommentDrawerPost, setActiveCommentDrawerPost] = useState<SocialPost | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  
  // Link Social Post Modal (Simplified: ONLY URL field + hashtags)
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [publishSocialUrl, setPublishSocialUrl] = useState<string>('');
  const [selectedPublishTags, setSelectedPublishTags] = useState<string[]>(['#SpatialgineersSummit', '#SGX2026']);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Floating heart effect state
  const [floatingHeartPostId, setFloatingHeartPostId] = useState<string | null>(null);

  // 1. Real-time Firestore Subscription
  useEffect(() => {
    setLoading(true);
    // Subscribe to real Firestore updates
    const unsubscribe = subscribeToSocialPosts(
      (realPosts) => {
        setPosts(realPosts);
        setLoading(false);
      },
      (err) => {
        console.warn('Real-time listener fallback, fetching manually:', err);
        loadPosts();
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await fetchSocialPosts({
        hashtag: selectedHashtag,
        platform: selectedPlatform,
        searchQuery,
        sortBy
      });
      setPosts(data);
    } catch (err) {
      console.error('Error fetching real social stream posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-filter when local controls change
  useEffect(() => {
    loadPosts();
  }, [selectedHashtag, selectedPlatform, sortBy]);

  // Handle Like Action
  const handleLike = async (post: SocialPost) => {
    playUiChirp(1100);
    setFloatingHeartPostId(post.id);
    setTimeout(() => setFloatingHeartPostId(null), 800);

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likes: p.likes + 1,
              userLiked: true,
            }
          : p
      )
    );

    const res = await likeSocialPost(post.id);
    if (res.xpAwarded > 0) {
      addXp(res.xpAwarded, 'Me gusta en Live Stream');
    }
  };

  // Handle Add Comment Action
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentDrawerPost || !newCommentText.trim()) return;

    const textToSubmit = newCommentText.trim();
    setNewCommentText('');
    playUiChirp(1000);

    const authorName = user?.displayName || 'Asistente Summit';
    const authorHandle = user?.email ? `@${user.email.split('@')[0]}` : '@asistente';

    const newComment = await addCommentToPost(
      activeCommentDrawerPost.id,
      textToSubmit,
      authorName,
      authorHandle
    );

    // Update active drawer post state & list
    setActiveCommentDrawerPost((prev) =>
      prev
        ? {
            ...prev,
            comments: [...prev.comments, newComment],
            commentsCount: prev.commentsCount + 1,
          }
        : null
    );

    setPosts((prev) =>
      prev.map((p) =>
        p.id === activeCommentDrawerPost.id
          ? {
              ...p,
              comments: [...p.comments, newComment],
              commentsCount: p.commentsCount + 1,
            }
          : p
      )
    );

    addXp(15, 'Comentario en Social Stream');
  };

  // Handle Copy Hashtags
  const handleCopyHashtags = () => {
    const textToCopy = OFFICIAL_SUMMIT_HASHTAGS.join(' ');
    navigator.clipboard.writeText(textToCopy);
    setCopiedHashtags(true);
    playUiChirp(1250);
    setTimeout(() => setCopiedHashtags(false), 2500);
  };

  // Handle Link Real Social Post (ONLY URL + Hashtags)
  const handlePublishUserPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = publishSocialUrl.trim();
    if (!cleanUrl) {
      setPublishError('Por favor ingresa un enlace de publicación válido.');
      return;
    }

    setPublishError(null);
    setIsPublishing(true);
    try {
      let detectedPlatform: SocialPlatform = 'instagram';
      const lower = cleanUrl.toLowerCase();
      if (lower.includes('twitter.com') || lower.includes('x.com')) detectedPlatform = 'x';
      else if (lower.includes('tiktok.com')) detectedPlatform = 'tiktok';
      else if (lower.includes('threads.net')) detectedPlatform = 'threads';
      else if (lower.includes('instagram.com')) detectedPlatform = 'instagram';

      const newPost = await publishAttendeePost({
        content: `Publicación en redes: ${cleanUrl}`,
        hashtags: selectedPublishTags,
        platform: detectedPlatform,
        instagramPostUrl: cleanUrl,
        authorName: user?.displayName || 'Asistente Spatialgineers',
        authorHandle: user?.email ? `@${user.email.split('@')[0]}` : '@asistente_sgx',
        location: 'Chroma Space Studios • San Juan, PR'
      });

      setPosts((prev) => [newPost, ...prev]);
      setIsPublishModalOpen(false);
      setPublishSocialUrl('');
      playUiChirp(1200);
      addXp(50, 'Post enlazado en Live Social Stream');
    } catch (err: any) {
      console.error('Error linking post:', err);
      setPublishError(err?.message || 'Error al guardar el enlace. Intenta nuevamente.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      
      {/* 1. Header Banner */}
      <div 
        className="bg-[var(--sgx-card-bg)] border-2 border-[var(--sgx-primary)] p-5 sm:p-6 shadow-xl relative overflow-hidden" 
        style={{ 
          clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
          boxShadow: '0 0 30px var(--sgx-glow)'
        }}
      >
        
        {/* Glow Background accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[var(--sgx-primary)]/15 via-[var(--sgx-secondary)]/15 to-transparent pointer-events-none rounded-full blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[var(--sgx-primary)] text-black text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1">
                <Instagram className="w-3 h-3 text-black" />
                <span>MURAL COMUNITARIO DE REDES SOCIALES</span>
              </span>

              <span className="px-2.5 py-0.5 bg-[var(--sgx-card-bg)] border border-[var(--sgx-primary)]/70 text-[var(--sgx-primary)] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
                <span>COMUNIDAD EN VIVO</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white uppercase font-['Orbitron',sans-serif] tracking-wider flex items-center gap-2">
              <Radio className="w-6 h-6 text-[var(--sgx-primary)] animate-pulse" />
              <span>LIVE SOCIAL STREAM</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Pega el enlace de tus publicaciones de Instagram, X, TikTok o redes sociales del <strong>Spatialgineers Summit</strong>. Se embeberá directamente en el mural en vivo.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Link Social Post Button */}
            <button
              onClick={() => {
                playUiChirp(840);
                setPublishError(null);
                setIsPublishModalOpen(true);
              }}
              className="sgx-btn py-2 px-4 text-xs font-bold uppercase flex items-center gap-1.5 shadow-lg hover:scale-105 transition-all font-mono cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ENLAZAR POST (+50 XP)</span>
            </button>

            {/* Bulk CSV Import Button */}
            <button
              onClick={() => {
                playUiChirp(880);
                setIsBulkImportOpen(true);
              }}
              className="px-3 py-2 bg-[var(--sgx-bg)] hover:bg-[var(--sgx-primary)] hover:text-black border border-[var(--sgx-primary)]/80 text-[var(--sgx-primary)] text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Importar múltiples publicaciones o reels de Instagram mediante archivo CSV o lista de URLs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>IMPORTAR .CSV</span>
            </button>

            {/* Copy Hashtags CTA */}
            <button
              onClick={handleCopyHashtags}
              className="px-3 py-2 bg-[var(--sgx-bg)] hover:bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-primary)] text-slate-200 text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Copiar hashtags oficiales para Instagram y redes sociales"
            >
              {copiedHashtags ? <Check className="w-3.5 h-3.5 text-[var(--sgx-primary)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />}
              <span>{copiedHashtags ? '¡COPIADOS!' : 'HASHTAGS'}</span>
            </button>

            {/* Reload button */}
            <button
              onClick={() => {
                playUiChirp(800);
                loadPosts();
              }}
              className="p-2 bg-[var(--sgx-bg)] hover:bg-slate-800 border border-[var(--sgx-border)] text-slate-300 transition-colors cursor-pointer"
              title="Recargar feed ahora"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--sgx-primary)]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Hashtags Row */}
        <div className="pt-3 mt-4 border-t border-[var(--sgx-secondary)]/50 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2 text-slate-400 text-[11px]">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
            <span className="text-slate-200 font-bold">HASHTAGS DEL EVENTO:</span>
            <span className="text-[var(--sgx-primary)] font-bold">#SpatialgineersSummit</span>
            <span className="text-slate-600">•</span>
            <span className="text-[var(--sgx-secondary)] font-bold">#SGX2026</span>
            <span className="text-slate-600">•</span>
            <span className="text-[var(--sgx-accent)] font-bold">#ChromaStudios</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">#SanJuanTech</span>
          </div>
        </div>
      </div>

      {/* Transient Sponsor Banner in Live Social Stream */}
      <TransientSponsorSlot 
        slotId="social_stream_banner" 
        variant="banner" 
        showSubtitleLink={true} 
      />

      {/* 2. Instructions Container for Embedding Social Posts */}
      <div 
        className="p-4 sm:p-5 bg-[var(--sgx-card-bg)] border border-[var(--sgx-primary)]/60 space-y-3 relative overflow-hidden"
        style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[var(--sgx-primary)] text-black rounded shrink-0">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs sm:text-sm font-['Orbitron',sans-serif] tracking-wider uppercase flex items-center gap-2">
                <span>¿CÓMO EMBEBER TUS PUBLICACIONES EN EL MURAL?</span>
                <span className="px-2 py-0.5 bg-[var(--sgx-primary)]/20 text-[var(--sgx-primary)] border border-[var(--sgx-primary)]/50 text-[10px] font-mono font-bold">+50 XP</span>
              </h3>
              <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                Presiona <strong>"ENLAZAR POST (+50 XP)"</strong>, pega la URL pública de tu publicación o Reel en Instagram, 𝕏 (Twitter) o TikTok y selecciona los hashtags. Se sincronizará de inmediato en el mural comunitario en tiempo real.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playUiChirp(840);
              setPublishError(null);
              setIsPublishModalOpen(true);
            }}
            className="sgx-btn py-1.5 px-4 text-[11px] font-bold uppercase font-mono shrink-0 cursor-pointer"
          >
            ENLAZAR MI POST (+50 XP)
          </button>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] p-4 space-y-3">
        
        {/* Row A: Hashtags Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
          <span className="text-slate-400 font-bold uppercase whitespace-nowrap text-[11px] flex items-center gap-1">
            <Search className="w-3 h-3 text-[var(--sgx-primary)]" />
            <span>Filtrar por Hashtag:</span>
          </span>

          <button
            onClick={() => setSelectedHashtag('all')}
            className={`px-3 py-1 font-bold whitespace-nowrap transition-all border cursor-pointer ${
              selectedHashtag === 'all'
                ? 'bg-[var(--sgx-primary)] border-[var(--sgx-primary)] text-black shadow'
                : 'bg-[var(--sgx-bg)] border-[var(--sgx-border)] text-slate-300 hover:border-slate-600'
            }`}
          >
            #Todos los Posts
          </button>

          {OFFICIAL_SUMMIT_HASHTAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedHashtag(tag)}
              className={`px-3 py-1 font-bold whitespace-nowrap transition-all border cursor-pointer ${
                selectedHashtag === tag
                  ? 'bg-[var(--sgx-secondary)] border-[var(--sgx-primary)] text-[var(--sgx-primary)] shadow'
                  : 'bg-[var(--sgx-bg)] border-[var(--sgx-border)] text-slate-400 hover:border-slate-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Row B: Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[var(--sgx-border)]">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPosts()}
              placeholder="Buscar por usuario o hashtag..."
              className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-border)] pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[var(--sgx-primary)] font-mono"
            />
          </div>

          {/* Platform filter */}
          <div className="flex items-center gap-1 border border-[var(--sgx-border)] p-0.5 bg-[var(--sgx-bg)]">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'instagram', label: 'Instagram' },
              { id: 'x', label: '𝕏 / Twitter' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id as any)}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  selectedPlatform === p.id
                    ? 'bg-[var(--sgx-secondary)] text-[var(--sgx-primary)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1 border border-[var(--sgx-border)] p-0.5 bg-[var(--sgx-bg)]">
            {[
              { id: 'recent', label: 'Recientes' },
              { id: 'trending', label: 'Más Populares' },
              { id: 'stage_featured', label: 'Proyectados LED' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id as any)}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  sortBy === s.id
                    ? 'bg-[var(--sgx-primary)] text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* 3. Feed Display Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-[#0f0f0f] border border-slate-800">
          <RefreshCw className="w-8 h-8 text-[#FDCC0D] animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Sincronizando stream en tiempo real con Firestore...
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-[#0f0f0f] border border-slate-800 p-6">
          <Instagram className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200 font-mono uppercase">
              No hay publicaciones para el filtro seleccionado
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Sé el primero en enlazar tu publicación de Instagram/X con los hashtags oficiales.
            </p>
          </div>
          <button
            onClick={() => {
              setPublishError(null);
              setIsPublishModalOpen(true);
            }}
            className="sgx-btn py-2 px-5 text-xs font-bold uppercase inline-flex items-center gap-1.5 font-mono cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ENLAZAR MI PRIMER POST</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => {
            const isHeartBursting = floatingHeartPostId === post.id;

            // Render native Instagram embed if available
            if (post.instagramPostUrl && post.instagramPostUrl.includes('instagram.com/')) {
              return (
                <InstagramEmbedCard
                  key={post.id}
                  url={post.instagramPostUrl}
                  caption={post.content}
                  authorHandle={post.author.handle}
                  authorName={post.author.name}
                  timestamp={post.timestamp}
                  likes={post.likes}
                />
              );
            }

            return (
              <article
                key={post.id}
                className={`bg-[var(--sgx-card-bg)] border transition-all hover:border-[var(--sgx-primary)] flex flex-col justify-between relative group ${
                  post.isFeaturedOnStage 
                    ? 'border-[var(--sgx-primary)] shadow-lg shadow-[var(--sgx-glow)]' 
                    : 'border-[var(--sgx-border)]'
                }`}
                style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
              >
                {/* Stage Featured Banner */}
                {post.isFeaturedOnStage && (
                  <div className="bg-[var(--sgx-gradient)] px-3 py-1 flex items-center justify-between text-[10px] font-mono font-bold text-black uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Tv className="w-3 h-3 text-black" />
                      <span>PROYECTADO EN MAIN LED STAGE</span>
                    </span>
                    <span className="bg-black/40 text-white px-1.5 py-0.2 rounded text-[9px]">EN VIVO</span>
                  </div>
                )}

                {/* Card Header: Author Info */}
                <div className="p-3.5 flex items-center justify-between border-b border-[var(--sgx-border)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={post.author.avatar}
                      alt={post.author.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-white text-xs truncate">
                          {post.author.name}
                        </span>
                        {post.author.verified && (
                          <CheckCircle2 className="w-3 h-3 text-[var(--sgx-primary)] shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <span className="truncate">{post.author.handle}</span>
                        {post.author.badge && (
                          <span className="px-1 py-0.2 bg-[var(--sgx-bg)] text-[9px] text-[var(--sgx-primary)] font-bold rounded-xs border border-[var(--sgx-secondary)]/50">
                            {post.author.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Platform Indicator */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono shrink-0">
                    {post.platform === 'instagram' && (
                      <span className="p-1 bg-[var(--sgx-gradient)] rounded text-black" title="Instagram">
                        <Instagram className="w-3 h-3" />
                      </span>
                    )}
                    {post.platform === 'x' && (
                      <span className="px-1.5 py-0.5 bg-black border border-slate-700 text-white font-bold" title="X (Twitter)">
                        𝕏
                      </span>
                    )}
                  </div>
                </div>

                {/* Media Image / Video Poster */}
                {post.mediaUrl && (
                  <div 
                    className="relative bg-black cursor-pointer overflow-hidden group/media aspect-[4/3]"
                    onClick={() => setActiveLightboxPost(post)}
                  >
                    <img
                      src={post.mediaUrl}
                      alt="Contenido social"
                      className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-500"
                    />

                    {/* Double-tap floating heart animation */}
                    {isHeartBursting && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
                        <Heart className="w-20 h-20 text-[var(--sgx-primary)] fill-[var(--sgx-primary)] drop-shadow-2xl" />
                      </div>
                    )}
                  </div>
                )}

                {/* Card Body: Caption & Tags */}
                <div className="p-3.5 space-y-2.5 flex-1">
                  <p className="text-xs text-slate-200 leading-relaxed font-sans break-words">
                    {post.content}
                  </p>

                  {/* Social URL Button if present */}
                  {post.instagramPostUrl && (
                    <a
                      href={post.instagramPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--sgx-bg)] hover:bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] text-[var(--sgx-primary)] text-[11px] font-mono font-bold transition-all rounded-xs"
                    >
                      <LinkIcon className="w-3 h-3 text-[var(--sgx-primary)]" />
                      <span>Ver Publicación en Red Social</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  )}

                  {/* Hashtags list */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {post.hashtags.map((tag) => (
                      <button
                        key={tag}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHashtag(tag);
                        }}
                        className="text-[11px] font-mono text-[var(--sgx-primary)] hover:underline transition-colors font-medium cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  {/* Location & Time */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{post.location}</span>
                    </span>
                    <span className="shrink-0">{post.timestamp}</span>
                  </div>
                </div>

                {/* Card Footer: Engagement Actions */}
                <div className="p-3 bg-[var(--sgx-bg)] border-t border-[var(--sgx-border)] flex items-center justify-between text-xs font-mono">
                  
                  {/* Like Button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleLike(post)}
                      className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                        post.userLiked ? 'text-[var(--sgx-primary)] font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.userLiked ? 'fill-[var(--sgx-primary)] text-[var(--sgx-primary)]' : ''}`} />
                      <span>{post.likes}</span>
                    </button>

                    {/* Comments Button */}
                    <button
                      onClick={() => setActiveCommentDrawerPost(post)}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.commentsCount}</span>
                    </button>
                  </div>

                  {/* Share CTA */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(post.instagramPostUrl || window.location.href);
                      playUiChirp(1200);
                      alert('¡Enlace de publicación copiado!');
                    }}
                    className="p-1 text-slate-400 hover:text-[var(--sgx-primary)] transition-colors cursor-pointer"
                    title="Compartir enlace"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODALS */}

      {/* Modal A: Lightbox Image Viewer */}
      {activeLightboxPost && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveLightboxPost(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-[var(--sgx-card-bg)] border-2 border-[var(--sgx-primary)] overflow-hidden space-y-3 p-4 shadow-2xl"
            style={{ 
              clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
              boxShadow: '0 0 35px var(--sgx-glow)'
            }}
          >
            <button
              onClick={() => setActiveLightboxPost(null)}
              className="absolute top-3 right-3 p-2 text-white bg-black/60 rounded-full hover:bg-black transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={activeLightboxPost.mediaUrl}
              alt="Ampliada"
              className="max-h-[75vh] w-auto mx-auto object-contain"
            />

            <div className="p-2 space-y-1 text-xs font-mono">
              <div className="flex items-center justify-between text-[var(--sgx-primary)]">
                <span className="font-bold">{activeLightboxPost.author.name} ({activeLightboxPost.author.handle})</span>
                <span>{activeLightboxPost.timestamp}</span>
              </div>
              <p className="text-slate-300 font-sans">{activeLightboxPost.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal B: Comments Drawer */}
      {activeCommentDrawerPost && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex justify-end"
          onClick={() => setActiveCommentDrawerPost(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[var(--sgx-card-bg)] border-l-2 border-[var(--sgx-primary)] h-full flex flex-col p-5 space-y-4 relative shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--sgx-border)] pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[var(--sgx-primary)]" />
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Comentarios ({activeCommentDrawerPost.commentsCount})
                </h3>
              </div>
              <button
                onClick={() => setActiveCommentDrawerPost(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {activeCommentDrawerPost.comments.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono py-8 text-center">
                  Aún no hay comentarios. Sé el primero en dejar una opinión.
                </p>
              ) : (
                activeCommentDrawerPost.comments.map((c) => (
                  <div key={c.id} className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-[var(--sgx-primary)]">{c.author} <span className="text-slate-500">{c.handle}</span></span>
                      <span className="text-slate-500">{c.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-200 font-sans">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-[var(--sgx-border)] flex items-center gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Escribe un comentario comunitario..."
                className="flex-1 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--sgx-primary)] font-mono"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="p-2.5 bg-[var(--sgx-primary)] hover:opacity-90 text-black font-bold disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal C: Link Social Post Modal (SIMPLIFIED: ONLY URL FIELD & HASHTAGS) */}
      {isPublishModalOpen && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsPublishModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[var(--sgx-card-bg)] border-2 border-[var(--sgx-primary)] p-5 sm:p-6 space-y-4 shadow-2xl relative"
            style={{ 
              clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
              boxShadow: '0 0 35px var(--sgx-glow)'
            }}
          >
            <div className="flex items-center justify-between border-b border-[var(--sgx-border)] pb-3">
              <div className="flex items-center gap-2">
                <Instagram className="w-5 h-5 text-[var(--sgx-primary)]" />
                <h3 className="text-sm font-bold text-white font-['Orbitron',sans-serif]">
                  ENLAZAR POST DE REDES SOCIALES
                </h3>
              </div>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishUserPost} className="space-y-4 text-xs font-mono">
              
              {/* Error Alert Banner */}
              {publishError && (
                <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}

              {/* Enlace o URL de tu Post */}
              <div className="space-y-1.5">
                <label className="text-slate-200 font-bold uppercase flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
                  <span>Enlace / URL de tu Post *</span>
                </label>
                <input
                  type="url"
                  required
                  value={publishSocialUrl}
                  onChange={(e) => setPublishSocialUrl(e.target.value)}
                  placeholder="Ejemplo: https://www.instagram.com/p/... o https://x.com/usuario/status/..."
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-border)] p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--sgx-primary)] font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Pega la URL pública de tu publicación o Reel de Instagram, X (Twitter) o TikTok para embeberlo en el mural.
                </p>
              </div>

              {/* Hashtag checkboxes */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold uppercase">Hashtags asociados:</label>
                <div className="flex flex-wrap gap-1.5">
                  {OFFICIAL_SUMMIT_HASHTAGS.slice(0, 6).map((tag) => {
                    const isChecked = selectedPublishTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedPublishTags((prev) =>
                            isChecked ? prev.filter((t) => t !== tag) : [...prev, tag]
                          );
                        }}
                        className={`px-2 py-1 text-[11px] border cursor-pointer ${
                          isChecked
                            ? 'bg-[var(--sgx-secondary)] border-[var(--sgx-primary)] text-[var(--sgx-primary)] font-bold'
                            : 'bg-[var(--sgx-bg)] border-[var(--sgx-border)] text-slate-400'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-3 border-t border-[var(--sgx-border)] flex items-center justify-between">
                <span className="text-[var(--sgx-primary)] text-[11px] font-bold">
                  ★ Recompensa: +50 XP
                </span>

                <button
                  type="submit"
                  disabled={isPublishing || !publishSocialUrl.trim()}
                  className="sgx-btn py-2 px-6 text-xs font-bold uppercase disabled:opacity-50 cursor-pointer"
                >
                  {isPublishing ? 'ENLAZANDO...' : 'EMBEBER POST (+50 XP)'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Bulk Instagram Import Modal */}
      <BulkInstagramImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onPostsImported={(imported) => {
          setPosts((prev) => [...imported, ...prev]);
          addXp(100, 'Importación masiva en Social Stream');
        }}
      />

    </div>
  );
};
