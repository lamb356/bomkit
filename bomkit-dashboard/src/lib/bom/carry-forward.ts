export interface CarryForwardSource {
  designators: string[];
  value: string;
  lockedChoice?: unknown;
}

export interface CarryForwardTarget {
  designators: string[];
  value: string;
  lockedChoice?: unknown;
}

function key(row: { designators: string[]; value: string }): string {
  return `${row.designators.join(',')}|${row.value}`;
}

export function carryForwardLockedChoices<T extends CarryForwardTarget, U extends CarryForwardSource>(nextRows: T[], previousRows: U[]): T[] {
  const previousMap = new Map(previousRows.map((row) => [key(row), row.lockedChoice]));
  return nextRows.map((row) => ({
    ...row,
    lockedChoice: row.lockedChoice ?? previousMap.get(key(row)) ?? null,
  }));
}
