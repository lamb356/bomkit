export interface ExportableRow {
  designators: string[];
  quantity: number;
  value: string;
  footprint: string;
  mpn: string | null;
  manufacturer: string | null;
  lcscPart: string | null;
  status: string;
  jlcTier: string;
  jlcLoadingFee: number;
  userNotes?: string | null;
}

function escapeCsv(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function exportRowsCsv(rows: ExportableRow[]): string {
  const header = ['Designators', 'Quantity', 'Value', 'Footprint', 'MPN', 'Manufacturer', 'LCSC Part', 'Status', 'JLC Tier', 'JLC Loading Fee', 'Notes'];
  const body = rows.map((row) => [
    row.designators.join(','),
    row.quantity,
    row.value,
    row.footprint,
    row.mpn,
    row.manufacturer,
    row.lcscPart,
    row.status,
    row.jlcTier,
    row.jlcLoadingFee,
    row.userNotes ?? '',
  ].map(escapeCsv).join(','));
  return [header.join(','), ...body].join('\n');
}

export function exportRowsJlcBom(rows: ExportableRow[]): string {
  const header = ['Comment', 'Designator', 'Footprint', 'LCSC Part Number'];
  const body = rows.map((row) => [
    row.value,
    row.designators.join(','),
    row.footprint,
    row.lcscPart ?? '',
  ].map(escapeCsv).join(','));
  return [header.join(','), ...body].join('\n');
}
