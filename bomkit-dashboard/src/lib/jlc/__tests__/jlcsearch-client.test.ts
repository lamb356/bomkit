import { describe, expect, it, vi } from 'vitest';
import { getPartByLCSC, searchParts } from '../jlcsearch-client';

describe('jlcsearch client', () => {
  it('normalizes search results from jlcsearch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        components: [
          {
            lcsc: 960916,
            mfr: 'CL05B104KB5NNNC',
            package: '0402',
            description: 'Capacitor',
            stock: 10,
            price: '[{"qFrom":20,"price":0.0055}]',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchParts('CL05B104KB5NNNC', '0402');
    expect(results[0]).toMatchObject({
      lcsc: '960916',
      mfr: 'CL05B104KB5NNNC',
      package: '0402',
      stock: 10,
      price: 0.0055,
      source: 'jlcsearch.tscircuit.com',
    });
  });

  it('returns the first result when looking up an LCSC number', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        components: [
          { lcsc: 71629, mfr: 'GRM155R71C104KA88D', package: '0402', stock: 20, price: '[]' },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getPartByLCSC('71629');
    expect(result?.lcsc).toBe('71629');
    expect(result?.mfr).toBe('GRM155R71C104KA88D');
  });
});
