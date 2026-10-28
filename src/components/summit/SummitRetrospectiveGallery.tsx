import { GALLERY, useLiveList } from '../../lib/content/liveLists';
import React, { useState } from 'react';
import { 
  Camera, 
  Sparkles, 
  ZoomIn, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ExternalLink, 
  Tag, 
  Info,
  Calendar,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useLanguage } from '../../context/LanguageContext';

export const SummitRetrospectiveGallery: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  const photos = useLiveList(GALLERY);

  const tags = ['ALL', ...Array.from(new Set(photos.map(p => p.tag)))];

  const filteredPhotos = selectedTag === 'ALL' 
    ? photos 
    : photos.filter(p => p.tag === selectedTag);

  const activePhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  const handleNext = () => {
    if (selectedPhotoIndex === null) return;
    playUiChirp(700);
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length);
  };

  const handlePrev = () => {
    if (selectedPhotoIndex === null) return;
    playUiChirp(700);
    setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length);
  };

  return (
    <div className="bg-[#0F0F0F] border-2 border-[var(--sgx-secondary)] p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-bold text-[#FDCC0D] uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#FDCC0D]" />
            <span>{es ? 'MEMORIA HISTÓRICA • RETROSPECTIVA SPATIALGINEERS' : 'HISTORICAL MEMORY • SPATIALGINEERS RETROSPECTIVE'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-['Orbitron',sans-serif]">
            {es ? 'GALERÍA DE HITOS, TALLERES & COMUNIDAD' : 'GALLERY OF MILESTONES, WORKSHOPS & COMMUNITY'}
          </h2>
          <p className="text-xs text-slate-300 font-sans max-w-3xl">
            {es ? 'Un recorrido fotográfico por los orígenes del movimiento: fundadores en acción, demostraciones colectivas de computación espacial, sesiones de podcast y workshops en vivo en Puerto Rico.' : 'A photo tour of the movement\'s origins: founders in action, group spatial computing demos, podcast sessions and live workshops in Puerto Rico.'}
          </p>
        </div>

        {/* Tag Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                playUiChirp(600);
                setSelectedTag(tag);
              }}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-all ${
                selectedTag === tag
                  ? 'bg-[#FDCC0D] text-black shadow-md shadow-[#FDCC0D]/20'
                  : 'bg-[#191919] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tag === 'ALL' ? (es ? 'Todas las Fotos' : 'All Photos') : tag}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Photos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPhotos.map((photo) => {
          const globalIndex = photos.findIndex(p => p.id === photo.id);
          return (
            <div
              key={photo.id}
              onClick={() => {
                playUiChirp(800);
                setSelectedPhotoIndex(globalIndex);
              }}
              className="group relative bg-[#171717] border border-slate-800 hover:border-[#FDCC0D] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-lg flex flex-col"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-black/60 relative">
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity" />
                
                {/* Tag pill */}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 bg-black/75 backdrop-blur-sm border border-[#FDCC0D]/50 text-[#FDCC0D] text-[10px] font-mono font-bold uppercase">
                    {photo.tag}
                  </span>
                </div>

                {/* Hover overlay icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div className="p-2.5 bg-[#FDCC0D] text-black rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                    <ZoomIn className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between bg-[#141414]">
                <div>
                  <h4 className="text-xs font-bold text-white font-['Orbitron',sans-serif] group-hover:text-[#FDCC0D] transition-colors">
                    {photo.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 font-sans line-clamp-2 leading-relaxed">
                    {photo.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>SGX HISTORICAL ARCHIVE</span>
                  <span className="text-[#00DDFF] font-bold flex items-center gap-1">
                    <span>{es ? 'AMPLIAR' : 'ENLARGE'}</span>
                    <ZoomIn className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {selectedPhotoIndex !== null && activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-5xl max-h-[95vh] flex flex-col bg-[#0F0F0F] border-2 border-[#FDCC0D] shadow-2xl overflow-hidden">
            
            {/* Modal Top Bar */}
            <div className="p-4 bg-[#181818] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#FDCC0D] text-black font-mono font-bold text-[10px] uppercase">
                  {es ? 'FOTO ' : 'PHOTO '}{selectedPhotoIndex + 1}{es ? ' DE ' : ' OF '}{photos.length}
                </span>
                <span className="text-xs font-mono text-slate-300 font-bold hidden sm:inline">
                  {activePhoto.tag}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activePhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-[#2B2B2B] hover:bg-[#434343] text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{es ? 'Ver Original' : 'View Original'}</span>
                </a>
                <button
                  onClick={() => {
                    playUiChirp(400);
                    setSelectedPhotoIndex(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white bg-[#2B2B2B] hover:bg-red-950/80 border border-slate-700 hover:border-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo View with Nav Arrows */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[350px] sm:min-h-[480px]">
              <img
                src={activePhoto.url}
                alt={activePhoto.title}
                className="max-h-[65vh] w-auto max-w-full object-contain select-none"
              />

              {/* Prev Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/70 hover:bg-[#FDCC0D] text-white hover:text-black border border-slate-700 hover:border-[#FDCC0D] transition-all rounded-full shadow-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Next Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/70 hover:bg-[#FDCC0D] text-white hover:text-black border border-slate-700 hover:border-[#FDCC0D] transition-all rounded-full shadow-lg"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Bottom Caption */}
            <div className="p-4 sm:p-5 bg-[#181818] border-t border-slate-800 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-['Orbitron',sans-serif]">
                  {activePhoto.title}
                </h3>
                <span className="text-xs font-mono text-[#00DDFF] border border-[#00DDFF]/40 px-2 py-0.5 bg-[#00DDFF]/10">
                  CDN OFICIAL SPATIALGINEERS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                {activePhoto.description}
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
