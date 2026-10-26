import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  HelpCircle, 
  Eye, 
  Layers, 
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Question, QuestionOption, VisualizerPresetId, OptionEffectType } from '../../types/engine';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { playNotificationChime } from '../../lib/summitData';

interface BulkQuestionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  eventId: string;
  existingQuestionsCount: number;
  onBulkImport: (questions: Question[], mode: 'append' | 'replace') => void;
}

const SAMPLE_CSV_TEMPLATE = `prompt,category,durationSeconds,basePoints,optionA,presetA,optionB,presetB,optionC,presetC,optionD,presetD,narrative
"¿Qué frecuencia lumínica debe amplificar el escenario espacial?","STAGE_VISUALS",30,100,"Cyan Cuántico (#00DDFF)","quantum_vortex","Oro Solar (#FDCC0D)","plasma_bloom","Verde Bio-Matrix","matrix_rain","Violeta Neón","neon_aurora","La audiencia sintonizó la frecuencia lumínica hacia una sobrecarga cuántica."
"¿Cuál debe ser el tempo de la próxima pista de audio binaural?","AUDIO_EXPERIENCE",25,120,"128 BPM Synthwave","synth_grid","140 BPM Cyberpunk","matrix_rain","110 BPM Ambient Choral","quantum_vortex","160 BPM Drum & Space","plasma_bloom","El ritmo espacial se aceleró conectando a todos los asistentes en vivo."
"¿Hacia qué cuadrante debe rotar la cámara 360 del escenario?","CAMERA_DIRECTOR",20,80,"Pabellón 1: Dron Bay","quantum_vortex","Pabellón 2: Awaken Gallery","neon_aurora","Escenario Principal LED","synth_grid","Lounge VIP Chroma","plasma_bloom","Los directores de audiencia cambiaron la perspectiva hacia el cuadrante elegido."`;

const SAMPLE_JSON_TEMPLATE = JSON.stringify([
  {
    prompt: "¿Qué frecuencia lumínica debe amplificar el escenario espacial?",
    category: "STAGE_VISUALS",
    durationSeconds: 30,
    basePoints: 100,
    options: [
      { label: "Cyan Cuántico (#00DDFF)", presetId: "quantum_vortex", color: "#00DDFF" },
      { label: "Oro Solar (#FDCC0D)", presetId: "plasma_bloom", color: "#FDCC0D" },
      { label: "Verde Bio-Matrix", presetId: "matrix_rain", color: "#10B981" },
      { label: "Violeta Neón", presetId: "neon_aurora", color: "#5F86B4" }
    ],
    storyPathOutcome: {
      narrative: "La audiencia sintonizó la frecuencia lumínica hacia una sobrecarga cuántica.",
      stageTitle: "Escenario Cuántico Activado"
    }
  },
  {
    prompt: "¿Cuál debe ser el tempo de la próxima pista de audio binaural?",
    category: "AUDIO_EXPERIENCE",
    durationSeconds: 25,
    basePoints: 120,
    options: [
      { label: "128 BPM Synthwave", presetId: "synth_grid", color: "#00DDFF" },
      { label: "140 BPM Cyberpunk", presetId: "matrix_rain", color: "#FDCC0D" }
    ],
    storyPathOutcome: {
      narrative: "El ritmo espacial se aceleró conectando a todos los asistentes en vivo.",
      stageTitle: "BPM Acelerado"
    }
  }
], null, 2);

