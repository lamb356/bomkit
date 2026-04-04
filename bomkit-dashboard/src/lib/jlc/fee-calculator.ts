import type { JLCTier } from './classifier';

export interface ClassifiedRow {
  lcscPart: string | null;
  jlcTier: JLCTier;
}

export interface FeeSummary {
  totalRows: number;
  basicCount: number;
  preferredExtendedCount: number;
  extendedCount: number;
  notFoundCount: number;
  unknownCount: number;
  uniqueExtendedParts: number;
  loadingFeePerBuildUsd: number;
  quantityBreakdown: Record<number, number>;
}

const EXTENDED_LOADING_FEE_USD = 3;
const DEFAULT_QUANTITIES = [5, 10, 30, 50, 100] as const;

export function calculateJlcFees(rows: ClassifiedRow[], quantities: readonly number[] = DEFAULT_QUANTITIES): FeeSummary {
  const summary: FeeSummary = {
    totalRows: rows.length,
    basicCount: 0,
    preferredExtendedCount: 0,
    extendedCount: 0,
    notFoundCount: 0,
    unknownCount: 0,
    uniqueExtendedParts: 0,
    loadingFeePerBuildUsd: 0,
    quantityBreakdown: {},
  };

  const extendedParts = new Set<string>();
  for (const row of rows) {
    switch (row.jlcTier) {
      case 'basic':
        summary.basicCount += 1;
        break;
      case 'preferred_extended':
        summary.preferredExtendedCount += 1;
        break;
      case 'extended':
        summary.extendedCount += 1;
        if (row.lcscPart) extendedParts.add(row.lcscPart);
        break;
      case 'not_found':
        summary.notFoundCount += 1;
        break;
      default:
        summary.unknownCount += 1;
        break;
    }
  }

  summary.uniqueExtendedParts = extendedParts.size;
  summary.loadingFeePerBuildUsd = summary.uniqueExtendedParts * EXTENDED_LOADING_FEE_USD;
  for (const quantity of quantities) {
    summary.quantityBreakdown[quantity] = summary.loadingFeePerBuildUsd * quantity;
  }
  return summary;
}
