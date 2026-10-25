import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Instagram, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Layers,
  Sparkles
} from 'lucide-react';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { bulkImportInstagramPosts, BulkInstagramItem, BulkImportResult, SocialPost } from '../../lib/realSocialStreamApi';
import { playNotificationChime } from '../../lib/summitData';

interface BulkInstagramImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostsImported?: (posts: SocialPost[]) => void;
}

const SAMPLE_INSTAGRAM_CSV = `url,caption,authorHandle,hashtags
https://www.instagram.com/p/DFhQ_1rOABC/,"Presentación del Escenario Holográfico en el Summit 2026",@spatialgineers,"#SpatialgineersSummit #Metaverso"
https://www.instagram.com/reel/DFm9_1rOXYZ/,"Momentos destacados de los Ranked Trials de los 8 Initiates",@spatialgineers,"#SGXRanked #Spatialgineers"
https://www.instagram.com/p/DG0Q_1rO123/,"Concierto y experiencia visual en Chroma Space Studios",@losmismos,"#ChromaStudios #LiveEvent"`;

export const BulkInstagramImportModal: React.FC<BulkInstagramImportModalProps> = ({
  isOpen,
  onClose,
  onPostsImported,
}) => {
  const { styles } = useTenantTheme();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'templates'>('upload');
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<BulkInstagramItem[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Extract shortcode from raw string
  const extractShortcode = (rawUrl: string): string | null => {
    if (!rawUrl) return null;
    const cleanUrl = rawUrl.split('?')[0].split('#')[0].trim();
    const match = cleanUrl.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : null;
  };

  // CSV parsing logic for Instagram rows
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Process text or pasted links
  const processInputText = (content: string) => {
    const trimmed = content.trim();
    setImportResult(null);
    if (!trimmed) {
      setParsedItems([]);
      setParseWarnings([]);
      return;
    }

    const items: BulkInstagramItem[] = [];
    const warnings: string[] = [];

    // Check if JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : (parsed.posts || parsed.items || []);
        list.forEach((entry: any, idx: number) => {
          const url = typeof entry === 'string' ? entry : (entry.url || entry.link || entry.instagramPostUrl);
          const shortcode = extractShortcode(url);
          if (shortcode) {
            items.push({
              url: `https://www.instagram.com/p/${shortcode}/`,
              caption: entry.caption || entry.content,
              authorHandle: entry.authorHandle || entry.author?.handle,
              authorName: entry.authorName || entry.author?.name,
              hashtags: entry.hashtags,
              isFeaturedOnStage: entry.isFeaturedOnStage !== undefined ? entry.isFeaturedOnStage : true,
            });
          } else {
            warnings.push(`Elemento JSON #${idx + 1}: URL de Instagram no reconocida ("${url}")`);
          }
        });
      } catch (e: any) {
        warnings.push(`Error de sintaxis JSON: ${e.message}`);
      }
    } else {
      // Process CSV or multi-line plain URLs
      const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      let isCsvHeader = false;
      let urlColIdx = 0;
      let captionColIdx = 1;
      let authorColIdx = 2;
      let tagsColIdx = 3;

      if (lines.length > 0 && lines[0].toLowerCase().includes('url')) {
        isCsvHeader = true;
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        urlColIdx = headers.findIndex(h => h.includes('url') || h.includes('link') || h.includes('post'));
        captionColIdx = headers.findIndex(h => h.includes('caption') || h.includes('descripcion') || h.includes('texto'));
        authorColIdx = headers.findIndex(h => h.includes('author') || h.includes('autor') || h.includes('handle'));
        tagsColIdx = headers.findIndex(h => h.includes('hashtag') || h.includes('tag'));
      }

      const startIndex = isCsvHeader ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const row = parseCSVLine(line);
        const rawUrl = isCsvHeader && urlColIdx >= 0 ? row[urlColIdx] : row[0];
        const shortcode = extractShortcode(rawUrl);

        if (shortcode) {
          const caption = isCsvHeader && captionColIdx >= 0 ? row[captionColIdx] : (row[1] || undefined);
          const authorHandle = isCsvHeader && authorColIdx >= 0 ? row[authorColIdx] : (row[2] || undefined);
          const hashtagsRaw = isCsvHeader && tagsColIdx >= 0 ? row[tagsColIdx] : (row[3] || undefined);
          
          const hashtags = hashtagsRaw 
            ? hashtagsRaw.split(/[ ,]+/).filter(t => t.startsWith('#') || t.length > 1).map(t => t.startsWith('#') ? t : `#${t}`)
            : ['#SpatialgineersSummit', '#SGX2026'];

          items.push({
            url: `https://www.instagram.com/p/${shortcode}/`,
            caption: caption || 'Publicación enlazada desde Instagram oficial.',
            authorHandle: authorHandle || '@spatialgineers',
            hashtags,
            isFeaturedOnStage: true,
          });
        } else {
          warnings.push(`Línea #${i + 1}: No se detectó enlace válido de Instagram en "${rawUrl}"`);
        }
      }
    }

    setParsedItems(items);
    setParseWarnings(warnings);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      processInputText(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      processInputText(content);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_INSTAGRAM_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_instagram_summit_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCommitImport = async () => {
    if (parsedItems.length === 0 || isImporting) return;
    setIsImporting(true);

    try {
      const result = await bulkImportInstagramPosts(parsedItems);
      setImportResult(result);
      if (result.importedPosts.length > 0 && onPostsImported) {
        onPostsImported(result.importedPosts);
      }
      playNotificationChime();
    } catch (err) {
      console.error('Error importing bulk Instagram posts:', err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-4xl bg-[var(--sgx-card-bg)] border-2 border-[var(--sgx-primary)] max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
        style={{ 
          clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
          boxShadow: '0 0 35px var(--sgx-glow)'
        }}
      >
        {/* Modal Header */}
        <div className="bg-[var(--sgx-gradient)] px-6 py-4 flex items-center justify-between text-black shrink-0">
          <div className="flex items-center gap-3">
            <Instagram className="w-5 h-5 text-black" />
            <div>
              <h2 className="font-bold text-sm tracking-wider font-mono uppercase">
                IMPORTADOR MASIVO DE INSTAGRAM (.CSV / ENLACES)
              </h2>
              <p className="text-[10px] font-mono opacity-90">
                Sube una lista de enlaces para sincronizar múltiples posts o reels tras finalizar el evento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/20 rounded text-black transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--sgx-border)] bg-[var(--sgx-bg)]/80 px-6 pt-3 gap-2 font-mono text-xs shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 font-bold uppercase transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'border-[var(--sgx-primary)] text-[var(--sgx-primary)] bg-[var(--sgx-card-bg)]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>SUBIR ARCHIVO .CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2 font-bold uppercase transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'paste'
                ? 'border-[var(--sgx-primary)] text-[var(--sgx-primary)] bg-[var(--sgx-card-bg)]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PEGAR ENLACES DIRECTOS</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 font-bold uppercase transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'templates'
                ? 'border-[var(--sgx-primary)] text-[var(--sgx-primary)] bg-[var(--sgx-card-bg)]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>PLANTILLA CSV</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 font-sans">
          
          {/* TAB 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--sgx-secondary)] hover:border-[var(--sgx-primary)] bg-[var(--sgx-bg)]/60 hover:bg-[var(--sgx-bg)] p-8 text-center cursor-pointer transition-all rounded-lg space-y-3 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt,.json"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-[var(--sgx-primary)]/10 group-hover:bg-[var(--sgx-primary)]/20 text-[var(--sgx-primary)] flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                  <Instagram className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white font-mono">
                    {fileName ? `Archivo seleccionado: ${fileName}` : 'Haz clic o arrastra tu archivo CSV o TXT aquí'}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Soporta archivos .csv con columnas (url, caption, authorHandle) o listas de enlaces .txt
                  </p>
                </div>
                {fileName && (
                  <span className="inline-block px-3 py-1 bg-[var(--sgx-primary)]/20 text-[var(--sgx-primary)] text-[10px] font-mono rounded font-bold">
                    Cargado ({parsedItems.length} publicaciones de Instagram detectadas)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Direct Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Pega múltiples URLs de Instagram (1 por línea o formato CSV):</span>
                <button
                  onClick={() => {
                    setRawText(SAMPLE_INSTAGRAM_CSV);
                    processInputText(SAMPLE_INSTAGRAM_CSV);
                  }}
                  className="text-[var(--sgx-primary)] hover:underline text-[11px] cursor-pointer"
                >
                  Cargar 3 enlaces de ejemplo
                </button>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  processInputText(e.target.value);
                }}
                rows={8}
                placeholder="https://www.instagram.com/p/ABC123xyz/&#10;https://www.instagram.com/reel/XYZ789abc/&#10;..."
                className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-border)] p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[var(--sgx-primary)] rounded"
              />
            </div>
          )}

          {/* TAB 3: Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="bg-[var(--sgx-bg)] border border-[var(--sgx-border)] p-5 rounded space-y-3 max-w-lg mx-auto text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--sgx-primary)]/10 text-[var(--sgx-primary)] flex items-center justify-center mx-auto">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-sm font-mono">PLANTILLA CSV PARA REDES SOCIALES</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Descarga el formato de hoja de cálculo con columnas predefinidas: <code>url</code>, <code>caption</code>, <code>authorHandle</code> y <code>hashtags</code>.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="w-full py-2.5 bg-[var(--sgx-primary)] hover:bg-[var(--sgx-accent)] text-black font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 rounded cursor-pointer shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>DESCARGAR PLANTILLA .CSV</span>
                </button>
              </div>
            </div>
          )}

          {/* Warnings */}
          {parseWarnings.length > 0 && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded space-y-1 text-xs font-mono text-amber-300">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Avisos de Validación:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-2 text-amber-200">
                {parseWarnings.slice(0, 3).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {parseWarnings.length > 3 && (
                  <li>...y {parseWarnings.length - 3} avisos adicionales</li>
                )}
              </ul>
            </div>
          )}

          {/* Import Result Success Banner */}
          {importResult && (
            <div className="p-4 bg-emerald-950/50 border-2 border-emerald-500 rounded space-y-2 font-mono text-xs text-emerald-200">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>¡IMPORTACIÓN COMPLETADA CON ÉXITO!</span>
              </div>
              <p>
                Se han guardado en Firestore <strong>{importResult.successful} publicaciones oficiales</strong> de Instagram y se han sincronizado con el mural social en vivo.
              </p>
              {importResult.failed > 0 && (
                <p className="text-red-300 text-[11px]">
                  {importResult.failed} publicación(es) no pudieron ser importadas.
                </p>
              )}
            </div>
          )}

          {/* Preview Items */}
          {parsedItems.length > 0 && !importResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--sgx-border)] pb-2 font-mono text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-[var(--sgx-primary)]" />
                  <span>PUBLICACIONES IDENTIFICADAS ({parsedItems.length})</span>
                </span>
                <span className="text-[11px] text-[var(--sgx-primary)]">
                  Listas para sincronizar con Firestore
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] rounded text-xs space-y-1.5 font-mono"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[var(--sgx-primary)] hover:underline flex items-center gap-1 truncate"
                      >
                        <span>#{idx + 1}. {item.url}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                      <span className="px-2 py-0.5 bg-black/60 text-slate-300 text-[10px] rounded shrink-0">
                        {item.authorHandle}
                      </span>
                    </div>
                    {item.caption && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {item.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[var(--sgx-bg)] p-4 border-t border-[var(--sgx-border)] flex items-center justify-between gap-3 shrink-0 font-mono text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 hover:border-slate-500 text-slate-300 rounded transition-colors cursor-pointer"
          >
            {importResult ? 'CERRAR' : 'CANCELAR'}
          </button>

          {!importResult && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {parsedItems.length} post(s) listos
              </span>
              <button
                onClick={handleCommitImport}
                disabled={parsedItems.length === 0 || isImporting}
                className={`px-5 py-2 font-bold uppercase transition-all flex items-center gap-2 rounded cursor-pointer ${
                  parsedItems.length > 0 && !isImporting
                    ? 'bg-[var(--sgx-primary)] hover:bg-[var(--sgx-accent)] text-black shadow-lg shadow-[var(--sgx-glow)]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>IMPORTANDO A FIRESTORE...</span>
                  </>
                ) : (
                  <>
                    <Instagram className="w-3.5 h-3.5" />
                    <span>IMPORTAR TODOS ({parsedItems.length})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
