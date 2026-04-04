export interface DiffRow<TBefore = Record<string, unknown>, TAfter = Record<string, unknown>> {
  key: string;
  kind: 'added' | 'removed' | 'changed';
  before?: TBefore;
  after?: TAfter;
}

export interface DiffableRow {
  designators: string[];
  value: string;
  footprint: string;
  mpn?: string | null;
  lcscPart?: string | null;
  status?: string | null;
}

function identityKey(row: { designators: string[] }): string {
  return [...row.designators].sort().join(',');
}

function hasMaterialChange(before: DiffableRow, after: DiffableRow): boolean {
  return before.value !== after.value
    || before.footprint !== after.footprint
    || (before.mpn ?? null) !== (after.mpn ?? null)
    || (before.lcscPart ?? null) !== (after.lcscPart ?? null)
    || (before.status ?? null) !== (after.status ?? null);
}

export function diffRows<T extends DiffableRow>(beforeRows: T[], afterRows: T[]): DiffRow<T, T>[] {
  const beforeMap = new Map(beforeRows.map((row) => [identityKey(row), row]));
  const afterMap = new Map(afterRows.map((row) => [identityKey(row), row]));
  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const diffs: DiffRow<T, T>[] = [];

  for (const key of keys) {
    const before = beforeMap.get(key);
    const after = afterMap.get(key);

    if (before && !after) {
      diffs.push({ key, kind: 'removed', before });
      continue;
    }

    if (!before && after) {
      diffs.push({ key, kind: 'added', after });
      continue;
    }

    if (before && after && hasMaterialChange(before, after)) {
      diffs.push({ key, kind: 'changed', before, after });
    }
  }

  return diffs;
}
