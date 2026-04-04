import { describe, expect, it } from 'vitest';
import { classifyJlcPart, parseEconomicPartsCsv } from '../classifier';
import { calculateJlcFees } from '../fee-calculator';

const sampleCsv = [
  'Part # (LCSC),Library Type,Preferred,Description',
  'C1525,Basic,,100nF capacitor',
  'C2999,Extended,,MCU',
  'C3000,Extended,yes,Connector',
].join('\n');

describe('classifier', () => {
  it('parses economic parts csv into a lookup map', () => {
    const db = parseEconomicPartsCsv(sampleCsv);
    expect(db.get('C1525')?.classification).toBe('basic');
    expect(db.get('C2999')?.classification).toBe('extended');
    expect(db.get('C3000')?.classification).toBe('preferred_extended');
  });

  it('classifies known and unknown parts', () => {
    const db = parseEconomicPartsCsv(sampleCsv);
    expect(classifyJlcPart('C1525', db)).toBe('basic');
    expect(classifyJlcPart('C2999', db)).toBe('extended');
    expect(classifyJlcPart('C3000', db)).toBe('preferred_extended');
    expect(classifyJlcPart('C9999', db)).toBe('not_found');
    expect(classifyJlcPart('C1525', new Map())).toBe('unknown');
  });
});

describe('fee calculator', () => {
  it('counts tiers and computes unique extended loading fees', () => {
    const summary = calculateJlcFees([
      { lcscPart: 'C1525', jlcTier: 'basic' },
      { lcscPart: 'C2999', jlcTier: 'extended' },
      { lcscPart: 'C2999', jlcTier: 'extended' },
      { lcscPart: 'C3000', jlcTier: 'preferred_extended' },
      { lcscPart: null, jlcTier: 'not_found' },
    ]);

    expect(summary.basicCount).toBe(1);
    expect(summary.extendedCount).toBe(2);
    expect(summary.preferredExtendedCount).toBe(1);
    expect(summary.notFoundCount).toBe(1);
    expect(summary.uniqueExtendedParts).toBe(1);
    expect(summary.loadingFeePerBuildUsd).toBe(3);
    expect(summary.quantityBreakdown[10]).toBe(30);
  });
});
