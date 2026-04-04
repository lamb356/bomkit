import { parseEconomicPartsCsv } from './classifier';

export interface CachedJlcPartRow {
  lcscPart: string;
  classification: string;
  preferred: boolean;
  description: string | null;
  source: string;
}

export async function refreshJlcPartsCache(fetchCsv: () => Promise<string>): Promise<CachedJlcPartRow[]> {
  const csv = await fetchCsv();
  const parsed = parseEconomicPartsCsv(csv);
  return Array.from(parsed.values()).map((row) => ({
    lcscPart: row.lcscPart,
    classification: row.classification,
    preferred: row.preferred,
    description: row.description,
    source: 'lrks/jlcpcb-economic-parts',
  }));
}
