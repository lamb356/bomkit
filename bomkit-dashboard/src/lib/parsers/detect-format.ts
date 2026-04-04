import { normalizeHeader } from './field-aliases';
import type { ParsedBOMFormat } from './types';
import { parseCsvText } from './csv-utils';

const BOMKIT_HEADERS = ['comment', 'designator', 'footprint', 'lcsc part number'];

export function detectFormat(input: string): ParsedBOMFormat {
  const rows = parseCsvText(input).slice(0, 6);
  const headerRow = rows.find((row) => row.length >= 3) ?? [];
  const normalized = headerRow.map(normalizeHeader);

  const hasBomkit = BOMKIT_HEADERS.every((header) => normalized.includes(header));
  if (hasBomkit) return 'bomkit-fab';
  return 'kicad-csv';
}
