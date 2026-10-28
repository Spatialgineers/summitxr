import { escapeCsvCell, parseCsvText, downloadCsvFile } from '../csvManager';
import { findPillar } from '../sgxPillars';

/* Typed CSV for the admin: every data set declares its columns against the
   real fields it stores, so an export can be edited in Excel/Sheets and
   imported back without losing or inventing fields.

   File layout: row 1 = column names (the field paths), row 2 = a "#" help
   row (any row whose first cell starts with # is ignored on import), then one
   row per item. Arrays are written "a | b | c"; nested data that has no
   simple shape goes as JSON in one cell. Columns missing from a file keep
   their current values; a cell present but empty clears that field. */

export type CsvKind =
  | 'text' | 'number' | 'bool' | 'list' | 'json' | 'pillar'
  | { oneOf: readonly (string | number)[] };

export interface CsvCol<T = any> {
  /** Field path in the item, e.g. "name" or "socialLinks.linkedin". Also the column header. */
  field: string;
  help: string;
  kind?: CsvKind;
  required?: boolean;
  /** Custom read/write for virtual columns (e.g. poll options). */
  get?: (item: T) => unknown;
  set?: (item: T, value: unknown) => void;
  /** Shown in exports but never written on import. */
  readOnly?: boolean;
}

export interface CsvEntity<T extends Record<string, any> = any> {
  key: string;
  label: string;
  file: string;
  cols: CsvCol<T>[];
  load: () => T[] | Promise<T[]>;
  /** Persists (and publishes) the full list. `previous` lets per-doc stores delete removed items. */
  save?: (items: T[], previous: T[]) => unknown | Promise<unknown>;
  /** Defaults for a brand-new row. */
  blank?: () => Partial<T>;
  /** Fills derived fields after a row is applied (e.g. sort minutes from the start time). */
  finalize?: (item: T) => T;
  idPrefix?: string;
  /** false: only existing ids can be updated (missions). */
  allowNew?: boolean;
  /** false: merge only, never replace the whole list. */
  allowReplace?: boolean;
  /** Extra note shown in the import preview. */
  note?: string;
}

/* ---------- field paths ---------- */

function getPath(obj: any, path: string): unknown {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj: any, path: string, value: unknown): void {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
    o = o[k];
  });
  const last = keys[keys.length - 1];
  if (value === undefined) delete o[last];
  else o[last] = value;
}

/* ---------- cell <-> value ---------- */

const TRUE = ['true', '1', 'si', 'sí', 'yes', 'y', 'x', 'verdadero'];
const FALSE = ['false', '0', 'no', 'n', 'falso', ''];

function toCell(col: CsvCol, item: any): string {
  const v = col.get ? col.get(item) : getPath(item, col.field);
  if (v === undefined || v === null) return '';
  const kind = col.kind || 'text';
  if (kind === 'list') return Array.isArray(v) ? v.join(' | ') : String(v);
  if (kind === 'json') return JSON.stringify(v);
  if (kind === 'bool') return v ? 'true' : 'false';
  return String(v);
}

function fromCell(col: CsvCol, raw: string): { value?: unknown; error?: string } {
  const s = raw.trim();
  const kind = col.kind || 'text';
  if (!s) {
    if (col.required) return { error: `"${col.field}" es obligatorio` };
    if (kind === 'list') return { value: [] };
    if (kind === 'bool') return { value: false };
    return { value: undefined };
  }
  if (kind === 'number') {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? { value: n } : { error: `"${col.field}" debe ser un número (llegó "${s}")` };
  }
  if (kind === 'bool') {
    const l = s.toLowerCase();
    if (TRUE.includes(l)) return { value: true };
    if (FALSE.includes(l)) return { value: false };
    return { error: `"${col.field}" debe ser true o false (llegó "${s}")` };
  }
  if (kind === 'list') return { value: s.split('|').map((x) => x.trim()).filter(Boolean) };
  if (kind === 'json') {
    try { return { value: JSON.parse(s) }; } catch { return { error: `"${col.field}" no es JSON válido` }; }
  }
  if (kind === 'pillar') {
    const p = findPillar(s);
    return p ? { value: `SGX.${p.key}` } : { error: `"${col.field}": pilar desconocido "${s}" (usa SGX.Story, SGX.Showcase, SGX.Spark, SGX.Stage, SGX.System o SGX.Synthesize)` };
  }
  if (typeof kind === 'object') {
    const hit = kind.oneOf.find((o) => String(o).toLowerCase() === s.toLowerCase());
    if (hit === undefined) return { error: `"${col.field}" debe ser uno de: ${kind.oneOf.join(', ')} (llegó "${s}")` };
    return { value: hit };
  }
  return { value: s };
}

function kindHelp(col: CsvCol): string {
  const kind = col.kind || 'text';
  const req = col.required ? 'OBLIGATORIO. ' : '';
  const ro = col.readOnly ? 'Solo lectura. ' : '';
  const k = kind === 'list' ? ' [lista: a | b | c]'
    : kind === 'json' ? ' [JSON]'
    : kind === 'bool' ? ' [true/false]'
    : kind === 'number' ? ' [número]'
    : kind === 'pillar' ? ' [SGX.Story … SGX.Synthesize]'
    : typeof kind === 'object' ? ` [${kind.oneOf.join(' / ')}]`
    : '';
  return `# ${ro}${req}${col.help}${k}`;
}

/* ---------- export ---------- */

