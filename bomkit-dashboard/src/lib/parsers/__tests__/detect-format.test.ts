import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectFormat } from '../detect-format';

const fixtureDir = resolve(__dirname, '../../../../../bomkit-fab/tests/fixtures/test_board/generated/manual_kicad');
const bomkitCsv = readFileSync(resolve(fixtureDir, 'test_board_BOM_JLCPCB.csv'), 'utf-8');
const kicadCsv = readFileSync(resolve(__dirname, './fixtures/kicad-symbol-fields.csv'), 'utf-8');

describe('detectFormat', () => {
  it('detects BOMKit Fab export headers', () => {
    expect(detectFormat(bomkitCsv)).toBe('bomkit-fab');
  });

  it('detects KiCad symbol fields csv', () => {
    expect(detectFormat(kicadCsv)).toBe('kicad-csv');
  });
});
