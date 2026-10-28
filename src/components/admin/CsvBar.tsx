import React, { useRef, useState } from 'react';
import { Download, FileSpreadsheet, UploadCloud, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { downloadBackup, downloadTemplate, exportEntity, previewImport, type CsvEntity, type ImportMode, type ImportPreview } from '../../lib/csv/csvEngine';
import { playUiChirp } from '../../lib/cyberAudioEngine';

/* Export · Template · Import for one data set. Import never applies blind:
   it shows what will be added / changed / removed and the row errors first.
   Replacing the whole list downloads a backup of what is live before. */

interface Props {
  entity: CsvEntity;
  /** Called after a successful import so the panel can reload its state. */
  onApplied?: () => void;
  compact?: boolean;
}

export const CsvBar: React.FC<Props> = ({ entity, onApplied, compact }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(null), 4000); };

  const runPreview = async (t: string, m: ImportMode) => {
    setBusy(true);
    try { setPreview(await previewImport(entity, t, m)); } finally { setBusy(false); }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const t = await f.text();
    setText(t); setFileName(f.name); setMode('merge');
    await runPreview(t, 'merge');
  };

  const close = () => { setText(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; };

  const apply = async () => {
    if (!preview || !entity.save) return;
    setBusy(true);
    try {
      if (mode === 'replace') await downloadBackup(entity);
      await entity.save(preview.result, preview.previous);
      playUiChirp(980);
      const n = preview.added.length + preview.updated.length;
      flash(`${n} ${n === 1 ? 'cambio aplicado' : 'cambios aplicados'}${preview.removed.length ? ` · ${preview.removed.length} eliminados` : ''}`);
      close();
      onApplied?.();
    } catch (e: any) {
      flash(`No se pudo guardar: ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  const changes = preview ? preview.added.length + preview.updated.length + preview.removed.length : 0;
  const nameOf = (x: any) => x?.name || x?.title || x?.companyName || x?.question || x?.titleEs || x?.id;

  return (
    <div className={`sgx-csvbar${compact ? ' sgx-csvbar--compact' : ''}`}>
      <span className="sgx-csvbar__label"><FileSpreadsheet className="w-3.5 h-3.5" /> CSV</span>
      <button type="button" onClick={async () => { const n = await exportEntity(entity); flash(`${n} filas exportadas`); }} title={`Descargar ${entity.label} en CSV`}>
        <Download className="w-3.5 h-3.5" /> Exportar
      </button>
      <button type="button" onClick={() => downloadTemplate(entity)} title="Plantilla con las columnas, una fila de ayuda y un ejemplo">
        <Download className="w-3.5 h-3.5" /> Plantilla
      </button>
      {entity.save && (
        <button type="button" onClick={() => fileRef.current?.click()} title={`Subir un CSV de ${entity.label}`}>
          <UploadCloud className="w-3.5 h-3.5" /> Importar
        </button>
      )}
      <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {msg && <span className="sgx-csvbar__msg">{msg}</span>}

      {text !== null && (
        <div className="sgx-csvprev" role="dialog" aria-modal="true" aria-label={`Importar ${entity.label}`} onClick={close}>
          <div className="sgx-csvprev__frame" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <small>Importar CSV · {entity.label}</small>
                <h3>{fileName}</h3>
              </div>
              <button type="button" className="sgx-csvprev__x" onClick={close} aria-label="Cerrar"><X className="w-4 h-4" /></button>
            </header>

            {entity.allowReplace !== false && (
              <div className="sgx-csvprev__modes">
                <button type="button" aria-pressed={mode === 'merge'} onClick={() => { setMode('merge'); runPreview(text, 'merge'); }}>
                  <b>Combinar</b><span>Actualiza por id y añade los nuevos. Lo demás se queda.</span>
                </button>
                <button type="button" aria-pressed={mode === 'replace'} onClick={() => { setMode('replace'); runPreview(text, 'replace'); }}>
                  <b>Reemplazar todo</b><span>La lista queda igual al archivo. Se descarga un respaldo antes.</span>
                </button>
              </div>
            )}

            {busy && !preview && <p className="sgx-csvprev__note">Leyendo…</p>}
            {preview && (
              <>
                <div className="sgx-csvprev__stats">
                  <div data-tone="add"><b>{preview.added.length}</b><span>nuevos</span></div>
                  <div data-tone="upd"><b>{preview.updated.length}</b><span>actualizados</span></div>
                  <div><b>{preview.unchanged}</b><span>sin cambios</span></div>
                  <div data-tone="del"><b>{preview.removed.length}</b><span>eliminados</span></div>
                  <div data-tone={preview.errors.length ? 'err' : undefined}><b>{preview.errors.length}</b><span>errores</span></div>
                </div>

                {entity.note && <p className="sgx-csvprev__note">{entity.note}</p>}
                {preview.ignoredColumns.length > 0 && (
                  <p className="sgx-csvprev__note">Columnas ignoradas (no existen en este tipo de dato): {preview.ignoredColumns.join(', ')}</p>
                )}

                {preview.errors.length > 0 ? (
                  <div className="sgx-csvprev__errors">
                    <p><AlertTriangle className="w-4 h-4" /> Corrige estos errores y vuelve a subir el archivo. No se aplicó nada.</p>
                    <ul>
                      {preview.errors.slice(0, 40).map((e, i) => <li key={i}><b>Fila {e.row}</b> {e.message}</li>)}
                      {preview.errors.length > 40 && <li>… y {preview.errors.length - 40} más</li>}
                    </ul>
                  </div>
                ) : (
                  <div className="sgx-csvprev__list">
                    {preview.added.slice(0, 8).map((x: any) => <span key={`a${x.id}`} data-tone="add">+ {nameOf(x)}</span>)}
                    {preview.updated.slice(0, 8).map((x: any) => <span key={`u${x.id}`} data-tone="upd">~ {nameOf(x)}</span>)}
                    {preview.removed.slice(0, 8).map((x: any) => <span key={`r${x.id}`} data-tone="del">− {nameOf(x)}</span>)}
                  </div>
                )}

                <footer>
                  <button type="button" className="sgx-btn sgx-btn--ground" onClick={close}>Cancelar</button>
                  <button type="button" className="sgx-btn" disabled={busy || preview.errors.length > 0 || changes === 0} onClick={apply}>
                    <CheckCircle2 className="w-4 h-4" />
                    {changes === 0 ? 'No hay cambios' : mode === 'replace' ? `Respaldar y reemplazar (${changes})` : `Aplicar ${changes} cambios`}
                  </button>
                </footer>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvBar;
