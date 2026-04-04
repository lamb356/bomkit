export type JLCTier = 'basic' | 'preferred_extended' | 'extended' | 'not_found' | 'unknown';

export interface JLCPartRecord {
  lcscPart: string;
  classification: JLCTier;
  preferred: boolean;
  description: string | null;
}

function normalize(value: string): string {
  return String(value || '').trim();
}

function normalizeHeaders(line: string): string[] {
  return line.split(',').map((item) => item.trim().toLowerCase());
}

export function parseEconomicPartsCsv(input: string): Map<string, JLCPartRecord> {
  const lines = input.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return new Map();

  const headers = normalizeHeaders(lines[0] || '');
  const lcscIndex = headers.findIndex((header) => header.includes('part') || header.includes('lcsc'));
  const typeIndex = headers.findIndex((header) => header.includes('library type') || header === 'type');
  const preferredIndex = headers.findIndex((header) => header.includes('preferred'));
  const descriptionIndex = headers.findIndex((header) => header.includes('description'));

  if (lcscIndex < 0 || typeIndex < 0) return new Map();

  const out = new Map<string, JLCPartRecord>();
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((item) => item.trim());
    const lcscPart = normalize(cols[lcscIndex] || '');
    if (!lcscPart) continue;
    const libraryType = normalize((cols[typeIndex] || '').toLowerCase());
    const preferred = preferredIndex >= 0 && ['yes', 'true', '1'].includes(normalize((cols[preferredIndex] || '').toLowerCase()));
    const classification: JLCTier = libraryType === 'basic'
      ? 'basic'
      : preferred
        ? 'preferred_extended'
        : libraryType === 'extended'
          ? 'extended'
          : 'unknown';

    out.set(lcscPart, {
      lcscPart,
      classification,
      preferred,
      description: descriptionIndex >= 0 ? normalize(cols[descriptionIndex] || '') || null : null,
    });
  }
  return out;
}

export function classifyJlcPart(lcscPart: string | null | undefined, partsDb: Map<string, JLCPartRecord> | null | undefined): JLCTier {
  const part = normalize(lcscPart || '');
  if (!partsDb || partsDb.size === 0) return 'unknown';
  if (!part) return 'not_found';
  return partsDb.get(part)?.classification ?? 'not_found';
}
