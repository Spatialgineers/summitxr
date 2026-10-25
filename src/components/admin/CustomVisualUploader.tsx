import React, { useState } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Shield, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Box, 
  Link as LinkIcon, 
  Sliders, 
  Layers,
  FileCode
} from 'lucide-react';
import { compressImageToDataUrl, CompressionResult } from '../../lib/imageCompressor';
import { CustomVisualAssets } from '../../types/engine';

interface CustomVisualUploaderProps {
  customAssets: CustomVisualAssets;
  onUpdateCustomAssets: (assets: CustomVisualAssets) => void;
}

export const CustomVisualUploader: React.FC<CustomVisualUploaderProps> = ({
  customAssets,
  onUpdateCustomAssets,
}) => {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<Record<string, CompressionResult>>({});

  // Input states for direct URL links
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({
    customBackgroundUrl: customAssets.customBackgroundUrl || '',
    customLogoUrl: customAssets.customLogoUrl || '',
    customParticleTextureUrl: customAssets.customParticleTextureUrl || '',
    customModel3dUrl: customAssets.customModel3dUrl || '',
  });

  const [activeTab, setActiveTab] = useState<'all' | '2d' | '3d' | 'particles'>('all');

  const handleApplyUrl = (assetKey: keyof CustomVisualAssets) => {
    const value = urlInputs[assetKey]?.trim() || null;
    onUpdateCustomAssets({
      ...customAssets,
      [assetKey]: value,
    });
    setSuccessMessage(`Recurso actualizado con éxito para ${assetKey}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    assetType: 'customBackgroundUrl' | 'customLogoUrl' | 'customParticleTextureUrl' | 'customModel3dUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingType(assetType);
    setErrorMessage(null);

    try {
      if (assetType === 'customModel3dUrl') {
        // For 3D models (.glb, .gltf, .obj) read as Data URL
        if (file.size > 15 * 1024 * 1024) {
          throw new Error('El modelo 3D no debe exceder los 15 MB.');
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          onUpdateCustomAssets({
            ...customAssets,
            customModel3dUrl: dataUrl,
          });
          setUrlInputs(prev => ({ ...prev, customModel3dUrl: `[Archivo Local 3D: ${file.name}]` }));
          setLoadingType(null);
          setSuccessMessage(`Modelo 3D "${file.name}" cargado con éxito.`);
          setTimeout(() => setSuccessMessage(null), 3000);
        };
        reader.onerror = () => {
          throw new Error('Error al leer el archivo del modelo 3D.');
        };
        reader.readAsDataURL(file);
        return;
      }

      // For 2D images, compress to strictly under 1 MB
      const result = await compressImageToDataUrl(file, 1048576, 1920);

      setCompressionStats((prev) => ({
        ...prev,
        [assetType]: result,
      }));

      onUpdateCustomAssets({
        ...customAssets,
        [assetType]: result.dataUrl,
      });
      setUrlInputs(prev => ({ ...prev, [assetType]: `[Archivo Local: ${file.name}]` }));
      setSuccessMessage(`Imagen "${file.name}" comprimida y cargada.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Upload & Compression error:', err);
      setErrorMessage(err?.message || 'Error al procesar el archivo.');
    } finally {
      if (assetType !== 'customModel3dUrl') {
        setLoadingType(null);
      }
      e.target.value = '';
    }
  };

  const handleRemoveAsset = (assetType: keyof CustomVisualAssets) => {
    onUpdateCustomAssets({
      ...customAssets,
      [assetType]: null,
    });
    setUrlInputs(prev => ({ ...prev, [assetType]: '' }));
    setCompressionStats((prev) => {
      const copy = { ...prev };
      delete copy[assetType as string];
      return copy;
    });
  };

  const formatKB = (bytes: number) => {
    if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(2)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  // Quick Preset Links for fast staging
  const quickLinks = [
    {
      name: 'Cyberpunk Hex Grid (Fondo)',
      target: 'customBackgroundUrl' as const,
      url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80',
    },
    {
      name: 'Deep Space Nebula (Fondo)',
      target: 'customBackgroundUrl' as const,
      url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    },
    {
      name: 'Cyber Glowing Spark (Partícula)',
      target: 'customParticleTextureUrl' as const,
      url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png',
    },
    {
      name: 'Tech Snowflake / Crystal (Partícula)',
      target: 'customParticleTextureUrl' as const,
      url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/snowflake2.png',
    },
    {
      name: 'SGX Trophy 3D (.glb)',
      target: 'customModel3dUrl' as const,
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
    },
    {
      name: 'Astronaut Helmet 3D (.glb)',
      target: 'customModel3dUrl' as const,
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    },
  ];

  return (
    <div className="sgx-panel space-y-4 border-2 border-[var(--sgx-neon)]/40 bg-[#121212]/95 p-4 md:p-5 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sgx-secondary)] pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-[var(--sgx-neon)] animate-pulse" />
          <h3 className="text-xs md:text-sm font-bold text-[var(--sgx-neon)] uppercase tracking-wider">
            SGX ASSET HUB • MODELOS 3D, IMÁGENES 2D Y SPRITES DE PARTÍCULAS
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-2.5 py-1 bg-[var(--sgx-neon)]/10 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] font-bold">
            ⚡ CARGA POR LINK / UPLOAD
          </span>
          <span className="text-[10px] px-2.5 py-1 bg-[var(--sgx-accent)]/10 border border-[var(--sgx-accent)] text-[var(--sgx-accent)] font-bold">
            🎮 MOTOR 3D ZERO-STUTTER
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-300 font-sans leading-relaxed">
        Personaliza al máximo el escenario 3D para tu evento en vivo. Sube archivos locales o pega enlaces directos de imágenes, sprites de partículas o modelos 3D (<code className="text-[var(--sgx-neon)]">.glb, .gltf, .obj</code>). La memoria y texturas se optimizan automáticamente para mantener 60 FPS sin loops de recarga.
      </p>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-amber-950/80 border border-[#FDCC0D] text-[#FDCC0D] text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-[#FDCC0D] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Quick Test Links Tray */}
      <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/60 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-[var(--sgx-accent)] font-bold">
          <span className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ENLACES RÁPIDOS DE PRUEBA (1-CLICK INJECT)</span>
          </span>
          <span className="text-[9px] text-[#888888]">Presets de prueba verificados</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                setUrlInputs(prev => ({ ...prev, [item.target]: item.url }));
                onUpdateCustomAssets({
                  ...customAssets,
                  [item.target]: item.url,
                });
                setSuccessMessage(`Inyectado "${item.name}" al escenario.`);
                setTimeout(() => setSuccessMessage(null), 2500);
              }}
              className="px-2.5 py-1 bg-[#121212] hover:bg-[var(--sgx-neon)]/20 border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-slate-200 hover:text-[var(--sgx-neon)] text-[10px] font-mono transition-all flex items-center space-x-1"
            >
              <LinkIcon className="w-3 h-3 text-[var(--sgx-neon)]" />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Asset Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
        
        {/* SLOT 1: 3D MODEL */}
        <div 
          className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-neon)]/60 space-y-3 flex flex-col justify-between relative shadow-lg"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[var(--sgx-neon)] mb-1">
              <span className="flex items-center space-x-1.5">
                <Box className="w-4 h-4" />
                <span>MODELO 3D (.GLB / .GLTF)</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-[var(--sgx-neon)]/20 text-[var(--sgx-neon)]">3D MESH</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-tight mb-2">
              Inserta un modelo 3D flotante animado en el centro del escenario.
            </p>

            {/* Model URL Link Input */}
            <div className="space-y-1.5 mb-2">
              <label className="text-[9px] text-[#888888] flex items-center space-x-1">
                <LinkIcon className="w-3 h-3 text-[var(--sgx-neon)]" />
                <span>ENLACE / URL DIRECTA DEL MODELO (.glb / .gltf)</span>
              </label>
              <div className="flex space-x-1">
                <input
                  type="text"
                  placeholder="https://.../model.glb"
                  value={urlInputs.customModel3dUrl}
                  onChange={(e) => setUrlInputs({ ...urlInputs, customModel3dUrl: e.target.value })}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] text-slate-100 text-[10px] p-1.5 font-mono focus:border-[var(--sgx-neon)] outline-none"
                />
                <button
                  onClick={() => handleApplyUrl('customModel3dUrl')}
                  className="px-2 bg-[var(--sgx-neon)] text-black font-bold text-[9px] hover:bg-white transition-colors"
                >
                  OK
                </button>
              </div>
            </div>

            {/* Scale & Rotation Sliders */}
            <div className="p-2 bg-[#121212] border border-[var(--sgx-secondary)]/40 space-y-1.5 text-[9px]">
              <div className="flex items-center justify-between text-slate-300">
                <span>Escala 3D:</span>
                <span className="font-bold text-[var(--sgx-neon)]">{customAssets.customModelScale || 1.0}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.1"
                value={customAssets.customModelScale || 1.0}
                onChange={(e) => onUpdateCustomAssets({ ...customAssets, customModelScale: parseFloat(e.target.value) })}
                className="w-full h-1 accent-[var(--sgx-neon)]"
              />

              <div className="flex items-center justify-between text-slate-300">
                <span>Velocidad de Giro:</span>
                <span className="font-bold text-[var(--sgx-accent)]">{customAssets.customModelRotationSpeed !== undefined ? customAssets.customModelRotationSpeed : 1.0}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="3.0"
                step="0.2"
                value={customAssets.customModelRotationSpeed !== undefined ? customAssets.customModelRotationSpeed : 1.0}
                onChange={(e) => onUpdateCustomAssets({ ...customAssets, customModelRotationSpeed: parseFloat(e.target.value) })}
                className="w-full h-1 accent-[var(--sgx-accent)]"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[var(--sgx-secondary)]/40">
            <label className="block">
              <span className="sgx-btn-cyan w-full text-[10px] font-bold py-1.5 px-3 flex items-center justify-center space-x-1.5 cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5" />
                <span>SUBIR ARCHIVO 3D (.GLB/.OBJ)</span>
              </span>
              <input
                type="file"
                accept=".glb,.gltf,.obj"
                onChange={(e) => handleFileChange(e, 'customModel3dUrl')}
                disabled={loadingType === 'customModel3dUrl'}
                className="hidden"
              />
            </label>

            {customAssets.customModel3dUrl && (
              <button
                onClick={() => handleRemoveAsset('customModel3dUrl')}
                className="w-full py-1 text-[10px] text-red-400 hover:text-red-300 border border-red-900 hover:border-red-500 bg-red-950/40 font-bold flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>REMOVER MODELO 3D</span>
              </button>
            )}
          </div>
        </div>

        {/* SLOT 2: 2D BACKGROUND */}
        <div 
          className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] space-y-3 flex flex-col justify-between relative shadow-lg"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[var(--sgx-neon)] mb-1">
              <span className="flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>FONDO 2D PERSONALIZADO</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-[var(--sgx-neon)]/20 text-[var(--sgx-neon)]">FONDO</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-tight mb-2">
              Atmósfera de fondo personalizada para el domo 3D.
            </p>

            {/* URL Input */}
            <div className="space-y-1.5 mb-2">
              <label className="text-[9px] text-[#888888] flex items-center space-x-1">
                <LinkIcon className="w-3 h-3 text-[var(--sgx-neon)]" />
                <span>ENLACE / URL DIRECTA DE IMAGEN</span>
              </label>
              <div className="flex space-x-1">
                <input
                  type="text"
                  placeholder="https://.../background.jpg"
                  value={urlInputs.customBackgroundUrl}
                  onChange={(e) => setUrlInputs({ ...urlInputs, customBackgroundUrl: e.target.value })}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] text-slate-100 text-[10px] p-1.5 font-mono focus:border-[var(--sgx-neon)] outline-none"
                />
                <button
                  onClick={() => handleApplyUrl('customBackgroundUrl')}
                  className="px-2 bg-[var(--sgx-neon)] text-black font-bold text-[9px] hover:bg-white transition-colors"
                >
                  OK
                </button>
              </div>
            </div>

            {/* Image Preview */}
            <div className="relative w-full h-24 bg-[#0C0C0C] border border-[var(--sgx-secondary)]/60 flex items-center justify-center overflow-hidden">
              {customAssets.customBackgroundUrl ? (
                <img
                  src={customAssets.customBackgroundUrl}
                  alt="Background preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[9px] text-[#888888]">SIN FONDO PERSONALIZADO</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[var(--sgx-secondary)]/40">
            <label className="block">
              <span className="sgx-btn-cyan w-full text-[10px] font-bold py-1.5 px-3 flex items-center justify-center space-x-1.5 cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5" />
                <span>SUBIR IMAGEN DE FONDO</span>
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'customBackgroundUrl')}
                disabled={loadingType === 'customBackgroundUrl'}
                className="hidden"
              />
            </label>

            {customAssets.customBackgroundUrl && (
              <button
                onClick={() => handleRemoveAsset('customBackgroundUrl')}
                className="w-full py-1 text-[10px] text-red-400 hover:text-red-300 border border-red-900 hover:border-red-500 bg-red-950/40 font-bold flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>REMOVER FONDO</span>
              </button>
            )}
          </div>
        </div>

        {/* SLOT 3: 2D LOGO */}
        <div 
          className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] space-y-3 flex flex-col justify-between relative shadow-lg"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[var(--sgx-accent)] mb-1">
              <span className="flex items-center space-x-1.5">
                <Shield className="w-4 h-4" />
                <span>LOGO / INSIGNIA 2D</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-[var(--sgx-accent)]/20 text-[var(--sgx-accent)]">LOGO</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-tight mb-2">
              Logo flotante con iluminación reflectiva en el escenario.
            </p>

            {/* URL Input */}
            <div className="space-y-1.5 mb-2">
              <label className="text-[9px] text-[#888888] flex items-center space-x-1">
                <LinkIcon className="w-3 h-3 text-[var(--sgx-accent)]" />
                <span>ENLACE / URL DIRECTA DE LOGO</span>
              </label>
              <div className="flex space-x-1">
                <input
                  type="text"
                  placeholder="https://.../logo.png"
                  value={urlInputs.customLogoUrl}
                  onChange={(e) => setUrlInputs({ ...urlInputs, customLogoUrl: e.target.value })}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] text-slate-100 text-[10px] p-1.5 font-mono focus:border-[var(--sgx-accent)] outline-none"
                />
                <button
                  onClick={() => handleApplyUrl('customLogoUrl')}
                  className="px-2 bg-[var(--sgx-accent)] text-black font-bold text-[9px] hover:bg-white transition-colors"
                >
                  OK
                </button>
              </div>
            </div>

            {/* Image Preview */}
            <div className="relative w-full h-24 bg-[#0C0C0C] border border-[var(--sgx-secondary)]/60 flex items-center justify-center overflow-hidden">
              {customAssets.customLogoUrl ? (
                <img
                  src={customAssets.customLogoUrl}
                  alt="Logo preview"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <span className="text-[9px] text-[#888888]">SIN LOGO FLOTANTE</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[var(--sgx-secondary)]/40">
            <label className="block">
              <span className="sgx-btn-gold w-full text-[10px] font-bold py-1.5 px-3 flex items-center justify-center space-x-1.5 cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5" />
                <span>SUBIR LOGO PNG/SVG</span>
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'customLogoUrl')}
                disabled={loadingType === 'customLogoUrl'}
                className="hidden"
              />
            </label>

            {customAssets.customLogoUrl && (
              <button
                onClick={() => handleRemoveAsset('customLogoUrl')}
                className="w-full py-1 text-[10px] text-red-400 hover:text-red-300 border border-red-900 hover:border-red-500 bg-red-950/40 font-bold flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>REMOVER LOGO</span>
              </button>
            )}
          </div>
        </div>

        {/* SLOT 4: PARTICLE TEXTURE SPRITE */}
        <div 
          className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] space-y-3 flex flex-col justify-between relative shadow-lg"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#A855F7] mb-1">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4" />
                <span>SPRITE DE PARTÍCULAS</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-[#A855F7]/20 text-[#A855F7]">PARTÍCULAS</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-tight mb-2">
              Sprite personalizado para el flujo masivo de miles de partículas.
            </p>

            {/* URL Input */}
            <div className="space-y-1.5 mb-2">
              <label className="text-[9px] text-[#888888] flex items-center space-x-1">
                <LinkIcon className="w-3 h-3 text-[#A855F7]" />
                <span>ENLACE / URL DE SPRITE PNG</span>
              </label>
              <div className="flex space-x-1">
                <input
                  type="text"
                  placeholder="https://.../spark.png"
                  value={urlInputs.customParticleTextureUrl}
                  onChange={(e) => setUrlInputs({ ...urlInputs, customParticleTextureUrl: e.target.value })}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] text-slate-100 text-[10px] p-1.5 font-mono focus:border-[#A855F7] outline-none"
                />
                <button
                  onClick={() => handleApplyUrl('customParticleTextureUrl')}
                  className="px-2 bg-[#A855F7] text-white font-bold text-[9px] hover:bg-white hover:text-black transition-colors"
                >
                  OK
                </button>
              </div>
            </div>

            {/* Image Preview */}
            <div className="relative w-full h-24 bg-[#0C0C0C] border border-[var(--sgx-secondary)]/60 flex items-center justify-center overflow-hidden">
              {customAssets.customParticleTextureUrl ? (
                <img
                  src={customAssets.customParticleTextureUrl}
                  alt="Particle texture preview"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <span className="text-[9px] text-[#888888]">SPRITE NATIVO SGX</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[var(--sgx-secondary)]/40">
            <label className="block">
              <span className="sgx-btn w-full text-[10px] font-bold py-1.5 px-3 flex items-center justify-center space-x-1.5 cursor-pointer text-center text-[#A855F7] border-[#A855F7]">
                <Upload className="w-3.5 h-3.5" />
                <span>SUBIR SPRITE PNG</span>
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'customParticleTextureUrl')}
                disabled={loadingType === 'customParticleTextureUrl'}
                className="hidden"
              />
            </label>

            {customAssets.customParticleTextureUrl && (
              <button
                onClick={() => handleRemoveAsset('customParticleTextureUrl')}
                className="w-full py-1 text-[10px] text-red-400 hover:text-red-300 border border-red-900 hover:border-red-500 bg-red-950/40 font-bold flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>REMOVER SPRITE</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
