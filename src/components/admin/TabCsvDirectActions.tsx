import React, { useRef, useState } from 'react';
import { Download, UploadCloud, Check, RefreshCw } from 'lucide-react';
import { 
  CSV_ENTITY_SCHEMAS, 
  generatePrefilledCsv, 
  downloadCsvFile, 
  validateAndParseCsv, 
  mergeCsvRecords 
} from '../../lib/csvManager';
import { playUiChirp } from '../../lib/cyberAudioEngine';

interface TabCsvDirectActionsProps {
  entityKey: string;
  items: any[];
  onUpdateItems: (newItems: any[]) => void;
  compact?: boolean;
}

export const TabCsvDirectActions: React.FC<TabCsvDirectActionsProps> = ({
  entityKey,
  items,
  onUpdateItems,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const schema = CSV_ENTITY_SCHEMAS[entityKey] || CSV_ENTITY_SCHEMAS.SPEAKERS;

  const handleDownload = () => {
    playUiChirp(840);
    const csv = generatePrefilledCsv(schema, items);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${schema.filenamePrefix}_${dateStr}.csv`;
    downloadCsvFile(csv, filename);
    setFeedbackMsg('Descargado');
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = validateAndParseCsv(text, schema);

        if (!result.isValid) {
          alert(`Error en CSV: ${result.errors.join('\n')}`);
          setIsProcessing(false);
          return;
        }

        const { merged, updatedCount, createdCount } = mergeCsvRecords(items, result.parsedRows);
        onUpdateItems(merged);
        playUiChirp(880);
        setFeedbackMsg(`${updatedCount} act / ${createdCount} nuevos`);
        setTimeout(() => setFeedbackMsg(null), 3000);

        // Dispatch global update event
        window.dispatchEvent(new CustomEvent('sgx:cms_data_updated', {
          detail: { entity: entityKey, count: merged.length }
        }));
      } catch (err: any) {
        alert(`Error al procesar CSV: ${err.message}`);
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center space-x-1.5 font-mono text-[11px]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Download CSV button */}
      <button
        type="button"
        onClick={handleDownload}
        className={`flex items-center space-x-1 bg-slate-900 hover:bg-[#32527B]/60 text-slate-300 hover:text-white border border-slate-700 hover:border-cyan-400 transition-all cursor-pointer ${
          compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5'
        }`}
        style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
        title={`Descargar plantilla CSV prellenada de ${schema.name}`}
      >
        <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>{compact ? 'CSV' : 'Descargar CSV'}</span>
      </button>

      {/* Upload CSV button */}
      <button
        type="button"
        disabled={isProcessing}
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center space-x-1 bg-slate-900 hover:bg-emerald-950/60 text-slate-300 hover:text-white border border-slate-700 hover:border-emerald-400 transition-all cursor-pointer ${
          compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5'
        }`}
        style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
        title={`Subir CSV editado para sincronizar y actualizar ${schema.name}`}
      >
        <UploadCloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>{compact ? 'Subir' : 'Importar CSV'}</span>
      </button>

      {feedbackMsg && (
        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
          <Check className="w-3 h-3 text-emerald-400" />
          {feedbackMsg}
        </span>
      )}
    </div>
  );
};
