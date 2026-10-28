/* RFC-4180 CSV helpers: escape, parse, download. The typed per-entity CSV
   (columns that match the real data) lives in lib/csv/. */

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