export const BulkQuestionUploadModal: React.FC<BulkQuestionUploadModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  eventId,
  existingQuestionsCount,
  onBulkImport,
}) => {
  const { styles } = useTenantTheme();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'templates'>('upload');
  const [rawText, setRawText] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Simple CSV line parser supporting quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
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

  // Convert raw CSV or JSON text into Question array
  const processInputText = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
      setParsedQuestions([]);
      setParseErrors([]);
      return;
    }

    const errors: string[] = [];
    const questions: Question[] = [];

    // Check if JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : (parsed.questions || []);

        if (!Array.isArray(list) || list.length === 0) {
          errors.push('El archivo JSON no contiene un arreglo válido de preguntas.');
        } else {
          list.forEach((item: any, idx: number) => {
            const prompt = item.prompt || item.question || item.title;
            if (!prompt) {
              errors.push(`Elemento JSON #${idx + 1}: Falta la propiedad "prompt" o "question".`);
              return;
            }

            const rawOptions = item.options || [];
            const defaultColors = ['#00DDFF', '#FDCC0D', '#10B981', '#5F86B4', '#EC4899'];
            
            const options: QuestionOption[] = (rawOptions.length > 0 ? rawOptions : [
              { label: item.optionA || 'Opción A', presetId: item.presetA || 'quantum_vortex' },
              { label: item.optionB || 'Opción B', presetId: item.presetB || 'plasma_bloom' },
            ]).map((opt: any, optIdx: number) => ({
              id: `opt_${Date.now()}_${idx}_${optIdx}`,
              index: optIdx,
              code: optIdx + 1,
              label: typeof opt === 'string' ? opt : (opt.label || opt.title || `Opción ${optIdx + 1}`),
              presetId: (opt.presetId as VisualizerPresetId) || (optIdx === 0 ? 'quantum_vortex' : 'plasma_bloom'),
              color: opt.color || defaultColors[optIdx % defaultColors.length],
              effectMultiplier: 1.0,
            }));

            questions.push({
              id: item.id || `q_bulk_${Date.now()}_${idx}`,
              tenantId,
              eventId,
              order: (importMode === 'append' ? existingQuestionsCount : 0) + idx + 1,
              prompt,
              subtitle: item.subtitle,
              category: item.category || 'AUDIENCE_POLL',
              answerType: item.answerType || 'OPINION_CYOA',
              durationSeconds: Number(item.durationSeconds) || 30,
              basePoints: Number(item.basePoints) || 100,
              maxSpeedBonus: 50,
              participationWeight: 20,
              options,
              storyPathOutcome: {
                narrative: item.narrative || item.storyPathOutcome?.narrative || 'La decisión de la audiencia transformó el escenario en vivo.',
                stageTitle: item.stageTitle || item.storyPathOutcome?.stageTitle || prompt,
              }
            });
          });
        }
      } catch (err: any) {
        errors.push(`Error de sintaxis JSON: ${err.message}`);
      }
    } else {
      // Process as CSV
      const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        errors.push('El archivo CSV debe tener al menos una fila de encabezado y una fila de datos.');
      } else {
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        
        // Find column indices
        const getIdx = (...keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
        const promptIdx = getIdx('prompt', 'question', 'pregunta', 'titulo');
        const catIdx = getIdx('category', 'categoria', 'tipo');
        const durIdx = getIdx('duration', 'segundos', 'tiempo');
        const pointsIdx = getIdx('basepoints', 'points', 'puntos');
        const optAIdx = getIdx('optiona', 'opciona', 'a');
        const presetAIdx = getIdx('preseta', 'preset1', 'visuala');
        const optBIdx = getIdx('optionb', 'opcionb', 'b');
        const presetBIdx = getIdx('presetb', 'preset2', 'visualb');
        const optCIdx = getIdx('optionc', 'opcionc', 'c');
        const presetCIdx = getIdx('presetc', 'preset3', 'visualc');
        const optDIdx = getIdx('optiond', 'opciond', 'd');
        const presetDIdx = getIdx('presetd', 'preset4', 'visuald');
        const narrIdx = getIdx('narrative', 'narrativa', 'outcome', 'historia');

        if (promptIdx === -1) {
          errors.push('No se encontró la columna de pregunta ("prompt" o "question") en el encabezado CSV.');
        } else {
          for (let i = 1; i < lines.length; i++) {
            const row = parseCSVLine(lines[i]);
            if (row.length === 0 || (row.length === 1 && !row[0])) continue;

            const prompt = row[promptIdx];
            if (!prompt) {
              errors.push(`Fila #${i + 1}: Pregunta vacía ignorada.`);
              continue;
            }

            const category = catIdx >= 0 && row[catIdx] ? row[catIdx] : 'STAGE_CYOA';
            const durationSeconds = durIdx >= 0 && !isNaN(Number(row[durIdx])) ? Number(row[durIdx]) : 30;
            const basePoints = pointsIdx >= 0 && !isNaN(Number(row[pointsIdx])) ? Number(row[pointsIdx]) : 100;
            const narrative = narrIdx >= 0 && row[narrIdx] ? row[narrIdx] : 'La audiencia guió el siguiente nodo narrativo espacial.';

            const optA = optAIdx >= 0 && row[optAIdx] ? row[optAIdx] : 'Opción Alfa';
            const presetA = (presetAIdx >= 0 && row[presetAIdx] ? row[presetAIdx] : 'quantum_vortex') as VisualizerPresetId;
            const optB = optBIdx >= 0 && row[optBIdx] ? row[optBIdx] : 'Opción Beta';
            const presetB = (presetBIdx >= 0 && row[presetBIdx] ? row[presetBIdx] : 'plasma_bloom') as VisualizerPresetId;

            const options: QuestionOption[] = [
              {
                id: `opt_${Date.now()}_${i}_a`,
                index: 0,
                code: 1,
                label: optA,
                presetId: presetA,
                color: '#00DDFF',
              },
              {
                id: `opt_${Date.now()}_${i}_b`,
                index: 1,
                code: 2,
                label: optB,
                presetId: presetB,
                color: '#FDCC0D',
              },
            ];

            // Optional C & D
            if (optCIdx >= 0 && row[optCIdx]) {
              const presetC = (presetCIdx >= 0 && row[presetCIdx] ? row[presetCIdx] : 'neon_aurora') as VisualizerPresetId;
              options.push({
                id: `opt_${Date.now()}_${i}_c`,
                index: 2,
                code: 3,
                label: row[optCIdx],
                presetId: presetC,
                color: '#10B981',
              });
            }

            if (optDIdx >= 0 && row[optDIdx]) {
              const presetD = (presetDIdx >= 0 && row[presetDIdx] ? row[presetDIdx] : 'synth_grid') as VisualizerPresetId;
              options.push({
                id: `opt_${Date.now()}_${i}_d`,
                index: 3,
                code: 4,
                label: row[optDIdx],
                presetId: presetD,
                color: '#EC4899',
              });
            }

            questions.push({
              id: `q_bulk_${Date.now()}_${i}`,
              tenantId,
              eventId,
              order: (importMode === 'append' ? existingQuestionsCount : 0) + questions.length + 1,
              prompt,
              category,
              answerType: 'OPINION_CYOA',
              durationSeconds,
              basePoints,
              maxSpeedBonus: 50,
              participationWeight: 20,
              options,
              storyPathOutcome: {
                narrative,
                stageTitle: prompt,
              },
            });
          }
        }
      }
    }

    setParsedQuestions(questions);
    setParseErrors(errors);
  };

  // Handle File Drag / Selection
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

  // Download Templates
  const downloadTemplate = (format: 'csv' | 'json') => {
    const content = format === 'csv' ? SAMPLE_CSV_TEMPLATE : SAMPLE_JSON_TEMPLATE;
    const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_preguntas_summit_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Submit Import
  const handleCommitImport = () => {
    if (parsedQuestions.length === 0) return;
    setIsProcessing(true);

    try {
      onBulkImport(parsedQuestions, importMode);
      playNotificationChime();
      onClose();
    } catch (err) {
      console.error('Error importing questions:', err);
    } finally {
      setIsProcessing(false);
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
            <Upload className="w-5 h-5 text-black" />
            <div>
              <h2 className="font-bold text-sm tracking-wider font-mono uppercase">
                IMPORTADOR MASIVO DE PREGUNTAS (.CSV / .JSON)
              </h2>
              <p className="text-[10px] font-mono opacity-90">
                Añade múltiples preguntas interactivas y presets visuales simultáneamente
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
            <span>SUBIR ARCHIVO</span>
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
            <span>PEGAR TEXTO DIRECTO</span>
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
            <span>DESCARGAR PLANTILLAS</span>
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
                  accept=".csv,.json,.txt"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-[var(--sgx-primary)]/10 group-hover:bg-[var(--sgx-primary)]/20 text-[var(--sgx-primary)] flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white font-mono">
                    {fileName ? `Archivo seleccionado: ${fileName}` : 'Haz clic o arrastra tu archivo CSV o JSON aquí'}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Soporta archivos .csv delimitados por coma o .json estructurados
                  </p>
                </div>
                {fileName && (
                  <span className="inline-block px-3 py-1 bg-[var(--sgx-primary)]/20 text-[var(--sgx-primary)] text-[10px] font-mono rounded font-bold">
                    Cargado correctamente ({parsedQuestions.length} preguntas detectadas)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Direct Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Pega tu contenido en formato CSV (con encabezados) o arreglo JSON:</span>
                <button
                  onClick={() => {
                    setRawText(SAMPLE_CSV_TEMPLATE);
                    processInputText(SAMPLE_CSV_TEMPLATE);
                  }}
                  className="text-[var(--sgx-primary)] hover:underline text-[11px] cursor-pointer"
                >
                  Cargar ejemplo rápido
                </button>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  processInputText(e.target.value);
                }}
                rows={8}
                placeholder="prompt,category,durationSeconds,basePoints,optionA,presetA,optionB,presetB..."
                className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-border)] p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[var(--sgx-primary)] rounded"
              />
            </div>
          )}

          {/* TAB 3: Templates & Guidance */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--sgx-bg)] border border-[var(--sgx-border)] p-4 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs font-mono">PLANTILLA CSV</span>
                    <span className="text-[10px] text-slate-400 font-mono">Excel / Sheets</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Formato tabular estándar con columnas para preguntas, duración, puntos y opciones A/B/C/D con presets visuales.
                  </p>
                  <button
                    onClick={() => downloadTemplate('csv')}
                    className="w-full py-2 bg-[var(--sgx-secondary)] hover:bg-[var(--sgx-primary)] hover:text-black text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 rounded cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DESCARGAR .CSV</span>
                  </button>
                </div>

                <div className="bg-[var(--sgx-bg)] border border-[var(--sgx-border)] p-4 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs font-mono">PLANTILLA JSON</span>
                    <span className="text-[10px] text-slate-400 font-mono">Estructura Avanzada</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Formato JSON completo con soporte para opciones dinámicas, colores hex, y desenlaces narrativos CYOA.
                  </p>
                  <button
                    onClick={() => downloadTemplate('json')}
                    className="w-full py-2 bg-[var(--sgx-secondary)] hover:bg-[var(--sgx-primary)] hover:text-black text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 rounded cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DESCARGAR .JSON</span>
                  </button>
                </div>
              </div>

              {/* Supported Presets Reference Box */}
              <div className="bg-[var(--sgx-bg)]/80 border border-[var(--sgx-border)] p-4 rounded space-y-2 text-xs font-mono">
                <span className="font-bold text-[var(--sgx-accent)] text-[11px] block">
                  PRESETS VISUALES COMPATIBLES:
                </span>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {['quantum_vortex', 'plasma_bloom', 'synth_grid', 'matrix_rain', 'neon_aurora', 'hyper_warp_streak', 'strobe_glitch'].map((p) => (
                    <span key={p} className="px-2 py-0.5 bg-black/50 border border-slate-700 text-slate-300 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Validation & Live Preview Section */}
          {parseErrors.length > 0 && (
            <div className="p-3 bg-red-950/40 border border-red-800/80 rounded space-y-1 text-xs font-mono text-red-300">
              <div className="flex items-center gap-2 font-bold text-red-400">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Advertencias de Formato:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-2 text-red-200">
                {parseErrors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {parseErrors.length > 3 && (
                  <li>...y {parseErrors.length - 3} advertencias más</li>
                )}
              </ul>
            </div>
          )}

          {parsedQuestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--sgx-border)] pb-2 font-mono text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[var(--sgx-primary)]" />
                  <span>VISTA PREVIA DE PREGUNTAS DETECTADAS ({parsedQuestions.length})</span>
                </span>

                {/* Import Mode Selector */}
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400">Modo de Importación:</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-[var(--sgx-primary)]"
                    />
                    <span className={importMode === 'append' ? 'text-[var(--sgx-primary)] font-bold' : 'text-slate-400'}>
                      Añadir ({existingQuestionsCount} + {parsedQuestions.length})
                    </span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-[var(--sgx-primary)]"
                    />
                    <span className={importMode === 'replace' ? 'text-red-400 font-bold' : 'text-slate-400'}>
                      Reemplazar Todas
                    </span>
                  </label>
                </div>
              </div>

              {/* Preview Cards */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {parsedQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] rounded text-xs space-y-2 font-mono"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white truncate">
                        #{idx + 1}. {q.prompt}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                        <span className="px-1.5 py-0.5 bg-[var(--sgx-secondary)] text-[var(--sgx-primary)] rounded">
                          {q.category}
                        </span>
                        <span className="px-1.5 py-0.5 bg-black/60 text-slate-300 rounded">
                          {q.durationSeconds}s
                        </span>
                        <span className="px-1.5 py-0.5 bg-black/60 text-[var(--sgx-accent)] rounded">
                          {q.basePoints} pts
                        </span>
                      </div>
                    </div>

                    {/* Options Preview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={opt.id || optIdx}
                          className="p-1.5 bg-black/40 border border-slate-800 rounded flex flex-col justify-between"
                        >
                          <span className="font-bold text-slate-200 truncate">{opt.label}</span>
                          <span className="text-[9px] text-[var(--sgx-primary)] truncate">{opt.presetId}</span>
                        </div>
                      ))}
                    </div>
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
            CANCELAR
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              {parsedQuestions.length} pregunta(s) listas para importar
            </span>
            <button
              onClick={handleCommitImport}
              disabled={parsedQuestions.length === 0 || isProcessing}
              className={`px-5 py-2 font-bold uppercase transition-all flex items-center gap-2 rounded cursor-pointer ${
                parsedQuestions.length > 0 && !isProcessing
                  ? 'bg-[var(--sgx-primary)] hover:bg-[var(--sgx-accent)] text-black shadow-lg shadow-[var(--sgx-glow)]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>IMPORTANDO...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>CONFIRMAR E IMPORTAR ({parsedQuestions.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
