export const LCSC_ALIASES = [
  'LCSC',
  'LCSC Part Number',
  'LCSC_Part',
  'lcsc',
  'lcsc_part',
  'lcsc_part_number',
  'jlcpcb_part',
  'jlc',
] as const;

export const MPN_ALIASES = [
  'mpn',
  'pn',
  'p#',
  'part_num',
  'manf#',
  'mfg#',
  'mfr#',
  'part_number',
  'manufacturer_part',
  'mfr_part',
  'mfg_part_number',
  'manf_pn',
] as const;

export const MANUFACTURER_ALIASES = [
  'manufacturer',
  'mfr',
  'mfg',
  'maker',
  'brand',
  'manf',
  'mfr_name',
  'manufacturer_name',
  'vendor_manufacturer',
] as const;

export function normalizeHeader(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .trim();
}

export function aliasLookup(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const header of headers) {
    map.set(normalizeHeader(header), header);
  }
  return map;
}

export function findAlias(headers: string[], aliases: readonly string[]): string | null {
  const lookup = aliasLookup(headers);
  for (const alias of aliases) {
    const hit = lookup.get(normalizeHeader(alias));
    if (hit) return hit;
  }
  return null;
}
