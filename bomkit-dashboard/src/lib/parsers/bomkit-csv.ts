import { parseCsvText, splitDesignators } from './csv-utils';
import type { ParsedBOMRow } from './types';

export function parseBomkitCsv(input: string): ParsedBOMRow[] {
  const rows = parseCsvText(input);
  const headerIndex = rows.findIndex((row) => row.map((v) => v.trim().toLowerCase()).includes('comment') && row.map((v) => v.trim().toLowerCase()).includes('designator'));
  if (headerIndex < 0) throw new Error('Could not find BOMKit Fab CSV header');
  const [, ...dataRows] = rows.slice(headerIndex);
  return dataRows.map((row) => {
    const [value = '', designator = '', footprint = '', lcsc = ''] = row;
    const designators = splitDesignators(designator);
    return {
      designators,
      quantity: designators.length || 1,
      value,
      footprint,
      mpn: null,
      manufacturer: null,
      lcscPart: lcsc || null,
      sourceFormat: 'bomkit-fab',
    } satisfies ParsedBOMRow;
  });
}
