import { detectDelimiter, parseCsvLine, splitDesignators } from './csv-utils';
import { findAlias, MANUFACTURER_ALIASES, MPN_ALIASES, LCSC_ALIASES, normalizeHeader } from './field-aliases';
import type { ParsedBOMRow } from './types';

const REFERENCE_HEADERS = ['reference', 'designator', 'ref'];
const VALUE_HEADERS = ['value', 'comment'];
const FOOTPRINT_HEADERS = ['footprint', 'package'];

function findHeader(headers: string[], aliases: string[]): string | null {
  for (const alias of aliases) {
    const hit = headers.find((header) => normalizeHeader(header) === normalizeHeader(alias));
    if (hit) return hit;
  }
  return null;
}

export function parseKicadCsv(input: string): ParsedBOMRow[] {
  const delimiter = detectDelimiter(input);
  const lines = input.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const parsed = lines.map((line) => parseCsvLine(line, delimiter));
  const headerIndex = parsed.findIndex((row) => {
    const normalized = row.map(normalizeHeader);
    return normalized.some((h) => REFERENCE_HEADERS.includes(h)) && normalized.some((h) => VALUE_HEADERS.includes(h));
  });
  if (headerIndex < 0) throw new Error('Could not find KiCad CSV header');
  const headers = parsed[headerIndex];
  const rows = parsed.slice(headerIndex + 1);
  const refHeader = findHeader(headers, REFERENCE_HEADERS)!;
  const valueHeader = findHeader(headers, VALUE_HEADERS)!;
  const footprintHeader = findHeader(headers, FOOTPRINT_HEADERS) ?? '';
  const mpnHeader = findAlias(headers, MPN_ALIASES);
  const manufacturerHeader = findAlias(headers, MANUFACTURER_ALIASES);
  const lcscHeader = findAlias(headers, LCSC_ALIASES);
  const indexOf = (header: string | null) => (header ? headers.indexOf(header) : -1);

  return rows.map((row) => {
    const designators = splitDesignators(row[indexOf(refHeader)] || '');
    return {
      designators,
      quantity: designators.length || 1,
      value: row[indexOf(valueHeader)] || '',
      footprint: footprintHeader ? row[indexOf(footprintHeader)] || '' : '',
      mpn: mpnHeader ? row[indexOf(mpnHeader)] || null : null,
      manufacturer: manufacturerHeader ? row[indexOf(manufacturerHeader)] || null : null,
      lcscPart: lcscHeader ? row[indexOf(lcscHeader)] || null : null,
      sourceFormat: 'kicad-csv',
    } satisfies ParsedBOMRow;
  });
}
