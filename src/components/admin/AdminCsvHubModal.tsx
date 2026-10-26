import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Layers, 
  HelpCircle,
  FileCheck,
  Table
} from 'lucide-react';
import { 
  CSV_ENTITY_SCHEMAS, 
  CsvEntitySchema, 
  generatePrefilledCsv, 
  downloadCsvFile, 
  validateAndParseCsv, 
  mergeCsvRecords,
  CsvValidationResult
} from '../../lib/csvManager';
import { playUiChirp } from '../../lib/cyberAudioEngine';

interface AdminCsvHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Live dataset accessors & update callbacks
  sessions: any[];
  speakers: any[];
  mapNodes: any[];
  embeds: any[];
  sponsors: any[];
  questions: any[];
  gamificationTiers: any[];
  onUpdateSessions: (sessions: any[]) => void;
  onUpdateSpeakers: (speakers: any[]) => void;
  onUpdateMapNodes: (nodes: any[]) => void;
  onUpdateEmbeds: (embeds: any[]) => void;
  onUpdateSponsors: (sponsors: any[]) => void;
  onUpdateQuestions?: (questions: any[]) => void;
  onUpdateGamificationTiers?: (tiers: any[]) => void;
}

export const AdminCsvHubModal: React.FC<AdminCsvHubModalProps> = ({
  isOpen,
  onClose,
  sessions,
  speakers,
  mapNodes,
  embeds,
  sponsors,
  questions,
  gamificationTiers,
  onUpdateSessions,
  onUpdateSpeakers,
  onUpdateMapNodes,
  onUpdateEmbeds,
  onUpdateSponsors,
  onUpdateQuestions,
  onUpdateGamificationTiers,
}) => {
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('SPEAKERS');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [csvFileContent, setCsvFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const currentSchema: CsvEntitySchema = CSV_ENTITY_SCHEMAS[selectedEntityKey] || CSV_ENTITY_SCHEMAS.SPEAKERS;

  // Retrieve current items based on entity key
  const getCurrentItems = (): any[] => {
    switch (selectedEntityKey) {
      case 'SESSIONS': return sessions;
      case 'SPEAKERS': return speakers;
      case 'BROADCAST_ROOMS': return sessions.filter((s: any) => s.streamUrl);
      case 'MAP_NODES': return mapNodes;
      case 'EMBEDS': return embeds;
      case 'SPONSORS': return sponsors;
      case 'QUESTIONS': return questions;
      case 'GAMIFICATION': return gamificationTiers;
      default: return [];
    }
  };

  const handleDownloadTemplate = () => {
    playUiChirp(880);
    const items = getCurrentItems();
    const csv = generatePrefilledCsv(currentSchema, items);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${currentSchema.filenamePrefix}_${dateStr}.csv`;
    downloadCsvFile(csv, filename);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSyncFeedback(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvFileContent(content);
      const result = validateAndParseCsv(content, currentSchema);
      setValidationResult(result);
      setIsProcessing(false);
      playUiChirp(result.isValid ? 840 : 440);
    };
    reader.readAsText(file);
  };

  const handleApplySync = () => {
    if (!validationResult || !validationResult.isValid) return;

    setIsProcessing(true);
    playUiChirp(920);

    try {
      const currentItems = getCurrentItems();
      const { merged, updatedCount, createdCount } = mergeCsvRecords(currentItems, validationResult.parsedRows);

      // Route to correct updater
      switch (selectedEntityKey) {
        case 'SESSIONS':
          onUpdateSessions(merged);
          break;
        case 'SPEAKERS':
          onUpdateSpeakers(merged);
          break;
        case 'MAP_NODES':
          onUpdateMapNodes(merged);
          break;
        case 'EMBEDS':
          onUpdateEmbeds(merged);
          break;
        case 'SPONSORS':
          onUpdateSponsors(merged);
          break;
        case 'QUESTIONS':
          if (onUpdateQuestions) onUpdateQuestions(merged);
          break;
        case 'GAMIFICATION':
          if (onUpdateGamificationTiers) onUpdateGamificationTiers(merged);
          break;
        default:
          break;
      }

      setSyncFeedback({
        type: 'success',
        message: `Sincronización completada con éxito: ${updatedCount} elementos actualizados y ${createdCount} nuevos creados en ${currentSchema.name}.`
      });

      // Clear pending file
      setCsvFileContent(null);
      setFileName(null);
      setValidationResult(null);

      // Dispatch global update event
      window.dispatchEvent(new CustomEvent('sgx:cms_data_updated', {
        detail: { entity: selectedEntityKey, count: merged.length }
      }));
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Error al aplicar cambios: ${err.message || 'Error desconocido'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div 
        className="w-full max-w-4xl bg-[#101010] border-2 border-[#32527B] text-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        style={{
          clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
          boxShadow: '0 0 35px rgba(50, 82, 123, 0.45)'
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#181818] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 border border-cyan-400 bg-cyan-950/40 text-cyan-300"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-mono text-sm sm:text-base font-extrabold uppercase tracking-wider text-white">
                Suite de Gestión CSV • Director Studio
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Descarga plantillas con datos prellenados y sube archivos CSV editados para modificar masivamente el applet.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playUiChirp(550);
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white border border-transparent hover:border-slate-700 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

          {/* Feedback banner */}
          {syncFeedback && (
            <div 
              className={`p-3.5 border flex items-start gap-3 text-xs font-mono ${
                syncFeedback.type === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/60 text-rose-300'
              }`}
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="flex-1">{syncFeedback.message}</div>
            </div>
          )}

          {/* Entity Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-300 flex items-center justify-between">
              <span>1. Selecciona la Pestaña / Entidad a Administrar</span>
              <span className="text-cyan-400 font-normal">
                {Object.keys(CSV_ENTITY_SCHEMAS).length} Módulos Disponibles
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(CSV_ENTITY_SCHEMAS).map((schema) => {
                const isSelected = selectedEntityKey === schema.id;
                return (
                  <button
                    key={schema.id}
                    type="button"
                    onClick={() => {
                      playUiChirp(700);
                      setSelectedEntityKey(schema.id);
                      setValidationResult(null);
                      setCsvFileContent(null);
                      setFileName(null);
                      setSyncFeedback(null);
                    }}
                    className={`p-2.5 text-left border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#262626] border-cyan-400 text-white shadow-lg shadow-cyan-900/30 font-bold' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    <div className="text-[10px] font-mono text-cyan-400 uppercase leading-none mb-1">
                      {schema.id}
                    </div>
                    <div className="text-xs truncate font-sans">
                      {schema.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Entity Info & Column Schema */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 space-y-3" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div>
                <span className="text-xs font-mono font-bold text-white uppercase">
                  {currentSchema.name}
                </span>
                <p className="text-[11px] text-slate-400">
                  {currentSchema.description}
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Registros Actuales: <strong className="text-cyan-400">{getCurrentItems().length}</strong>
              </div>
            </div>

            {/* Column tags */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Columnas requeridas y soportadas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentSchema.columns.map((col) => (
                  <span
                    key={col.key}
                    className="px-2 py-0.5 text-[10px] font-mono border bg-slate-900/90 text-slate-300 border-slate-700"
                    title={col.description}
                  >
                    {col.key} {col.required && <span className="text-rose-400">*</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Grid: Download Pre-filled vs Upload Edited */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Step 2A: Download */}
            <div 
              className="p-4 sm:p-5 bg-[#161616] border border-[#32527B] flex flex-col justify-between space-y-4"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold uppercase">
                  <Download className="w-4 h-4" />
                  <span>2. Descargar Plantilla Prellenada</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Exporta un archivo CSV con todos los <strong>{getCurrentItems().length} registros vigentes</strong> de {currentSchema.name}. Ábrelo en Excel o Google Sheets para modificar nombres, enlaces, imágenes o campos.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full py-2.5 px-4 bg-[#32527B] hover:bg-[#41699B] text-white font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/20"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                <Download className="w-4 h-4 text-cyan-300" />
                <span>DESCARGAR .CSV ACTUAL ({getCurrentItems().length} REGISTROS)</span>
              </button>
            </div>

            {/* Step 2B: Upload */}
            <div 
              className="p-4 sm:p-5 bg-[#161616] border border-[#32527B] flex flex-col justify-between space-y-4"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                  <UploadCloud className="w-4 h-4" />
                  <span>3. Subir CSV Editado para Sincronizar</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Selecciona el archivo CSV editado. El sistema validará automáticamente las columnas y fusionará los datos conservando la integridad de identificadores.
                </p>
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div 
                  className="w-full py-2.5 px-4 border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/20 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-all text-center"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                >
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span className="truncate">
                    {fileName ? `Archivo: ${fileName}` : 'SELECCIONAR O ARRASTRAR ARCHIVO .CSV'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Validation & Preview Section */}
          {validationResult && (
            <div 
              className="p-4 bg-slate-900 border border-slate-700 space-y-4"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <FileCheck className={`w-4 h-4 ${validationResult.isValid ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <span className="font-mono text-xs font-bold text-white uppercase">
                    Reporte de Validación de Columnas
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-300">
                  {validationResult.validRowsCount} filas listas para importar
                </div>
              </div>

              {/* Warnings or Errors */}
              {validationResult.errors.length > 0 && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-mono space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Errores bloqueantes:</span>
                  </div>
                  {validationResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/50 text-amber-300 text-[11px] font-mono space-y-1">
                  <div className="font-bold">Advertencias no bloqueantes:</div>
                  {validationResult.warnings.slice(0, 4).map((warn, i) => (
                    <div key={i}>• {warn}</div>
                  ))}
                  {validationResult.warnings.length > 4 && (
                    <div>... y {validationResult.warnings.length - 4} más</div>
                  )}
                </div>
              )}

              {/* Data Table Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Previsualización (Primeras 5 filas):</span>
                  <span>Total en archivo: {validationResult.totalRows}</span>
                </div>
                <div className="overflow-x-auto max-h-48 border border-slate-800 bg-slate-950 text-xs font-mono">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                        {currentSchema.columns.slice(0, 6).map(col => (
                          <th key={col.key} className="p-2 border-r border-slate-800 whitespace-nowrap">
                            {col.key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validationResult.parsedRows.slice(0, 5).map((row: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                          {currentSchema.columns.slice(0, 6).map(col => (
                            <td key={col.key} className="p-2 border-r border-slate-900 truncate max-w-[150px] text-slate-300">
                              {String(row[col.key] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Execute Merge & Sync Action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!validationResult.isValid || isProcessing}
                  onClick={handleApplySync}
                  className={`py-2.5 px-6 font-mono text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
                    validationResult.isValid && !isProcessing
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>
                    {isProcessing ? 'SINCRONIZANDO...' : `CONFIRMAR Y ACTUALIZAR ${validationResult.validRowsCount} REGISTROS`}
                  </span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#141414] border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Motor CSV RFC-4180 con compatibilidad universal de acentos UTF-8</span>
          </div>
          <button
            onClick={() => {
              playUiChirp(550);
              onClose();
            }}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
            style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
