import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseBomkitCsv } from '../bomkit-csv';
import { parseKicadCsv } from '../kicad-csv';

const bomkitFixture = resolve(__dirname, '../../../../../bomkit-fab/tests/fixtures/test_board/generated/manual_kicad/test_board_BOM_JLCPCB.csv');
const kicadFixture = resolve(__dirname, './fixtures/kicad-symbol-fields.csv');

describe('BOM parsers', () => {
  it('parses BOMKit Fab export rows', () => {
    const rows = parseBomkitCsv(readFileSync(bomkitFixture, 'utf-8'));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.sourceFormat).toBe('bomkit-fab');
    expect(rows.some((row) => row.lcscPart === 'C1525')).toBe(true);
  });

  it('parses KiCad symbol fields rows with semicolon delimiters, unicode, and missing MPNs', () => {
    const rows = parseKicadCsv(readFileSync(kicadFixture, 'utf-8'));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      designators: ['R1', 'R2'],
      quantity: 2,
      value: '10kΩ',
      footprint: 'R_0402',
      mpn: 'RC0402FR-0710KL',
      manufacturer: 'Yageo',
      lcscPart: 'C25744',
      sourceFormat: 'kicad-csv',
    });
    expect(rows[1]?.mpn).toBeNull();
    expect(rows[2]?.lcscPart).toBeNull();
  });
});
