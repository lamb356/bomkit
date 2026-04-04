export type ParsedBOMFormat = 'bomkit-fab' | 'kicad-csv';

export interface ParsedBOMRow {
  designators: string[];
  quantity: number;
  value: string;
  footprint: string;
  mpn: string | null;
  manufacturer: string | null;
  lcscPart: string | null;
  sourceFormat: ParsedBOMFormat;
}
