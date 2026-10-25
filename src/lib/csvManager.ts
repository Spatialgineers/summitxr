/**
 * Spatialgineers Summit 2026 - Comprehensive CSV Management Engine
 * Handles RFC-4180 compliant CSV export with pre-filled templates, 
 * robust CSV parsing, column validation, and intelligent merge/update.
 */

export interface CsvColumnDef {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  description?: string;
}

export interface CsvEntitySchema {
  id: string;
  name: string;
  description: string;
  filenamePrefix: string;
  columns: CsvColumnDef[];
}

export const CSV_ENTITY_SCHEMAS: Record<string, CsvEntitySchema> = {
  SESSIONS: {
    id: 'SESSIONS',
    name: 'Agenda & Sesiones de Transmisión',
    description: 'Charlas magistrales, paneles, demos y transmisiones en vivo del Summit.',
    filenamePrefix: 'sgx_agenda_sesiones',
    columns: [
      { key: 'id', label: 'ID', required: true, description: 'Identificador único (ej: sess_01)' },
      { key: 'title', label: 'Titulo', required: true, description: 'Nombre de la sesión' },
      { key: 'description', label: 'Descripcion', required: true, description: 'Resumen detallado' },
      { key: 'track', label: 'Track_Pilar', required: true, description: 'SGX.STORY, SGX.STAGE, SGX.SPARK, etc.' },
      { key: 'speakerId', label: 'Speaker_ID', required: false, description: 'ID del conferencista' },
      { key: 'dayNumber', label: 'Dia_Numero', required: true, type: 'number', description: '1, 2 o 3' },
      { key: 'startTime', label: 'Hora_Inicio', required: true, description: 'ej: 09:30 AM' },
      { key: 'endTime', label: 'Hora_Fin', required: true, description: 'ej: 10:45 AM' },
      { key: 'location', label: 'Ubicacion_Sala', required: true, description: 'ej: Chroma Space Main Stage' },
      { key: 'streamUrl', label: 'Stream_Video_URL', required: false, description: 'Enlace HLS, YouTube o video 4K' },
      { key: 'capacity', label: 'Capacidad', required: false, type: 'number', description: 'Aforo presencial/virtual' }
    ]
  },
  SPEAKERS: {
    id: 'SPEAKERS',
    name: 'Conferencistas & Voceros (Speakers)',
    description: 'Expertos, directores y oradores con fotos, roles y biografías.',
    filenamePrefix: 'sgx_speakers_conferencistas',
    columns: [
      { key: 'id', label: 'ID', required: true, description: 'Identificador único (ej: spk_01)' },
      { key: 'name', label: 'Nombre', required: true, description: 'Nombre completo' },
      { key: 'role', label: 'Rol_Cargo', required: true, description: 'ej: Director de Spatial Computing' },
      { key: 'company', label: 'Empresa_Organizacion', required: true, description: 'ej: Spatialgineers' },
      { key: 'bio', label: 'Biografia', required: true, description: 'Trayectoria del orador' },
      { key: 'avatarUrl', label: 'Avatar_Asset_URL', required: true, description: 'Enlace web a la foto/avatar' },
      { key: 'pillarTag', label: 'Pilar_Asignado', required: true, description: 'Pilar tecnológico SGX' },
      { key: 'socialLink', label: 'Enlace_Social', required: false, description: 'LinkedIn, X o sitio web' },
      { key: 'featured', label: 'Destacado', required: false, type: 'boolean', description: 'true o false' }
    ]
  },
  BROADCAST_ROOMS: {
    id: 'BROADCAST_ROOMS',
    name: 'Salas de Transmisión 4K',
    description: 'Feeds de broadcast en vivo, multisesión y transmisiones de alta fidelidad.',
    filenamePrefix: 'sgx_salas_broadcast_4k',
    columns: [
      { key: 'id', label: 'ID', required: true, description: 'Identificador único (ej: room_main)' },
      { key: 'name', label: 'Nombre_Sala', required: true, description: 'Nombre del broadcast' },
      { key: 'resolution', label: 'Resolucion', required: true, description: 'ej: 4K 60FPS UHD' },
      { key: 'videoUrl', label: 'Stream_Video_URL', required: true, description: 'URL de transmisión en vivo' },
      { key: 'streamStatus', label: 'Estado', required: true, description: 'LIVE, STANDBY u OFFLINE' },
      { key: 'viewerCount', label: 'Audiencia_Estimada', required: false, type: 'number', description: 'Número de espectadores' },
      { key: 'description', label: 'Descripcion', required: true, description: 'Detalle de la sala' }
    ]
  },
  MAP_NODES: {
    id: 'MAP_NODES',
    name: 'Nodos Espaciales & Tour 360°',
    description: 'Ubicaciones del recinto Chroma Studios y puntos de interés 360.',
    filenamePrefix: 'sgx_mapa_360_nodos',
    columns: [
      { key: 'id', label: 'ID', required: true, description: 'Identificador único (ej: node_chroma)' },
      { key: 'title', label: 'Titulo_Lugar', required: true, description: 'Nombre del área espacial' },
      { key: 'description', label: 'Descripcion', required: true, description: 'Información del punto 360' },
      { key: 'imageUrl', label: 'Imagen_360_Asset_URL', required: true, description: 'URL del panorama o foto 360' },
      { key: 'category', label: 'Categoria', required: true, description: 'Stage, Booth, Lounge, etc.' },
      { key: 'hotspotsCount', label: 'Puntos_Interaccion', required: false, type: 'number', description: 'Hotspots interactivos' }
    ]
  },
  SPONSORS: {
    id: 'SPONSORS',
    name: 'Patrocinadores & Marcas Comerciales',
    description: 'Empresas aliadas, niveles de patrocinio, logos y stands.',
    filenamePrefix: 'sgx_patrocinadores_marcas',
    columns: [
      { key: 'id', label: 'ID', required: true, description: 'Identificador único (ej: sp_01)' },
      { key: 'name', label: 'Nombre_Marca', required: true, description: 'Nombre de la empresa' },
      { key: 'tierId', label: 'Nivel_Tier', required: true, description: 'tier_1 (Title), tier_2, tier_3' },
      { key: 'logoUrl', label: 'Logo_Asset_URL', required: true, description: 'URL del logo en alta resolución' },
      { key: 'websiteUrl', label: 'Sitio_Web', required: true, description: 'Enlace web oficial' },
      { key: 'standBoothNumber', label: 'Numero_Stand', required: false, description: 'ej: Stand A-12' },
      { key: 'description', label: 'Descripcion', required: true, description: 'Propuesta de valor del sponsor' },
      { key: 'contactEmail', label: 'Email_Contacto', required: false, description: 'Correo de contacto' }
    ]
  },
  QUESTIONS: {
    id: 'QUESTIONS',
    name: 'Preguntas CYOA & Votación en Vivo',
    description: 'Escenarios interactivos para dirigir el escenario 3D en la Arena.',
    filenamePrefix: 'sgx_preguntas_cyoa_votacion',
    columns: [
      { key: 'id', label: 'ID', required: true, description: 'Identificador único (ej: q_1)' },
      { key: 'prompt', label: 'Pregunta_Prompt', required: true, description: 'Texto de la consulta' },
      { key: 'timeLimit', label: 'Tiempo_Segundos', required: true, type: 'number', description: 'Duración del temporizador' },
      { key: 'option1', label: 'Opcion_1', required: true, description: 'Primera alternativa' },
      { key: 'option2', label: 'Opcion_2', required: true, description: 'Segunda alternativa' },
      { key: 'option3', label: 'Opcion_3', required: false, description: 'Tercera alternativa (opcional)' },
      { key: 'option4', label: 'Opcion_4', required: false, description: 'Cuarta alternativa (opcional)' },
      { key: 'presetId', label: 'Preset_FX_ID', required: false, description: 'ID del preset visual (ej: cyber_pulse)' }
    ]
  },
  EMBEDS: {
    id: 'EMBEDS',
    name: 'Widgets Interactivos & Minijuegos',
    description: 'Simuladores 3D, canvas de drones y módulos externos.',
    filenamePrefix: 'sgx_widgets_juegos',
    columns: [
      { key: 'id', label: 'ID', required: true, description: 'Identificador único' },
      { key: 'title', label: 'Titulo_Juego', required: true, description: 'Nombre de la experiencia' },
      { key: 'category', label: 'Categoria', required: true, description: 'SIMULATOR, GAME, STREAM' },
      { key: 'embedUrl', label: 'Embed_URL', required: true, description: 'Enlace web interactivo' },
      { key: 'description', label: 'Descripcion', required: true, description: 'Instrucciones del juego' },
      { key: 'rewardXp', label: 'Recompensa_XP', required: false, type: 'number', description: 'XP otorgada al interactuar' }
    ]
  },
  GAMIFICATION: {
    id: 'GAMIFICATION',
    name: 'Niveles Gamificados & Recompensas',
    description: 'Tiers del pasaporte, insignias, cupones y umbrales de puntos.',
    filenamePrefix: 'sgx_gamificacion_niveles',
    columns: [
      { key: 'id', label: 'ID', required: true, description: 'ej: tier_bronze, tier_silver' },
      { key: 'name', label: 'Nombre_Rango', required: true, description: 'Nombre oficial del rango' },
      { key: 'minPoints', label: 'Puntos_Minimos_XP', required: true, type: 'number', description: 'XP requerida para desbloquear' },
      { key: 'badgeIcon', label: 'Icono_Badge', required: true, description: 'Emoji o URL de insignia' },
      { key: 'perkReward', label: 'Beneficio_Perk', required: true, description: 'Recompensa otorgada' },
      { key: 'couponCode', label: 'Codigo_Cupon', required: false, description: 'Código canjeable de descuento' }
    ]
  }
};