export function buildCsv<T>(entity: CsvEntity<T>, items: T[]): string {
  const header = entity.cols.map((c) => escapeCsvCell(c.field)).join(',');
  const help = entity.cols.map((c) => escapeCsvCell(kindHelp(c))).join(',');
  const rows = items.map((it) => entity.cols.map((c) => escapeCsvCell(toCell(c, it))).join(','));
  return [header, help, ...rows].join('\n');
}

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

export async function exportEntity(entity: CsvEntity): Promise<number> {
  const items = await entity.load();
  downloadCsvFile(buildCsv(entity, items), `${entity.file}_${stamp()}.csv`);
  return items.length;
}

/** Header + help + one example row (the first current item, or the blank defaults). */
export async function downloadTemplate(entity: CsvEntity): Promise<void> {
  const items = await entity.load();
  const example = items[0] || { id: `${entity.idPrefix || entity.key}_ejemplo`, ...(entity.blank?.() || {}) };
  downloadCsvFile(buildCsv(entity, [example]), `${entity.file}_plantilla.csv`);
}

/* ---------- import ---------- */

export type ImportMode = 'merge' | 'replace';

export interface ImportPreview<T = any> {
  added: T[];
  updated: T[];
  unchanged: number;
  removed: T[];
  errors: { row: number; message: string }[];
  ignoredColumns: string[];
  result: T[];
  previous: T[];
}

export async function previewImport<T extends Record<string, any>>(entity: CsvEntity<T>, text: string, mode: ImportMode): Promise<ImportPreview<T>> {
  const previous = (await entity.load()).map((x) => JSON.parse(JSON.stringify(x)) as T);
  const table = parseCsvText(text.replace(/^﻿/, '')).filter((r) => r.some((c) => c.trim() !== ''));
  const errors: ImportPreview['errors'] = [];
  if (!table.length) return { added: [], updated: [], unchanged: 0, removed: [], errors: [{ row: 1, message: 'El archivo está vacío.' }], ignoredColumns: [], result: previous, previous };

  const header = table[0].map((h) => h.trim().replace(/^#\s*/, ''));
  const colAt = header.map((h) => entity.cols.find((c) => c.field.toLowerCase() === h.toLowerCase()));
  const ignoredColumns = header.filter((h, i) => h && !colAt[i]);
  const idIdx = header.findIndex((h) => h.toLowerCase() === 'id');
  if (idIdx < 0) errors.push({ row: 1, message: 'Falta la columna "id". Descarga la plantilla para ver el formato.' });
  entity.cols.filter((c) => c.required && !c.readOnly && !header.some((h) => h.toLowerCase() === c.field.toLowerCase()))
    .forEach((c) => errors.push({ row: 1, message: `Falta la columna obligatoria "${c.field}".` }));

  const byId = new Map(previous.map((p) => [String(p.id), p]));
  const seen = new Set<string>();
  const added: T[] = [];
  const updated: T[] = [];
  let unchanged = 0;
  const touched = new Map<string, T>();

  if (idIdx >= 0) {
    table.slice(1).forEach((cells, i) => {
      const rowNo = i + 2;
      if ((cells[0] || '').trim().startsWith('#')) return;
      let id = (cells[idIdx] || '').trim();
      if (!id) {
        if (entity.allowNew === false) { errors.push({ row: rowNo, message: 'Fila sin id.' }); return; }
        id = `${entity.idPrefix || entity.key}_${Date.now().toString(36)}_${i}`;
      }
      if (seen.has(id)) { errors.push({ row: rowNo, message: `El id "${id}" está repetido en el archivo.` }); return; }
      seen.add(id);
      const existing = byId.get(id);
      if (!existing && entity.allowNew === false) { errors.push({ row: rowNo, message: `No existe "${id}". Aquí solo se pueden editar los que ya existen.` }); return; }
      const base: any = existing ? JSON.parse(JSON.stringify(existing)) : { ...(entity.blank?.() || {}), id };
      let rowOk = true;
      colAt.forEach((col, ci) => {
        if (!col || col.readOnly || col.field === 'id') return;
        const { value, error } = fromCell(col, cells[ci] ?? '');
        if (error) { errors.push({ row: rowNo, message: error }); rowOk = false; return; }
        if (col.set) col.set(base, value);
        else setPath(base, col.field, value);
      });
      if (!rowOk) return;
      const item = (entity.finalize ? entity.finalize(base) : base) as T;
      touched.set(id, item);
      if (!existing) added.push(item);
      else if (JSON.stringify(existing) !== JSON.stringify(item)) updated.push(item);
      else unchanged++;
    });
  }

  let result: T[];
  let removed: T[] = [];
  if (mode === 'replace') {
    result = Array.from(touched.values());
    removed = previous.filter((p) => !touched.has(String(p.id)));
  } else {
    result = previous.map((p) => touched.get(String(p.id)) || p);
    added.forEach((a) => result.push(a));
  }
  return { added, updated, unchanged, removed, errors, ignoredColumns, result, previous };
}

/** Backup of what is live right now, downloaded before a replace. */
export async function downloadBackup(entity: CsvEntity): Promise<void> {
  const items = await entity.load();
  downloadCsvFile(buildCsv(entity, items), `${entity.file}_RESPALDO_${stamp()}.csv`);
}

/* ---------- export-only tables (people data) ---------- */

export function downloadRows(file: string, headers: string[], rows: unknown[][]): void {
  const lines = [headers, ...rows].map((r) => r.map((c) => escapeCsvCell(Array.isArray(c) ? c.join(' | ') : c ?? '')).join(','));
  downloadCsvFile(lines.join('\n'), `${file}_${stamp()}.csv`);
}
