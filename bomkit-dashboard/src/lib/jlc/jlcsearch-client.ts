export interface JLCSearchResult {
  lcsc: string;
  mfr: string;
  package: string;
  description: string;
  stock: number;
  price: number;
  source: 'jlcsearch.tscircuit.com';
  checkedAt: string;
}

interface RawJLCResult {
  lcsc: number | string;
  mfr?: string;
  package?: string;
  description?: string;
  stock?: number;
  price?: string;
}

function extractFirstPrice(rawPrice: string | undefined): number {
  if (!rawPrice) return 0;
  try {
    const parsed = JSON.parse(rawPrice) as Array<{ price?: number }>;
    return Number(parsed[0]?.price ?? 0);
  } catch {
    return 0;
  }
}

function normalizeResult(raw: RawJLCResult): JLCSearchResult {
  return {
    lcsc: String(raw.lcsc ?? ''),
    mfr: raw.mfr ?? '',
    package: raw.package ?? '',
    description: raw.description ?? '',
    stock: Number(raw.stock ?? 0),
    price: extractFirstPrice(raw.price),
    source: 'jlcsearch.tscircuit.com',
    checkedAt: new Date().toISOString(),
  };
}

export async function searchParts(query: string, packageFilter?: string): Promise<JLCSearchResult[]> {
  const url = new URL('https://jlcsearch.tscircuit.com/components/list.json');
  url.searchParams.set('search', query);
  if (packageFilter) url.searchParams.set('package', packageFilter);

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'hermes-bomkit-dashboard/1.0',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`jlcsearch request failed: ${response.status}`);
  }

  const data = (await response.json()) as { components?: RawJLCResult[] };
  return (data.components ?? []).map(normalizeResult);
}

export async function getPartByLCSC(lcscNumber: string): Promise<JLCSearchResult | null> {
  const results = await searchParts(lcscNumber);
  const normalized = lcscNumber.replace(/^C/i, '');
  return results.find((item) => item.lcsc === lcscNumber || item.lcsc === normalized) ?? results[0] ?? null;
}