/**
 * Escapes a cell value for RFC-4180 CSV compliance
 */
export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (typeof value === 'boolean') {
    str = value ? 'true' : 'false';
  }
  // If string contains quotes, commas or newlines, quote and escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates RFC-4180 CSV string with pre-filled items
 */
export function generatePrefilledCsv<T extends Record<string, any>>(
  schema: CsvEntitySchema,
  items: T[]
): string {
  // Header row
  const headerRow = schema.columns.map(col => escapeCsvCell(col.key)).join(',');

  // Data rows
  const dataRows = items.map(item => {
    return schema.columns.map(col => {
      let val = item[col.key];

      // Handle nested or specialized fields if needed
      if (val === undefined && schema.id === 'QUESTIONS') {
        if (col.key === 'option1') val = item.options?.[0]?.text;
        if (col.key === 'option2') val = item.options?.[1]?.text;
        if (col.key === 'option3') val = item.options?.[2]?.text;
        if (col.key === 'option4') val = item.options?.[3]?.text;
      }

      return escapeCsvCell(val);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Triggers browser file download of CSV
 */
export function downloadCsvFile(csvContent: string, filename: string): void {
  // Prepend UTF-8 BOM so Excel opens with proper accent character encoding
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust RFC-4180 compliant CSV Parser
 * Handles escaped quotes (""), newlines within quotes, variable row lengths
 */
export function parseCsvText(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, ''); // remove UTF-8 BOM if present
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuote = false;
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (insideQuote) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i += 2;
        continue;
      } else if (char === '"') {
        // End of quoted cell
        insideQuote = false;
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
        continue;
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i += 2;
        continue;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    }
  }

  // Push final cell and row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  // Filter out empty rows
  return rows.filter(row => row.some(cell => cell.trim().length > 0));
}

export interface CsvValidationResult<T = any> {
  isValid: boolean;
  parsedRows: T[];
  matchedColumns: string[];
  missingRequiredColumns: string[];
  totalRows: number;
  validRowsCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Validates parsed CSV against entity schema and constructs mapped objects
 */
export function validateAndParseCsv<T extends Record<string, any>>(
  csvText: string,
  schema: CsvEntitySchema
): CsvValidationResult<T> {
  const rawRows = parseCsvText(csvText);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rawRows.length === 0) {
    return {
      isValid: false,
      parsedRows: [],
      matchedColumns: [],
      missingRequiredColumns: schema.columns.filter(c => c.required).map(c => c.key),
      totalRows: 0,
      validRowsCount: 0,
      errors: ['El archivo CSV está completamente vacío.'],
      warnings: []
    };
  }

  const rawHeaders = rawRows[0].map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  
  // Map schema columns to header indexes
  const headerIndexMap: Record<string, number> = {};
  const matchedColumns: string[] = [];
  const missingRequiredColumns: string[] = [];

  schema.columns.forEach(col => {
    const colKeyLower = col.key.toLowerCase();
    const colLabelLower = col.label.toLowerCase();
    
    // Find matching index in CSV header
    const idx = rawHeaders.findIndex(h => 
      h === colKeyLower || 
      h === colLabelLower || 
      h.replace(/[_\s-]/g, '') === colKeyLower.replace(/[_\s-]/g, '') ||
      h.replace(/[_\s-]/g, '') === colLabelLower.replace(/[_\s-]/g, '')
    );

    if (idx !== -1) {
      headerIndexMap[col.key] = idx;
      matchedColumns.push(col.key);
    } else if (col.required) {
      missingRequiredColumns.push(col.key);
    }
  });

  if (missingRequiredColumns.length > 0) {
    errors.push(`Faltan columnas requeridas obligatorias: ${missingRequiredColumns.join(', ')}`);
  }

  const parsedRows: T[] = [];
  const dataRows = rawRows.slice(1);

  dataRows.forEach((row, rowIdx) => {
    const rowObj: Record<string, any> = {};
    let rowHasId = false;

    schema.columns.forEach(col => {
      const colIdx = headerIndexMap[col.key];
      if (colIdx !== undefined && colIdx < row.length) {
        let rawVal = row[colIdx].trim();

        if (col.key === 'id' && rawVal) {
          rowHasId = true;
        }

        if (col.type === 'number') {
          const num = Number(rawVal.replace(/[^0-9.-]/g, ''));
          rowObj[col.key] = isNaN(num) ? 0 : num;
        } else if (col.type === 'boolean') {
          rowObj[col.key] = rawVal.toLowerCase() === 'true' || rawVal === '1' || rawVal.toLowerCase() === 'si' || rawVal.toLowerCase() === 'yes';
        } else {
          rowObj[col.key] = rawVal;
        }
      }
    });

    // Special handler for QUESTIONS entity
    if (schema.id === 'QUESTIONS' && (!rowObj.options || rowObj.options.length === 0)) {
      const opts = [];
      if (rowObj.option1) opts.push({ id: 'opt_1', text: rowObj.option1, voteCount: 0 });
      if (rowObj.option2) opts.push({ id: 'opt_2', text: rowObj.option2, voteCount: 0 });
      if (rowObj.option3) opts.push({ id: 'opt_3', text: rowObj.option3, voteCount: 0 });
      if (rowObj.option4) opts.push({ id: 'opt_4', text: rowObj.option4, voteCount: 0 });
      rowObj.options = opts;
    }

    // Auto-generate ID if missing
    if (!rowObj.id) {
      rowObj.id = `${schema.filenamePrefix}_${Date.now()}_${rowIdx + 1}`;
      warnings.push(`Fila ${rowIdx + 2}: ID generado automáticamente (${rowObj.id}).`);
    }

    parsedRows.push(rowObj as T);
  });

  const isValid = errors.length === 0 && parsedRows.length > 0;

  return {
    isValid,
    parsedRows,
    matchedColumns,
    missingRequiredColumns,
    totalRows: dataRows.length,
    validRowsCount: parsedRows.length,
    errors,
    warnings
  };
}

/**
 * Merges parsed CSV rows into existing items by 'id', preserving any additional properties
 */
export function mergeCsvRecords<T extends { id: string }>(
  existingItems: T[],
  importedRows: Partial<T>[]
): { merged: T[]; updatedCount: number; createdCount: number } {
  const existingMap = new Map<string, T>();
  existingItems.forEach(item => existingMap.set(item.id, { ...item }));

  let updatedCount = 0;
  let createdCount = 0;

  importedRows.forEach(row => {
    if (!row.id) return;

    if (existingMap.has(row.id)) {
      // Merge updating fields
      const current = existingMap.get(row.id)!;
      existingMap.set(row.id, { ...current, ...row });
      updatedCount++;
    } else {
      // Create new
      existingMap.set(row.id, row as T);
      createdCount++;
    }
  });

  return {
    merged: Array.from(existingMap.values()),
    updatedCount,
    createdCount
  };
}
